/**
 * Thin message-in / response-out wrapper.
 * Route handlers call this; it calls the OpenClaw layer.
 * No HTTP concerns here.
 */

import { runAgent } from './openclaw.js';

/**
 * @param {string} message
 * @returns {Promise<{ output: string }>}
 */
export async function run(message) {
  const output = await runAgent(message);
  return { output };
}
