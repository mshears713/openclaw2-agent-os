# PRD for Claude Code
## Agent OS Prototype — Single-Service Render Deployment with OpenClaw + OpenRouter

**Status:** Rewrite after project reset — v2 (senior dev reviewed)
**Owner:** User-directed prototype build
**Primary coding agent:** Claude Code (web)
**Document purpose:** This PRD is written to guide Claude Code in implementing the repository directly, in strict phases, for first-deploy success on Render.

---

## 0. MANDATORY PRE-CODING RESEARCH STEP

**Claude Code must complete this step before writing any code, creating any files, or making any implementation decisions.**

This project depends on two external systems whose APIs, package names, and integration patterns must be verified from live documentation before implementation. Do not rely on training data for either of these.

### 0.1 OpenClaw research (required)

OpenClaw is a newer library and may not be well-represented in your training data. Before touching the codebase:

1. Web search: `OpenClaw npm agent framework`
2. Web search: `OpenClaw Node.js integration site:github.com`
3. Locate the official npm package name, current version, and install command.
4. Determine: does OpenClaw run in-process (library call), or does it require a separate process/daemon?
5. Determine: what does OpenClaw initialization look like in Node? Is there a workspace config? A client object? A factory function?
6. Determine: how does OpenClaw accept a user message and return a response?
7. Determine: what environment variables or config files does OpenClaw require?
8. Write a brief summary of your findings as a comment block at the top of `src/agent/openclaw.js` before implementing anything else.

If you cannot find OpenClaw via search and cannot verify it as a real package, **stop and report this to the user before proceeding**. Do not invent an OpenClaw integration.

### 0.2 OpenRouter research (required)

1. Fetch: `https://openrouter.ai/docs` — specifically the chat completions endpoint and authentication model.
2. Confirm: the exact request format for calling `openrouter/auto` as the model string.
3. Confirm: the correct base URL for API calls.
4. Confirm: whether `openrouter/auto` is a valid model identifier or whether another string should be used for automatic routing.
5. Note any relevant rate limit or header requirements (OpenRouter requires an `HTTP-Referer` header for some use cases — confirm whether this applies here).

### 0.3 Research gate

Do not proceed to implementation until both research steps are complete and documented. The findings from this step should visibly influence the implementation — especially the OpenClaw integration shape.

---

## 1. Product Intent

Build a minimal **Agent OS prototype** that starts as a single deployed web service and grows in controlled stages.

The purpose of this prototype is **not** to build a broad automation platform, a multi-service backend, or a production-ready agent stack. The purpose is to create a clean foundation for a personal agent system that can eventually be used through WhatsApp, starting with the smallest deployable core.

The first success condition is simple:

> A single Render service receives an HTTP request, passes it through OpenClaw, uses OpenRouter for model access, and returns a response without relying on any second service.

Everything else is deferred until that foundation exists.

---

## 2. Reset Context

A prior attempt failed because the project introduced too many moving parts too early.

Previously attempted architecture included:
- Vercel
- WhatsApp integration from the start
- OpenClaw in a conflicting runtime model
- tunneling / webhook complexity
- premature cost tracking and tool planning

That approach created infrastructure confusion and blurred phase boundaries.

This rewrite replaces that with one rule:

> **One service first. One runtime first. One stable loop first.**

This PRD must therefore optimize for:
- first-deploy success,
- strict scope control,
- minimal moving parts,
- explicit runtime behavior,
- compatibility with Render,
- compatibility with Claude Code writing the repo in one pass before deployment.

---

## 3. Non-Negotiable Project Constraints

The implementation must follow all of the constraints below.

### 3.1 Deployment model
- Use **Render only** for the deployed application.
- Use a **single web service** on Render's **Starter tier** ($7/month). This is not a free tier deployment — the service stays alive, does not spin down on inactivity, and does not have cold start concerns.
- Do **not** introduce Vercel.
- Do **not** introduce a separate agent runtime service.
- Do **not** introduce a second deployment target.
- Do **not** introduce tunneling, ngrok, or any temporary webhook bridge.

