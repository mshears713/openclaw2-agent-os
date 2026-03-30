/**
 * Bearer token middleware. Protects routes with a shared secret.
 * Never logs the submitted secret value.
 */

import config from '../config/index.js';
import { logError } from './logger.js';

export function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token || token !== config.APP_SHARED_SECRET) {
    logError('auth', { msg: 'Unauthorized request', path: req.path, hasHeader: !!header });
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  next();
}
