/**
 * Structured logging helpers. Outputs JSON lines for Render's log viewer.
 */

export function log(tag, data = {}) {
  console.log(JSON.stringify({ tag, ...data, ts: new Date().toISOString() }));
}

export function logError(tag, data = {}) {
  console.error(JSON.stringify({ tag, level: 'error', ...data, ts: new Date().toISOString() }));
}