### 3.2 Runtime model
- OpenClaw must run **inside the same deployed service environment**.
- OpenRouter is the **only external AI/model dependency**.
- The system should be implemented in **Node**.
- The system must bind correctly for Render as a web service.
- Node version must be pinned to **>=20** via the `engines` field in `package.json`.

### 3.3 Development workflow
- The repository will be written first.
- It will be pushed to GitHub.
- It will then be deployed to Render.
- There will be **no local testing loop** prior to deploy.
- Design decisions must therefore reduce reliance on local debugging and assume deployment is the first real execution environment.
- A post-deploy smoke test script must be included (see Section 9.6).

### 3.4 Phasing discipline
- The build must happen in **strict phases**.
- Phase 1 is the minimal core loop only.
- No later-phase functionality should be pulled earlier "because it is easy."

---

## 4. Product Goal

The broader long-term goal is a personal command interface to an agent system.

In the future, the user should be able to send a request from a phone, have the system reason through it, optionally call tools, and return useful results.

That is **not** the immediate goal.

The immediate goal is:

> Establish a deployable, stable, single-service Agent OS base that proves the agent request/response path under the correct architecture.

---

## 5. Phase Plan

## Phase 1 — Core Deployable Loop

### Goal
Create a minimal Render-hosted web service that:
1. starts correctly,
2. exposes a health route,
3. exposes a protected agent route,
4. passes a user message into the agent path,
5. uses OpenRouter through OpenClaw,
6. returns a response,
7. logs basic execution details.

### Required Phase 1 flow

```text
POST /agent -> app server -> OpenClaw -> OpenRouter -> response JSON
```

### Phase 1 must include
- Node web service
- clear startup behavior
- Render-compatible port binding
- health endpoint (`GET /health`)
- protected agent endpoint (`POST /agent`)
- basic request validation
- OpenClaw integration in the deployed runtime
- OpenRouter configuration via environment variables
- structured logging
- safe error responses
- 30-second timeout on all OpenRouter calls
- post-deploy smoke test script (`scripts/smoke-test.js`)

### Phase 1 must NOT include
- WhatsApp
- Twilio
- voice input
- Whisper
- tool calling for user workflows
- cost tracking in responses
- multi-model routing logic beyond configured OpenRouter model
- persistence/database
- queues/background workers
- cron/scheduled jobs
- multi-service communication
- frontend UI

---

## Phase 2 — Input Layer

### Goal
Add WhatsApp as the real user-facing input/output surface.

### Phase 2 includes
- WhatsApp webhook integration
- inbound message handling
- outbound reply path
- reuse of the Phase 1 agent execution path

### Phase 2 excludes
- voice note transcription
- advanced tools
- cost reporting UI

---

## Phase 3 — First Tool

### Goal
Add one useful tool for a real workflow.

### First tool
`clarify_and_research`

### Tool purpose
Convert a rough idea into a more structured implementation direction, including clarification, tradeoffs, missing assumptions, and PRD-like output.

### Web search dependency
This tool requires real-time web search. The designated search provider is **Tavily**.

- Add `TAVILY_API_KEY` to the environment variable contract at this phase.
- Use the Tavily search API to support research sub-tasks within the tool.
- Keep Tavily usage isolated to this tool — do not build a generic search abstraction in Phase 1 or 2.

This phase should only begin after Phase 2 is working.

---

## Phase 4 — Cost Tracking

### Goal
Add cost visibility after the system is already usable.

### Phase 4 includes
- token usage capture if available,
- model capture,
- rough cost estimation,
- appending a concise cost summary to the output.

This is intentionally late because it is valuable but non-foundational.

---

## 6. In-Scope vs Out-of-Scope

