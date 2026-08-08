# ACS Standalone Control Plane

Local control plane UI for ACS and OpenClaw agents, built as a static
**Vite + React + TypeScript** application.

## Stack

- Vite (dev/build/preview)
- React 19
- React Router (client-side routes)
- TypeScript

## Scripts

| Command          | Purpose                                |
| ---------------- | -------------------------------------- |
| `pnpm dev`       | Start the Vite dev server              |
| `pnpm build`     | Build the static app into `dist/`      |
| `pnpm preview`   | Serve the production build locally     |
| `pnpm lint`      | ESLint (flat config)                   |
| `pnpm typecheck` | `tsc --noEmit`                         |
| `pnpm test`      | Node smoke tests for the build artifact|

## Routes

The app is a client-side SPA:

`/` (dashboard), `/agents`, `/agents/:agentId`, `/roles`, `/profiles`,
`/skills`, `/plugins`, `/memory`, `/runtime`, `/logs`, `/settings`.

## Deployment (Vercel)

- Framework preset: Vite
- Build command: `pnpm run build`
- Output directory: `dist`
- `vercel.json` rewrites unknown paths to `/index.html` so direct SPA routes
  (for example `/agents`) render the application instead of returning 404.

## Data layer

All screens currently render frontend-local mock data. Future ACS Core or
runtime connectivity belongs behind an HTTP/API contract; this app does not
depend on Cloudflare bindings or any server runtime.
