/**
 * Centralized environment variable loading and fail-fast validation.
 * Missing required vars will log clearly and exit(1) before the server binds.
 */

const REQUIRED = ['OPENROUTER_API_KEY', 'APP_SHARED_SECRET'];

for (const key of REQUIRED) {
  if (!process.env[key]) {
    console.error(`[config] Missing required environment variable: ${key}`);
    process.exit(1);
  }
}

const config = Object.freeze({
  PORT: process.env.PORT || '3000',
  NODE_ENV: process.env.NODE_ENV || 'development',
  OPENROUTER_API_KEY: process.env.OPENROUTER_API_KEY,
  OPENROUTER_MODEL: process.env.OPENROUTER_MODEL || 'openrouter/auto',
  APP_SHARED_SECRET: process.env.APP_SHARED_SECRET,
});

export default config;