## In Scope for this PRD
This PRD should drive implementation of:
- repository structure,
- Phase 1 architecture,
- Phase 1 API contracts,
- environment variable contract,
- deploy-safe startup behavior,
- integration assumptions that avoid breaking first deployment,
- clear placeholders for later phases.

## Out of Scope for initial implementation
- broad autonomy
- multi-agent orchestration
- dashboards
- databases
- user accounts
- analytics platform integration
- long-running job systems
- production hardening beyond basic safe practices
- local development optimization
- full observability stack
- fancy configuration framework
- prompt experimentation framework
- advanced security/auth systems beyond simple shared-secret protection

---

## 7. Primary Design Principles for Claude Code

Claude Code should follow these principles while implementing.

### 7.1 First-deploy success over ideal architecture
The code should prioritize actually booting and running on Render over elegant abstractions.

### 7.2 Minimize moving parts
Use the smallest number of files, runtime assumptions, and dependencies that still produce a clear codebase.

### 7.3 Be explicit, not clever
Avoid hidden magic. Startup path, environment requirements, request handling, and agent execution flow should be obvious from the repo.

### 7.4 Build seams for later phases without implementing them yet
The code should be organized so WhatsApp, tools, and cost tracking can be added later, but should not implement them now.

### 7.5 Treat OpenClaw as real runtime infrastructure
Do not fake the agent layer. Use real OpenClaw integration based on what the pre-coding research step reveals. Do not assume it behaves like a trivial utility function if it clearly needs runtime/workspace configuration.

### 7.6 Favor recoverable failure
Bad inputs, missing env vars, and upstream failures should produce useful logs and non-crashing responses.

### 7.7 Research before you build
If you are uncertain about how a dependency works, search for current documentation before guessing. This applies especially to OpenClaw and OpenRouter. Incorrect integration is worse than a build that takes longer.

---

## 8. Technical Direction

## 8.1 Backend stack
Use **Node >= 20**.

A lightweight HTTP server framework is acceptable if it keeps the service clear and Render-friendly. The implementation should favor whichever option gives the simplest predictable deployment and request handling.

Recommended preference order:
1. a small, well-understood Node web server stack (Express is fine),
2. minimal middleware,
3. no heavy framework unless required by OpenClaw integration.

Pin the Node version in `package.json`:
```json
"engines": { "node": ">=20" }
```

## 8.2 OpenClaw integration approach
The implementation must use real OpenClaw based on what is found in the pre-coding research step (Section 0).

The coding agent should:
- install OpenClaw using the verified npm package name and install command,
- configure it in a way compatible with a deployed single-service environment,
- keep its configuration inside the same repo/runtime,
- ensure the app can call into the agent path from the HTTP route,
- initialize OpenClaw at startup (not per-request) so it is ready before the first request arrives,
- ensure the health check only returns `ok: true` after OpenClaw has initialized successfully.

If OpenClaw requires workspace/config artifacts, those should be organized clearly in the repository under `/openclaw`.

The coding agent must not silently replace OpenClaw with a homemade substitute.

## 8.3 Model access
Use **OpenRouter only**.

Configuration:
- The model string must be stored in the environment variable `OPENROUTER_MODEL`.
- Default value: `openrouter/auto` (verify this is the correct string during research step 0.2).
- No custom multi-model decision engine in Phase 1.
- All OpenRouter calls must have a **30-second timeout**. A hung upstream call must not hang the server indefinitely.
- If OpenRouter returns an error, log it with the status code and message, and return a structured error response to the caller.

This is a configuration choice, not an excuse to add routing abstractions.

## 8.4 Security model
Use a **simple shared-secret protection mechanism** for protected routes.

Implementation:
- Protected routes require the header: `Authorization: Bearer <secret>`
- The expected secret is stored in `APP_SHARED_SECRET` environment variable.
- One middleware function handles verification.
- If the header is missing or the secret does not match, return HTTP 401 with `{ "ok": false, "error": "Unauthorized" }`.
- Log auth failures with enough context to identify the issue (but do not log the submitted secret value).

