import { run } from '../agent/runner.js';
import { log, logError } from '../lib/logger.js';

export async function agentHandler(req, res) {
  const { message } = req.body || {};

  if (!message || typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ ok: false, error: 'Missing required field: message' });
  }

  const start = Date.now();
  log('agent', { msg: 'Agent execution start', messageLength: message.length });

  try {
    const { output } = await run(message.trim());
    const elapsed = Date.now() - start;
    log('agent', { msg: 'Agent execution complete', elapsedMs: elapsed });

    return res.status(200).json({ ok: true, input: message.trim(), output });
  } catch (err) {
    const elapsed = Date.now() - start;

    if (err.code === 'TIMEOUT') {
      logError('agent', { msg: 'Upstream timeout', elapsedMs: elapsed });
      return res.status(504).json({ ok: false, error: 'Upstream timeout' });
    }

    logError('agent', { msg: 'Agent execution failed', error: err.message, elapsedMs: elapsed });
    return res.status(500).json({ ok: false, error: 'Agent execution failed' });
  }
}
