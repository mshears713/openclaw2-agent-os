/**
 * Server entry point. Startup sequence:
 * 1. Config loaded (exits on missing required vars)
 * 2. Express app created with JSON middleware
 * 3. Request logging middleware
 * 4. Routes wired
 * 5. OpenClaw initialized (degraded state on failure — does NOT exit)
 * 6. Port bound
 */

import 'dotenv/config';
import express from 'express';
import config from '../config/index.js';
import { log, logError } from '../lib/logger.js';
import { requireAuth } from '../lib/auth.js';
import { initOpenClaw } from '../agent/openclaw.js';
import { healthHandler } from '../routes/health.js';
import { agentHandler } from '../routes/agent.js';

const app = express();

app.use(express.json());

// Request logging (no auth headers)
app.use((req, _res, next) => {
  log('request', { method: req.method, path: req.path });
  next();
});

// Routes
app.get('/health', healthHandler);
app.post('/agent', requireAuth, agentHandler);

// Catch-all 404
app.use((_req, res) => {
  res.status(404).json({ ok: false, error: 'Not found' });
});

// Global error handler — never crash on unexpected exceptions
app.use((err, _req, res, _next) => {
  logError('error', { msg: 'Unhandled error', error: err.message });
  res.status(500).json({ ok: false, error: 'Internal server error' });
});

// Startup
log('startup', { msg: 'Agent OS starting' });
log('startup', { msg: 'Environment', env: config.NODE_ENV });
log('startup', { msg: 'OpenRouter model', model: config.OPENROUTER_MODEL });

await initOpenClaw();

const server = app.listen(config.PORT, () => {
  log('startup', { msg: `Listening on port ${config.PORT}` });
});

server.on('error', (err) => {
  logError('startup', { msg: 'Server failed to start', error: err.message });
  process.exit(1);
});
