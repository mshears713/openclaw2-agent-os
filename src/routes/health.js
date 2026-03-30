import { isReady } from '../agent/openclaw.js';

export function healthHandler(req, res) {
  if (isReady()) {
    return res.status(200).json({
      ok: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
    });
  }

  return res.status(503).json({
    ok: false,
    status: 'degraded',
    error: 'OpenClaw not initialized',
  });
}
