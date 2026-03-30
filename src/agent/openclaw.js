/**
 * OpenClaw integration layer.
 *
 * RESEARCH FINDINGS (Section 0.1):
 * - Package: openclaw (v2026.3.28), Node >=22
 * - OpenClaw is a daemon/gateway framework. It is NOT a simple embeddable library.
 * - Architecture: "The Node service runs OpenClaw as its primary runtime process."
 * - Integration pattern: spawn `openclaw agent --local --message "..."` as a child
 *   process per request. `--local` runs the agent in embedded mode without a
 *   running Gateway daemon.
 * - OpenRouter: supported natively. Set OPENROUTER_API_KEY in process env;
 *   OpenClaw reads it automatically (highest precedence: process environment).
 * - OPENCLAW_HOME: overrides ~/.openclaw/ for all internal paths (used here so
 *   the service is fully self-contained within the repo directory). The workspace
 *   defaults to $OPENCLAW_HOME/workspace — no config file needed for this.
 * - No openclaw.json is written: env vars alone are sufficient. The schema
 *   is strict and version-sensitive; omitting the config avoids breakage.
 *
 * OPENROUTER RESEARCH FINDINGS (Section 0.2):
 * - Endpoint: POST https://openrouter.ai/api/v1/chat/completions
 * - Auth: Authorization: Bearer <OPENROUTER_API_KEY>
 * - Model string: openrouter/auto is valid for automatic routing
 * - HTTP-Referer header: recommended for attribution
 * - Format: OpenAI-compatible
 */

import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import config from '../config/index.js';
import { log, logError } from '../lib/logger.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OPENCLAW_HOME = path.resolve(__dirname, '../../openclaw-data');
const WORKSPACE_DIR = path.join(OPENCLAW_HOME, 'workspace');

// Use openclaw from system PATH (global install) or node_modules/.bin (local install).
// On Windows, Node requires the .cmd shim when shell:false.
const OPENCLAW_BIN = process.platform === 'win32' ? 'openclaw.cmd' : 'openclaw';

let initialized = false;

/**
 * Initialize OpenClaw at startup. Creates workspace directory and seeds AGENTS.md.
 * No openclaw.json is written — env vars handle provider auth and OPENCLAW_HOME
 * controls all internal paths. On failure: logs and sets degraded state, does NOT crash.
 */
export async function initOpenClaw() {
  try {
    log('startup', { msg: 'OpenClaw: initializing...' });

    // Ensure workspace directory exists (OpenClaw defaults to $OPENCLAW_HOME/workspace)
    await mkdir(WORKSPACE_DIR, { recursive: true });

    // Seed AGENTS.md so OpenClaw has a valid workspace on first run
    const agentsMd = path.join(WORKSPACE_DIR, 'AGENTS.md');
    if (!existsSync(agentsMd)) {
      await writeFile(agentsMd, '# Agent OS\nYou are a helpful assistant.\n');
    }

    initialized = true;
    log('startup', { msg: 'OpenClaw: ready' });
  } catch (err) {
    initialized = false;
    logError('startup', { msg: 'OpenClaw: initialization failed', error: err.message });
    // Do NOT rethrow — server must still bind and serve /health with degraded status
  }
}

/**
 * Returns true if OpenClaw initialized successfully.
 */
export function isReady() {
  return initialized;
}

/**
 * Run one agent turn through OpenClaw's embedded (--local) mode.
 * Applies a 30-second timeout. Throws tagged errors on failure.
 *
 * @param {string} message - The user message
 * @returns {Promise<string>} - The agent's text response
 */
export async function runAgent(message) {
  return new Promise((resolve, reject) => {
    const env = {
      ...process.env,
      OPENCLAW_HOME,
      OPENROUTER_API_KEY: config.OPENROUTER_API_KEY,
      NO_COLOR: '1',
    };

    const child = spawn(
      OPENCLAW_BIN,
      ['agent', '--local', '--agent', 'main', '--message', message],
      { env, stdio: ['ignore', 'pipe', 'pipe'] }
    );

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
    child.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      child.kill('SIGTERM');
      const err = new Error('OpenClaw agent timed out after 30s');
      err.code = 'TIMEOUT';
      reject(err);
    }, 30_000);

    child.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0) {
        const output = stdout.trim();
        if (!output) {
          const err = new Error('OpenClaw returned empty output');
          err.code = 'UPSTREAM_ERROR';
          return reject(err);
        }
        resolve(output);
      } else {
        logError('agent', { msg: 'OpenClaw exited with non-zero code', code, stderr: stderr.slice(0, 500) });
        const err = new Error(`OpenClaw exited with code ${code}`);
        err.code = 'UPSTREAM_ERROR';
        reject(err);
      }
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      logError('agent', { msg: 'OpenClaw spawn error', error: err.message });
      err.code = 'UPSTREAM_ERROR';
      reject(err);
    });
  });
}
