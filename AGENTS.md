# AGENTS.md

## Cursor Cloud specific instructions

This is a **Reddit Devvit application** (KeyModerator/KeyQueue) — a keyboard-driven mod queue interface for subreddit moderators. It uses Vite + React 18 for the client and Hono for the server, deployed via the Devvit platform.

### Running locally

- `npm run dev` starts the Vite dev server on port 5173 with a fully self-contained mock API (no external services needed).
- The mock API is defined in `vite.config.ts` via `localApiPlugin()` and provides demo data for all endpoints (queue, settings, user info, flairs, automod, mod-log, notifications, and all moderation actions).
- The dev server binds to `0.0.0.0` so it's accessible from any interface.

### Key commands

| Task | Command |
|------|---------|
| Install deps | `npm install` |
| Dev server | `npm run dev` |
| Type check | `npx tsc --noEmit` |
| Production build | `npm run build` |

### Architecture notes

- `src/client/` — React SPA (Vite root is `src/client`)
- `src/server/` — Hono HTTP server for Devvit runtime
- `src/shared.ts`, `src/settings.ts` — Shared types/logic
- `vite.config.ts` — Local dev config (includes mock API plugin)
- `vite.devvit.config.ts` — Production Devvit build config
- `vite.server.config.ts` — Server build config

### Gotchas

- There is no ESLint or Prettier configured in this repo; type checking (`tsc --noEmit`) is the only lint-like check available.
- No automated test framework is configured (no Jest, Vitest, etc.). Validation is done via type checking and manual testing.
- The project requires Node.js v22+ (uses ES2022 target and ESM modules).
- The mock API state resets on Vite server restart (it's in-memory).