Do not introduce auth providers or user sessions.

The auth mechanism should be tested explicitly in the smoke test script.

---

## 9. Phase 1 Functional Requirements

## 9.1 HTTP endpoints
Phase 1 should include exactly these endpoints:

### `GET /health`
Purpose:
- confirm the service is running,
- confirm OpenClaw has initialized,
- provide a simple health check target for Render deployment verification.

Expected behavior:
- return HTTP 200 when the service is alive and OpenClaw is ready,
- return a small JSON payload including status and timestamp.

```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

If OpenClaw failed to initialize, return HTTP 503:
```json
{
  "ok": false,
  "status": "degraded",
  "error": "OpenClaw not initialized"
}
```

### `POST /agent`
Purpose:
- exercise the minimal agent loop.

Expected behavior:
- require authentication via `Authorization: Bearer <secret>`,
- accept a small JSON payload,
- validate input,
- execute the agent path through OpenClaw → OpenRouter,
- return a JSON response.

Request shape:
```json
{
  "message": "Help me think through this idea"
}
```

Response shape:
```json
{
  "ok": true,
  "input": "Help me think through this idea",
  "output": "...agent response..."
}
```

Note on route naming: this route was previously called `/test` in earlier versions of the PRD. It is now `/agent` to reflect its permanent purpose and avoid a rename when Phase 2 is added.

## 9.2 Input validation
The `/agent` endpoint should:
- reject missing request bodies with HTTP 400,
- reject missing or empty `message` with HTTP 400,
- reject clearly invalid types,
- return concise structured errors.

```json
{
  "ok": false,
  "error": "Missing required field: message"
}
```

## 9.3 Error handling
The service should handle at least these cases safely:
- missing required environment variables (fail fast at startup, not mid-request),
- invalid auth secret (return 401),
- OpenRouter auth/config failure (return 502 with logged detail),
- OpenRouter timeout after 30 seconds (return 504 with logged detail),
- OpenClaw initialization failure (log and mark service degraded),
- OpenClaw execution failure (return 500 with logged detail),
- malformed request payload (return 400),
- unexpected internal exceptions (return 500, never crash the server).

The app must not crash due to a bad request or upstream failure.

## 9.4 Logging
Phase 1 should include basic structured logging for:
- server startup (port, environment, OpenClaw init status),
- environment readiness check results,
- each incoming request (method, path, timestamp — not auth headers),
- auth failure (without logging the submitted secret),
- agent execution start and end (with elapsed time),
- upstream failure (with status code and error message),
- response completion.

Logs should be useful enough to debug deployment issues from Render's log viewer.

Do not overbuild observability. Plain `console.log` with structured JSON objects is sufficient.

## 9.5 Startup behavior
Because there will be no local test cycle, startup behavior must be explicit and loud.

The app should:
- check for all required environment variables at startup before binding the port,
- if any required variable is missing: log clearly which one is missing and exit with a non-zero code,
- initialize OpenClaw before accepting traffic,
- log a clear startup summary when ready: port, environment, model config, OpenClaw status,
- start listening in the standard Render-compatible way: `process.env.PORT || 3000`.

Startup log example:
```
[startup] Agent OS starting
[startup] Environment: production
[startup] Port: 10000
[startup] OpenRouter model: openrouter/auto
[startup] OpenClaw: initializing...
[startup] OpenClaw: ready
[startup] Listening on port 10000
```

## 9.6 Post-deploy smoke test script

**This is a required deliverable**, not optional.

Create `scripts/smoke-test.js` — a standalone Node script that:
1. Accepts the deployed service URL as a command-line argument or `SMOKE_URL` env var.
2. Runs the following checks in sequence:
   - `GET /health` — assert HTTP 200, assert `ok: true`
   - `POST /agent` with no auth header — assert HTTP 401
   - `POST /agent` with wrong secret — assert HTTP 401
   - `POST /agent` with correct secret, empty body — assert HTTP 400
   - `POST /agent` with correct secret, valid message — assert HTTP 200, assert `ok: true`, assert `output` is a non-empty string
3. Logs pass/fail for each check.
4. Exits with code 0 if all pass, code 1 if any fail.

Usage after deployment:
```bash
SMOKE_URL=https://your-service.onrender.com APP_SHARED_SECRET=yoursecret node scripts/smoke-test.js
```

This script is the primary post-deploy validation mechanism since there is no local test loop.

---

## 10. Runtime and Deployment Requirements

The implementation must be written with hosted execution in mind.

### 10.1 Port binding
The service must listen on `process.env.PORT` with a fallback to `3000`. Render injects `PORT` automatically — the service must not hardcode a port.

### 10.2 Deterministic start command
`package.json` must include:
```json
"scripts": {
  "start": "node src/server.js"
}
```
The Render service start command should be `npm start`. This must be obvious from the README.

### 10.3 Environment-driven configuration
Anything deployment-sensitive must be configured through environment variables. No secrets or deployment-specific values in code.

### 10.4 Minimal boot assumptions
Do not assume local files, local daemons, or manually started side processes outside what Render will start with the web service.

### 10.5 No split runtime
Do not require:
- one process for API,
- another process for OpenClaw,
- a manually managed tunnel,
- a second machine,
- a second Render service.

The deployed architecture must remain conceptually:

```text
one Render web service (Starter tier)
  contains app server
  contains OpenClaw runtime integration (in-process or co-located)
  reaches OpenRouter externally (with 30s timeout)
