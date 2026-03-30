# Agent OS

**Phase 1** — Single Render web service. HTTP → OpenClaw → OpenRouter → response.

## What this is

A minimal personal agent backend. One Render service receives authenticated HTTP requests, routes them through OpenClaw's embedded agent runtime, and calls OpenRouter for model access.

## Current phase

Phase 1: core request/response loop only. No WhatsApp, no tools, no cost tracking.

---

## Environment variables

Set these in your Render dashboard before deploying.

| Variable | Required | Description |
|---|---|---|
| `OPENROUTER_API_KEY` | **Yes** | OpenRouter API key |
| `APP_SHARED_SECRET` | **Yes** | Shared secret for `Authorization: Bearer` header |
| `OPENROUTER_MODEL` | No | Model string (default: `openrouter/auto`) |
| `NODE_ENV` | Recommended | Set to `production` on Render |
| `PORT` | Auto | Injected by Render — do not set manually |

---

## Render configuration

| Setting | Value |
|---|---|
| **Runtime** | Node |
| **Node version** | 22 |
| **Build command** | `npm install` |
| **Start command** | `npm start` |
| **Tier** | Starter ($7/month) |

> Note: OpenClaw is a full gateway runtime. Monitor memory usage on first deploy — Render Starter has 512MB RAM.

---

## Routes

### `GET /health`

No auth required. Returns service and OpenClaw status.

```json
{ "ok": true, "status": "healthy", "timestamp": "..." }
```

Returns `503` if OpenClaw failed to initialize:
```json
{ "ok": false, "status": "degraded", "error": "OpenClaw not initialized" }
```

### `POST /agent`

Requires `Authorization: Bearer <APP_SHARED_SECRET>`.

**Request:**
```json
{ "message": "Help me think through this idea" }
```

**Response:**
```json
{ "ok": true, "input": "...", "output": "..." }
```

---

## Post-deploy smoke test

After deploying, run:

```bash
SMOKE_URL=https://your-service.onrender.com APP_SHARED_SECRET=yoursecret node scripts/smoke-test.js
```

Exits `0` if all checks pass, `1` if any fail.

---

## What's not implemented yet

- WhatsApp integration (Phase 2)
- Tool calling (Phase 3)
- Cost/token tracking (Phase 4)
