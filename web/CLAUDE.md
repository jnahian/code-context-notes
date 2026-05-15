# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Scope

This is the `web/` subproject — the marketing site, docs, and changelog page for the Code Context Notes VS Code extension. The extension source itself lives in the parent repo at `/Users/nahian/Projects/code-notes/src`. Repo-wide rules (user stories, changelog policy, release process) are in the parent `CLAUDE.md`.

## Commands

All commands run from `web/`.

- `npm run dev` — Vite client-only dev server (fastest for UI work).
- `npm run dev:ssr` — Express + Vite middleware server (`server-dev.js`); use when changing SSR behavior.
- `npm run build` — Builds both client (`dist/client`) and server (`dist/server`) bundles. `build:client` and `build:server` can be run individually.
- `npm run build:vercel` — Production build + post-build copy that stages `server/` and root `index.html` for the Vercel handler.
- `npm run preview:ssr` — Build then serve via `server.js` to test the production SSR path locally.
- `npm run lint` — ESLint with `--max-warnings 0`; CI-equivalent.

There is no test runner configured in this subproject. Lint and a successful production build are the verification gates.

## Architecture

**SSR with three runtimes.** The same React app is served three different ways and any routing/data change must work in all three:

1. **Vite dev** (`npm run dev`) — CSR only, hydrates from `index.html`'s empty `<!--ssr-outlet-->`.
2. **Express SSR dev/prod** (`server-dev.js`, `server.js`) — Loads `src/entry-server.tsx` via Vite middleware (dev) or the built `dist/server/entry-server.js` (prod), renders to string, injects into the template at `<!--ssr-outlet-->`.
3. **Vercel serverless** (`api/index.js`) — Same render contract as Express, but as a single handler. `vercel.json` rewrites every path to `/api`, so the function must handle all routes. Falls back to CSR if SSR import fails. `build:vercel` copies `dist/server/*` to `server/` and `dist/client/index.html` to the repo root so the function can resolve them.

**Entry points.**
- `src/entry-client.tsx` — hydrateRoot, wraps `<App>` in `BrowserRouter`.
- `src/entry-server.tsx` — exports `render(url)` that returns `{ html }`, wraps `<App>` in `StaticRouter`.
- Routes are defined in `src/App.tsx`: `/`, `/docs`, `/changelog`.

When adding a route, update `App.tsx` and verify it renders under SSR (visible in initial HTML, not just after hydration).

## Changelog page

The changelog timeline at `src/pages/ChangelogPage.tsx` is hand-maintained JSX, not generated. The full procedure for adding a version (where to insert, which badge to move, color choices) is in `web/CHANGELOG_WEB_GUIDE.md` — follow it rather than improvising. The markdown changelog in `../docs/changelogs/` is the source of truth and must be created first per the parent `CLAUDE.md`.

There is also an `add-web-changelog` skill that automates this; prefer it when adding a version.

## UI conventions

- shadcn/ui components live in `src/components/ui/` — extend rather than replace.
- Tailwind with `tailwindcss-animate`; brand tokens like `bg-brand-orange` are defined in `tailwind.config.js`.
- Page-specific composition components are grouped under `src/components/landing/` and `src/components/docs/`.