```

### 10.6 Render Starter tier specifics
This deployment uses Render's $7/month Starter tier. This means:
- the service stays running continuously (no spin-down),
- 512MB RAM, shared CPU,
- if OpenClaw has significant memory overhead, this may become relevant — note it in the README if so.

---

## 11. Environment Variable Contract

All environment variables must be documented in `.env.example` at the repo root.

### Phase 1 required variables

| Variable | Required | Description |
|---|---|---|
| `PORT` | Provided by Render | HTTP port to bind |
| `NODE_ENV` | Recommended | Runtime environment (`production`) |
| `OPENROUTER_API_KEY` | **Required** | OpenRouter API key |
| `OPENROUTER_MODEL` | Optional | Model string. Default: `openrouter/auto` |
| `APP_SHARED_SECRET` | **Required** | Shared secret for `Authorization: Bearer` header |

### Phase 3 additional variables (noted here for future reference, not implemented now)

| Variable | Required in Phase 3 | Description |
|---|---|---|
| `TAVILY_API_KEY` | **Required** | Tavily search API key for `clarify_and_research` tool |

### Rules
- do not hardcode secrets,
- do not bury required env vars across many files — centralize config loading in `src/config/index.js`,
- fail fast at startup if required vars are missing,
- `.env.example` must include every variable with a comment describing it.

`.env.example` example:
```bash
# Provided automatically by Render
PORT=3000

# Set to 'production' on Render
NODE_ENV=development

# Required: Your OpenRouter API key
OPENROUTER_API_KEY=

# Optional: OpenRouter model string (default: openrouter/auto)
OPENROUTER_MODEL=openrouter/auto

# Required: Shared secret for protecting the /agent route
# Use a long random string. Set this in Render environment variables.
APP_SHARED_SECRET=
```

---

## 12. Repository Structure Guidance

Claude Code should create a small repository with a structure that is easy to understand.

Required shape:

```text
/src
  /config
    index.js          ← centralized env var loading and validation
  /server
    index.js          ← HTTP server setup and startup
  /routes
    health.js         ← GET /health handler
    agent.js          ← POST /agent handler
  /agent
    openclaw.js       ← OpenClaw integration (research findings documented here)
    runner.js         ← thin wrapper: accepts message, returns response
  /lib
    auth.js           ← shared-secret middleware
    logger.js         ← structured logging helpers
