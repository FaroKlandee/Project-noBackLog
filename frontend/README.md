# NoBacklog — Frontend

React 19 + Vite single-page app for the NoBacklog Kanban board. See the
[root README](../README.md) for the full project overview, API reference and
roadmap.

## Requirements

- Node.js 22.12+ (CI uses Node 24)
- pnpm 9 — the exact version is pinned in `package.json` (`packageManager`).
  `npm install` is blocked by a `preinstall` check.
- The backend running on `http://localhost:5000` (see `../backend-dotnet`)

## Scripts

```bash
pnpm install         # install dependencies (applies patches/ to @dnd-kit/dom)
pnpm dev             # dev server on http://localhost:5173
pnpm build           # production build into dist/
pnpm preview         # serve the production build
pnpm lint            # Biome format + lint check (same as CI)
pnpm format          # apply Biome formatting
pnpm test            # Vitest, run once
pnpm test:watch      # Vitest in watch mode
pnpm test:coverage   # coverage report (text + coverage/index.html)
```

## Layout

```
src/
├── app/        # main.jsx, routes.jsx, theme.js
├── pages/      # BoardsPage, BoardDetailPage
├── features/   # boards, lists, cards, timeLogs — each with api/, components/, hooks/ and an index.js barrel
├── shared/     # api.js (fetch client) and shared components (FieldLabel, LoadError)
└── test/       # Vitest setup, MSW server, apiUrl + renderWithTheme helpers
```

## Stack

MUI 6 for components, React Router 7 for routing, `@dnd-kit` 0.4 for
drag-and-drop, Biome for lint/format, and Vitest + MSW + React Testing Library
for tests. Tests sit next to the code they cover and need no backend — MSW
stands in for the API.

`.gitattributes` forces LF line endings here so `pnpm lint` behaves the same on
Windows as in CI.