/openclaw
    (workspace/config files if required by OpenClaw — per research findings)
/scripts
    smoke-test.js     ← post-deploy validation script
README.md
.env.example
package.json
```

This structure satisfies:
- startup code easy to find (`src/server/index.js`),
- routes easy to find (`src/routes/`),
- agent integration isolated (`src/agent/`),
- configuration centralized (`src/config/index.js`),
- room to add later phases without rewriting everything.

---

## 13. OpenClaw Integration Expectations

This is one of the highest-risk parts of the project. The implementation must be grounded in what the pre-coding research step (Section 0) reveals.

Claude Code should:
1. Use the verified npm package name and installation method from the research step.
2. Keep the integration inside the single service.
3. Initialize OpenClaw once at startup, not per-request.
4. Document the initialization pattern and any config requirements at the top of `src/agent/openclaw.js`.
5. Handle initialization failure explicitly — if OpenClaw cannot start, the app should still bind and serve `/health` with a degraded status, so Render doesn't immediately restart it in a boot loop.
6. Keep the HTTP route and agent layer clearly separated — the route handler should call `runner.js`, which calls the OpenClaw layer. No OpenClaw code in route handlers.

If OpenClaw requires a gateway-like or workspace-driven setup, the implementation should still keep that setup internal to the same deployed service concept.

The important requirement is not "one file."
The important requirement is "one deployed service."

---

## 14. API Contract

The API should remain intentionally boring.

### `GET /health` — healthy

```json
{
  "ok": true,
  "status": "healthy",
  "timestamp": "2025-01-01T00:00:00.000Z"
}
```

### `GET /health` — degraded (OpenClaw not ready)

```json
{
  "ok": false,
  "status": "degraded",
  "error": "OpenClaw not initialized"
}
```

### `POST /agent` — request

```json
{
  "message": "Draft a rough plan for a personal research agent"
}
```

### `POST /agent` — success response

```json
{
  "ok": true,
  "input": "Draft a rough plan for a personal research agent",
  "output": "Here is a rough plan..."
}
```

### `POST /agent` — error responses

```json
{ "ok": false, "error": "Unauthorized" }
{ "ok": false, "error": "Missing required field: message" }
{ "ok": false, "error": "Agent execution failed" }
{ "ok": false, "error": "Upstream timeout" }
```

Do not return stack traces or internal error detail in responses. Log that detail server-side only.

---

## 15. What Claude Code Should Avoid

Claude Code should explicitly avoid the following failure modes.

### 15.1 Do not rebuild the old architecture
Do not reintroduce:
- Vercel,
- split agent runtime,
- serverless assumptions,
- tunnel-dependent webhooks,
- premature WhatsApp-first implementation.

### 15.2 Do not over-abstract Phase 1
Do not create:
- plugin systems,
- event buses,
- strategy registries,
- provider factories everywhere,
- enterprise config systems.

### 15.3 Do not implement future phases early
Do not sneak in:
- Twilio setup,
- voice note handling,
- cost estimation logic,
- tool calling framework,
- background scheduling,
- Tavily integration (Phase 3 only).

### 15.4 Do not hide deployment assumptions
Do not leave startup, env vars, or runtime dependencies vague.

### 15.5 Do not optimize for local development first
The user's workflow is write repo -> push GitHub -> deploy Render.
The implementation should support that workflow directly.

### 15.6 Do not guess at OpenClaw's API
If the research step does not produce clear answers about how to integrate OpenClaw, stop and surface that uncertainty. Do not invent a plausible-looking integration.

### 15.7 Do not let upstream calls hang
Every call to OpenRouter must be wrapped with a 30-second timeout. A hung call must reject, log, and return an error response. Never let a single upstream failure block the server.

---

## 16. Acceptance Criteria

## Phase 1 acceptance criteria
The implementation is successful when all of the following are true:

1. The repository is structured and understandable.
2. The app can be deployed as a single Render web service (Starter tier).
3. The service boots without requiring a second process or second service.
4. `GET /health` returns `ok: true` when OpenClaw is initialized.
5. `GET /health` returns `ok: false` and HTTP 503 if OpenClaw failed to initialize.
6. `POST /agent` without auth header returns HTTP 401.
7. `POST /agent` with wrong secret returns HTTP 401.
8. `POST /agent` with valid auth and missing `message` returns HTTP 400.
9. `POST /agent` with valid auth and valid message flows through the real OpenClaw path.
10. The model call uses OpenRouter with the configured model string.
11. A response is returned as JSON with `ok: true` and a non-empty `output`.
12. Failures are logged and surfaced cleanly without crashing the server.
13. The smoke test script exists and covers all the above cases.
14. Nothing from later phases is required for this phase to function.
15. Node version is pinned to >=20 in `package.json`.

---

## 17. Definition of Done for the Repo

Claude Code's work for the initial repo should be considered complete when it has produced:
- the runnable Node service,
- the minimal route layer (`/health`, `/agent`),
- the OpenClaw integration layer (using verified real integration),
- the OpenRouter configuration path (with timeout and env-var model config),
- shared-secret route protection via `Authorization: Bearer` header,
- startup validation and fail-fast behavior,
- structured logging,
- post-deploy smoke test script (`scripts/smoke-test.js`),
- `.env.example` with all required variables documented,
- concise README covering deployment setup.

The code should be ready for the user to:
1. push to GitHub,
2. connect Render (Starter tier),
3. set environment variables in Render dashboard,
4. deploy,
5. run `smoke-test.js` against the live URL to validate all critical paths.

---

## 18. README Expectations

The repo should include a concise README that covers:
- what the project is,
- current phase implemented,
- required environment variables (with types and descriptions),
- exact Render configuration: runtime (Node), start command (`npm start`), tier (Starter),
- available routes and their expected behavior,
- how to run the smoke test post-deploy,
- what is intentionally not implemented yet.

The README should be practical, not marketing-heavy. A developer (or future Claude Code session) should be able to read it and understand the full system state in under 2 minutes.

---

## 19. Future-Phase Notes

These notes exist only to preserve direction.
They are not instructions to implement now.

### Future Phase 2
- Connect WhatsApp webhook.
- Route inbound messages into the same `POST /agent` core execution path (or a parallel route that reuses `src/agent/runner.js`).

### Future Phase 3
- Add `clarify_and_research` as the first real tool.
- Uses Tavily for web search (API key: `TAVILY_API_KEY`).
- Integrate Tavily search into the tool's research sub-tasks.
- Do not build a generic search abstraction — keep Tavily usage scoped to this tool.

### Future Phase 4
- Add token/model/cost reporting from OpenRouter response metadata.
- Append concise cost summary to agent responses.

All future work should build on the same core request execution seam established in Phase 1: `src/agent/runner.js`.

---

## 20. Final Instruction to Claude Code

**Start with Section 0. Do not skip it.**

Research OpenClaw and OpenRouter before writing any code. Document your findings. Then build.

Build the smallest real version of this system that honors the architecture reset.

That means:
- Node >=20,
- one Render web service (Starter tier),
- OpenClaw inside the same deployed runtime (initialized at startup),
- OpenRouter as the only external AI dependency (30s timeout, env-var model config),
- a protected `/agent` route (Bearer token auth),
- a `/health` route (reflects OpenClaw init state),
- a smoke test script,
- no Vercel,
- no second service,
- no WhatsApp yet,
- no tools yet,
- no cost tracking yet.

Prefer a plain, durable, deployable implementation over an ambitious one.

The repository should be easy to read, easy to deploy, and hard to misunderstand.
