# NoBacklog MVP Development

AI-powered task management application with natural language command interface. A portfolio project demonstrating full-stack development expertise and QA-driven development practices.

**Developer:** Patiphak Klandee (Faro)  
**Technical Background:** ISTQB Certified | 3+ Years QA/Development Experience  
**Project Status:** Backend Complete (CRUD, Reordering, Timers + xUnit Service Tests) | Frontend Core Kanban Complete (Boards/Lists/Cards, Drag-and-Drop, Card Editing, Time Tracking) + Vitest Util/Hook/Component/Page Tests | Hardening Sprint Complete | Phase 2 Close-out Complete

---

## Project Overview

NoBacklog is a modern task management system that combines:
- **Trello-like Kanban Interface** - Visual board-based task organization
- **JIRA-style Time Tracking** - Detailed work log functionality
- **AI-Powered Commands** - Natural language task management (future phase)

**Strategic Differentiator:** Unlike conventional tools, NoBacklog will process natural language commands to create, update, and organize tasks intelligently.

---

## Development Milestones

### Phase 1: Backend API Development (COMPLETE)
**Status:** 27 endpoints operational across Board, List, Card, and TimeLog resources, including dedicated reorder endpoints for Lists and Cards and a card-rank rebalance endpoint.

**Achievement Summary:**
- Built a production-ready 4-tier hierarchical REST API on ASP.NET Core
- Implemented comprehensive validation patterns (field + reference)
- Designed a controller → service → EF Core data-access layering with PostgreSQL
- Added rank-based positioning for drag-and-drop reordering (Lists and Cards)
- Partial updates on `PUT /cards/:id` via a dedicated `CardUpdateRequest` DTO (omitted fields are left unchanged)
- Server-stamped Start/Finish timers with configurable per-card and global limits (`409 Conflict` on violation)
- Global `TrimmingStringConverter` trims whitespace from every inbound string before validation

**Completed APIs:**
1. **Board API** - Dashboard/workspace management (5 endpoints)
2. **List API** - Column/status management (5 endpoints + reorder)
3. **Card API** - Task/item management (5 endpoints + reposition + rebalance)
4. **TimeLog API** - Time tracking functionality (5 CRUD endpoints + start/finish/running/settings)

**Total Backend Deliverables:**
- 4 EF Core entity models with relationships (`Board`, `List`, `Card`, `TimeLog`)
- 4 ASP.NET controllers, each backed by an injected service class and interface
- EF Core migrations tracking schema evolution (including the card `Position` ranking column and nullable `TimeEstimate`)
- `.http` request file for manual endpoint testing
- xUnit test project (`backend-tests/`) covering all four services against an in-memory SQLite database

### Phase 2: Frontend Development (CURRENT)
**Framework:** React 19 (Vite)  
**Styling/Components:** MUI (Material UI)  
**Status:** Core Kanban experience is complete — board list, board detail, list and card CRUD, full drag-and-drop reordering (within and across columns), card editing, list renaming, and time tracking are implemented. The hardening sprint is complete: card rank rebalancing, per-feature loading/error states, and a Vitest suite covering the rank/duration utils and the data-owning hooks.

**Implemented so far:**
- Boards list and board detail pages (`react-router` routed)
- List columns: create, delete, inline click-to-edit rename, drag-and-drop reordering
- Cards: create (inline form with title + priority, keyboard shortcuts), delete, drag-and-drop reordering within a column and across columns
- Card detail dialog (`CardEditDialog`) with per-field saving for title, description, priority, and time estimate
- Rank-based position encoding (`generateRank`) so client-assigned positions sort correctly against the backend's plain string ordering
- `@dnd-kit` integration with a shared `DragDropProvider`, type-scoped sortables (`list` vs `card`), and a `DragOverlay` (dragged lists render a clone of their cards) to avoid DOM-relocation conflicts with React's reconciliation
- Time tracking inside the card detail dialog: Start/Finish timers (server-stamped), live elapsed counter, per-entry durations and a card total, capped entries per card and a global cap on simultaneously running timers
- Per-feature loading/error states: the board name, list columns and cards each load independently with skeleton placeholders, and a failed load shows what failed with its own Retry (`LoadError`) instead of blanking the page; add-card controls stay hidden until a column's cards have loaded
- Failed drag persistence rolls back: a list reorder or card move the server rejects is restored to its pre-drag position, with the error shown in the affected column
- Server error messages reach the UI: `api.js` throws the backend envelope's `message` (e.g. which time-tracking limit a `409` hit), falling back to the HTTP status line, with the status code on `error.status`
- `CardEditDialog` is fully labelled and keyboard-reachable: the title is a real button (Tab, then Enter/Space opens the editor; focus returns after Enter/Escape), the dialog is named by the card title, and every field has an accessible name
- Vitest test suite for the shared HTTP client (`api.js`), the pure utils (`generateRank`, `formatDuration`, `priorityChipSx`) and the data-owning hooks (`useLists`, `useBoardCards`, `useCardTimeLogs`), with MSW standing in for the backend, and every component and page: `BoardsPage`, `BoardDetailPage`, the drag-and-drop columns and cards (`Lists`, `ListColumn`, `Cards`, `CardItem`), `LoadError`, `CardEditDialog` and `TimeLogSection` (React Testing Library)
- The board's icon buttons and inputs (`Add card`, `List options`, `Card options`, `Cancel`, `List name`, `Card title`, `Priority`) have accessible names, and each column is named by its list

**Not yet built:**
- Manual editing of time entries

### Phase 3: AI Integration (FUTURE)
**Planned Technology:** Anthropic Claude API  
**Core Functionality:** Natural language command processing

### Phase 4: Deployment (FUTURE)
**Target Platform:** TBD  
**Database:** PostgreSQL (local for dev; hosting TBD)

---

## Technology Stack

### Backend (Core Complete)
| Category | Technology | Version |
|----------|-----------|---------|
| Runtime | .NET | 10.0 |
| Framework | ASP.NET Core Web API | — |
| Database | PostgreSQL | — |
| ORM | Entity Framework Core | 10.0.5 |
| DB Driver | Npgsql.EntityFrameworkCore.PostgreSQL | 10.0.1 |
| API Testing | `.http` file (`NoBacklog.Api.http`) | — |
| Unit Testing | xUnit + EF Core Sqlite (in-memory) | 2.9.3 / 10.0.5 |

### Frontend (In Development)
| Category | Technology | Version |
|----------|-----------|---------|
| Framework | React | ^19.2.0 |
| Build Tool | Vite | ^7.3.1 |
| UI Library | MUI (Material UI) | ^6.4.0 |
| Routing | React Router | ^7.14.1 |
| Drag-and-Drop | `@dnd-kit` (react, abstract, helpers) | ^0.4.0 |
| Package Manager | pnpm | — |
| Lint/Format | Biome | ^1.9.4 |
| Unit Testing | Vitest + jsdom + React Testing Library | ^5.0.3 / ^30.1.2 / ^16.3.3 |
| API Mocking | MSW (Mock Service Worker) | ^3.0.2 |
| Component Testing | `@testing-library/user-event` + `@testing-library/jest-dom` | ^14.6.7 / ^7.0.1 |

### Future Integrations
- **AI:** Anthropic Claude API
- **Deployment:** TBD
- **CI/CD:** GitHub Actions — CI in place (frontend lint, both test suites and the frontend build on every push); deployment pipeline planned

---

## Project Structure
```
nobacklog/
├── backend-dotnet/
│   ├── Controllers/
│   │   ├── BoardsController.cs
│   │   ├── ListsController.cs
│   │   ├── CardsController.cs
│   │   └── TimeLogsController.cs
│   ├── Models/
│   │   ├── Board.cs
│   │   ├── List.cs
│   │   ├── Card.cs
│   │   ├── TimeLog.cs
│   │   ├── CardReorderRequest.cs
│   │   ├── CardUpdateRequest.cs   # partial-update DTO for PUT /cards/:id
│   │   ├── ListReorderItem.cs
│   │   ├── TimeLogStartRequest.cs
│   │   ├── RunningTimerSummary.cs
│   │   └── TimeTrackingOptions.cs # MaxEntriesPerCard / MaxRunningTimers
│   ├── Json/
│   │   └── TrimmingStringConverter.cs
│   ├── Services/
│   │   ├── Interfaces/           # IBoardService, IListService, ICardService, ITimeLogService
│   │   ├── BoardService.cs
│   │   ├── ListService.cs
│   │   ├── CardService.cs
│   │   └── TimeLogService.cs
│   ├── Data/
│   │   └── AppDbContext.cs
│   ├── Migrations/                # EF Core schema migrations
│   ├── Program.cs                 # App entry point, DI, CORS, DbContext config
│   └── NoBacklog.Api.csproj
│
├── backend-tests/
│   ├── Infrastructure/
│   │   └── TestDb.cs              # per-test in-memory SQLite database + seed helpers
│   ├── Services/                  # BoardService, ListService, CardService, TimeLogService tests
│   └── NoBacklog.Api.Tests.csproj
│
└── frontend/
    └── src/
        ├── app/                    # main.jsx, routes.jsx, theme.js
        ├── test/                   # Vitest setup, MSW server, apiUrl + renderWithTheme helpers
        ├── pages/                  # BoardsPage, BoardDetailPage
        ├── features/
        │   ├── boards/              # api, components, hooks
        │   ├── lists/               # api, components, hooks, constants
        │   ├── cards/               # api, components (incl. CardEditDialog), hooks, constants, rank.js
        │   └── timeLogs/            # api, components, hooks, utils
        └── shared/
            ├── api/                 # shared fetch client (api.js): timeout, error envelope → Error
            └── components/          # shared UI (FieldLabel, LoadError)
```

---

## API Architecture

### Hierarchical Data Model
```
Board (Dashboard/Workspace)
  ├── Name: string
  └── Lists[] ─┐
               │
         List (Column/Status)
           ├── Name: string
           ├── BoardId: int → Board
           ├── Position: string  (rank-based ordering)
           └── Cards[] ─┐
                        │
                  Card (Task/Item)
                    ├── Title: string
                    ├── Description: string?
                    ├── ListId: int → List
                    ├── Position: string  (rank-based ordering)
                    ├── Priority: enum[Low, Medium, High]
                    ├── TimeEstimate: string? (free text, max 50)
                    ├── TimeTracked: int  (currently unused)
                    └── TimeLogs[] ─┐
                                    │
                              TimeLog (Work Log Entry)
                                ├── CardId: int → Card
                                ├── StartTime: DateTime
                                ├── EndTime: DateTime? (nullable)
                                └── Duration: long (ms, computed on finish)
```

### Validation Strategy
**Two-Tier Validation Pattern** (applied consistently across controllers):

1. **Field Validation**
   - Required field presence checks
   - Empty/whitespace string detection
   - Business rule validation (e.g. reorder payload cannot be empty)

2. **Reference Validation**
   - Parent resource existence verification at the service layer
   - Missing references raise `KeyNotFoundException`, caught by the controller and returned as `404`

**Example (Card Reposition):**
```csharp
// Tier 1: Field Validation
if (request.ListId == 0)
    return BadRequest(...); // malformed/missing field
if (string.IsNullOrWhiteSpace(request.Position))
    return BadRequest(...);

// Tier 2: Reference Validation (in the service layer)
// RepositionCardAsync throws KeyNotFoundException if the card or
// destination list doesn't exist — caught by the controller as 404.
```

### Ordering Strategy
Lists and Cards both carry a string `Position` field. The backend orders by a plain `OrderBy(x => x.Position)`; the frontend generates fixed-width, zero-padded rank strings (see [`rank.js`](frontend/src/features/cards/utils/rank.js)) so a lexicographic string sort is equivalent to a numeric one. New positions are computed client-side as the midpoint between two neighboring ranks, which supports append and insert-between without a server round trip to compute the value. When no integer rank is left between two neighbors (or an append would overflow the 8-digit width), `generateRank` returns `null` and the client sends the list's intended card order to `PATCH /lists/:listId/cards/rebalance`. The server then rewrites every rank in that list 1000 apart in a single transaction. A card coming from another list is moved in by the same call, so a cross-list drop that exhausts a gap is persisted in one request.

---

## API Endpoints

### Base URL
```
Dev:        http://localhost:5000/api
Production: TBD
```

### Board Endpoints
```
GET    /boards          - Get all boards
POST   /boards          - Create new board
GET    /boards/:id      - Get board by ID
PUT    /boards/:id      - Update board
DELETE /boards/:id      - Delete board
```

### List Endpoints
```
GET    /lists            - Get all lists (optional: ?boardId=xxx)
POST   /lists            - Create new list
GET    /lists/:id        - Get list by ID
PUT    /lists/:id        - Update list
DELETE /lists/:id        - Delete list
PATCH  /lists/reorder    - Persist a new list order (body: ordered array of list IDs)
```

### Card Endpoints
```
GET    /cards             - Get all cards (optional: ?listId=xxx or ?boardId=xxx)
POST   /cards             - Create new card
GET    /cards/:id         - Get card by ID
PUT    /cards/:id         - Update card
DELETE /cards/:id         - Delete card
PATCH  /cards/:id/reorder - Reposition a card (body: { listId, position })
PATCH  /lists/:listId/cards/rebalance - Re-space every card rank in a list (body: ordered array of card IDs; 409 if a card in the list is missing)
```

### TimeLog Endpoints
```
GET    /timelogs        - Get all time logs (optional: ?cardId=xxx)
POST   /timelogs            - Create new time log
POST   /timelogs/start      - Start a timer on a card (body: { cardId }; server stamps start time)
POST   /timelogs/:id/finish - Finish a running timer (server stamps end time, computes duration in ms)
GET    /timelogs/running    - Every running timer across all cards ({ id, cardId, cardTitle, startTime }[])
GET    /timelogs/settings   - Time-tracking settings ({ maxEntriesPerCard, maxRunningTimers })
GET    /timelogs/:id        - Get time log by ID
PUT    /timelogs/:id        - Update time log
DELETE /timelogs/:id        - Delete time log
```
Time-tracking rules (each returns `409 Conflict` when violated):
- A card may have **one running timer** at a time.
- A card stores at most `TimeTracking:MaxEntriesPerCard` entries, running included (**default 5**).
- At most `TimeTracking:MaxRunningTimers` timers may run at once across **all** cards (**default 2**).

Both limits are placeholder settings until a project-manager settings UI exists — override
them in `appsettings*.json`:
```json
"TimeTracking": { "MaxEntriesPerCard": 3, "MaxRunningTimers": 5 }
```

---

## Response Format

### Success Response
```json
{
  "success": true,
  "message": "Resource successfully created/updated/deleted",
  "data": { /* resource object */ }
}
```

### Error Response
```json
{
  "success": false,
  "message": "Descriptive error message"
}
```

### HTTP Status Codes
- `200` - Success (GET, PUT, DELETE, PATCH)
- `201` - Created (POST)
- `400` - Validation Error (client error)
- `404` - Resource Not Found
- `409` - Conflict (time-tracking limits)
- `500` - Server Error (unhandled)

---

## Testing Approach

### Testing Philosophy
**QA-Driven Development:** Leveraging ISTQB Foundation Level principles — positive/negative cases, boundary value analysis, equivalence partitioning, reference integrity testing.

### Backend (xUnit)
`backend-tests/` holds an xUnit project that exercises every service class directly (`BoardService`, `ListService`, `CardService`, `TimeLogService`). No database server or Docker is needed:

```bash
dotnet test backend-tests
```

- **Database:** each test gets its own in-memory SQLite database (`Infrastructure/TestDb.cs`), created from the EF model with `EnsureCreated()`. SQLite was chosen over EF's InMemory provider because it's a real relational engine, so foreign keys and `ON DELETE CASCADE` are actually enforced.
- **Assertions read back through a fresh `DbContext`**, so they check what was persisted rather than the change tracker's in-memory copy.
- **Coverage focus:** reference-integrity errors (unknown parent IDs), not-found paths, partial-update semantics (card/list `PUT`), cascade deletes, ordering and tie-breaks, and boundary values for the time-tracking limits (one below / at `MaxEntriesPerCard` and `MaxRunningTimers`).
- **Known gap vs. production:** SQLite orders strings with a binary collation, while Postgres uses the database collation, so `Card.Position` ordering isn't verified against Postgres itself. Controllers (request validation, status codes, response envelope) aren't covered yet. The next step there would be `WebApplicationFactory` integration tests.

### Frontend (Vitest)
Test files sit next to the code they cover (`rank.js` → `rank.test.js`). No backend or database is needed:

```bash
cd frontend
pnpm test            # run once
pnpm test:watch      # re-run affected tests on save
pnpm test:coverage   # coverage report (text + coverage/index.html)
```

- **Runner:** Vitest, configured in `vite.config.js` so tests go through the same transform pipeline as the app. `globals` is off — tests import `describe`/`it`/`expect` explicitly, so `src/test/setup.js` calls Testing Library's `cleanup()` itself.
- **Backend stand-in:** MSW (`src/test/server.js`) intercepts `fetch`, so the real `api.js` and service modules run in every hook test: URLs, verbs, request bodies and error conversion are all exercised. The server starts with no handlers; each test declares exactly the endpoints it expects with `server.use(...)`, and any undeclared request fails the test (`onUnhandledRequest: 'error'`).
- **Components** render through `renderWithTheme` (`src/test/render.jsx`), which wraps them in the app's `ThemeProvider` (their `sx` callbacks read custom palette tokens MUI's default theme lacks) and returns a `user-event` session (`delay: null`, so typing doesn't wait a timer tick per keystroke). Elements are queried role-first (`getByRole('button', { name: 'Save' })`), then label/placeholder/text — never MUI class names. `jest-dom` matchers (`toBeDisabled`, `toHaveValue`, …) are registered in `setup.js`.
- **Hooks** are driven with `renderHook` / `waitFor` / `act`. Error assertions match the exact message (e.g. `HTTP error: 500 Internal Server Error`), because an unmatched handler also produces an error (`TypeError: fetch failed`) and a vague assertion would pass for the wrong reason.
- **Coverage focus:** rank boundaries (`RANK_MAX`, exhausted gaps) plus a repeated-bisection test asserting *string* sort order; duration rollovers and the negative clamp; for each hook, load → error → reload transitions, a stale-response guard, every mutation's success and rejection, the rebalance-before-create path, and rollback of a rejected drag. For components (`LoadError`, `CardEditDialog`, `TimeLogSection`): each optimistic edit's revert on failure, Save/Discard dirty-tracking and in-flight states, Escape cancelling a title edit without closing the dialog, the Start button and limit captions at each cap's boundary, and the live elapsed counter (fake `setInterval`/`Date` only). For pages and the drag-and-drop components: `BoardsPage`'s links resolve through a memory router; `BoardDetailPage` loads the board name, lists and cards independently (each with its own error and Retry, and no cards banner until the lists are on screen) and merges the card's priority into every dialog save; `ListColumn`'s rename (Enter, blur, Escape, blank/unchanged, optimistic name settling) and add-card form (Shift+Enter, L/M/H outside the title, focus-leave closing that ignores the priority dropdown); `Lists`' per-column slicing and error scoping; `CardItem`'s delayed single-click open, double click, and moved-press rejection.
- **Drag-and-drop:** jsdom has no layout, so dnd-kit can't resolve a real pointer drag. `BoardDetailPage.test.jsx` wraps `DragDropProvider` to reach the handlers the page passes it, and calls `onDragStart`/`onDragOver`/`onDragEnd` with synthetic events shaped like dnd-kit's. It asserts on the rendered order and on the request each drop sends: list reorder and its rollback, same-list and cross-list card moves (onto a card, into an empty column, below the last card), the rebalance when ranks are exhausted, the rejected-move rollback, and cancelled drags. The real provider still renders, so every `useSortable`/`useDroppable` registration runs. `setup.js` stubs `ResizeObserver`, which `@dnd-kit/dom` constructs on import.
- **Queries on the board:** dnd-kit gives each draggable `role="button"` with `aria-roledescription="draggable"`, so a column isn't a `region` and a card isn't a `listitem`. Columns are found by their name (`getByLabelText('To Do', { selector: 'section' })`) and cards by their title text.
- **HTTP client:** `api.test.js` covers the error envelope's `message`, the status-line fallback for empty, non-JSON and blank-message bodies, and the 5000 ms timeout. For the timeout, MSW holds the response with `delay('infinite')` while only `setTimeout`/`clearTimeout` are faked.
- **Mutation-checked:** while writing the suite, deliberate bugs were injected into each module under test to confirm a test fails for each one. One known exception: `ListColumn`'s Escape resets the title draft in case the field's unmount also fires a `blur`, which jsdom never does.
- **Not covered:** `main.jsx` and `routes.jsx` (app bootstrap), and real pointer/keyboard drags, which need a browser (Playwright).

### Continuous Integration
`.github/workflows/ci.yml` runs on every push (and on demand from the Actions tab), as two parallel jobs:

- **Backend:** `dotnet test backend-tests` on .NET 10.
- **Frontend:** `pnpm install --frozen-lockfile`, `pnpm lint` (Biome: formatting and lint rules), `pnpm test`, then `pnpm build`. pnpm's version comes from `packageManager` in `frontend/package.json`.

A newer push to the same branch cancels the run it supersedes. `frontend/.gitattributes` checks the frontend out with LF line endings, so `pnpm lint` passes on Windows exactly as it does in CI; run `pnpm format` (or `pnpm biome check --write .`) to fix formatting locally.

---

## Established Code Patterns

### Controller Pattern
```csharp
[HttpPost]
public async Task<IActionResult> Create([FromBody] Resource resource)
{
    // 1. Field validation
    if (string.IsNullOrWhiteSpace(resource.Name))
        return BadRequest(new { success = false, message = "Name is required." });

    try
    {
        // 2. Service call — reference validation happens here,
        //    throwing KeyNotFoundException if a parent doesn't exist.
        var created = await _resourceService.CreateResourceAsync(resource);
        return CreatedAtAction(nameof(GetById), new { id = created.Id },
            new { success = true, message = "Resource successfully created.", data = created });
    }
    catch (KeyNotFoundException ex)
    {
        return NotFound(new { success = false, message = ex.Message });
    }
}
```

### Service Pattern
- Each resource has an `I{Resource}Service` interface and a `{Resource}Service` implementation, registered as scoped DI services in `Program.cs`.
- Services own EF Core queries (`AppDbContext`), reference-existence checks, and business rules (e.g. rank reordering, duration calculation).

### Frontend Feature-Folder Pattern
- Each domain (`boards`, `lists`, `cards`, `timeLogs`) owns its own `api/`, `components/`, and `hooks/` subfolders, with an `index.js` barrel export.
- Pages (`src/pages/`) compose feature hooks and components; they do not fetch data directly.
- Card state is lifted to the board level (`useBoardCards` in `BoardDetailPage`) so a single drag handler can see both the source and destination list when a card moves across columns.

---

## Getting Started

### Prerequisites
- .NET SDK 10.0+
- Node.js 22.12+ (Vitest 5 requirement; CI uses Node 24) and pnpm 9 (pinned via `packageManager`; `npm install` is blocked)
- PostgreSQL (local instance, or a hosted connection string)
- Git
- Code editor (VS Code / Rider recommended)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd nobacklog
```

2. **Configure the backend**
```bash
cd backend-dotnet
# Create appsettings.Development.json (gitignored) with a PostgreSQL
# connection string under ConnectionStrings:DefaultConnection
dotnet restore
dotnet ef database update
```

3. **Configure the frontend**
```bash
cd frontend
pnpm install
```

4. **Start both dev servers** — see [Running the App](#running-the-app) below.

5. **Verify the API is running**
```bash
# Should return: { "message": "NoBacklog API is running..." }
curl http://localhost:5000/
```

---

## Running the App

| | Frontend | Backend | Database |
|---|---|---|---|
| **Dev** | `http://localhost:5173` | `http://localhost:5000` | `nobacklog` |

```bash
# Terminal 1 — backend (from backend-dotnet/)
dotnet run --launch-profile http

# Terminal 2 — frontend (from frontend/)
pnpm dev
```

`.claude/launch.json` defines the same two servers (`frontend`, `backend`) for Claude Code's preview tools.

---

## Learning Resources

### Backend References
- [ASP.NET Core Documentation](https://learn.microsoft.com/en-us/aspnet/core/)
- [Entity Framework Core Documentation](https://learn.microsoft.com/en-us/ef/core/)
- [Npgsql Documentation](https://www.npgsql.org/efcore/)
- [PostgreSQL Manual](https://www.postgresql.org/docs/)

### Frontend References
- [React Documentation](https://react.dev/learn)
- [MUI Documentation](https://mui.com/material-ui/getting-started/)
- [@dnd-kit Documentation](https://next.dndkit.com/)
- [React Router Documentation](https://reactrouter.com/)

### Testing References
- [ISTQB Syllabus](https://www.istqb.org/certifications/certified-tester-foundation-level)
- [xUnit Documentation](https://xunit.net/)
- [Vitest Documentation](https://vitest.dev/guide/)
- [MSW Documentation](https://mswjs.io/docs/)
- [React Testing Library — `renderHook`](https://testing-library.com/docs/react-testing-library/api/#renderhook)

---

## Development Roadmap

### Completed
- [x] Backend API architecture design (ASP.NET Core + EF Core + PostgreSQL)
- [x] Database schema modeling + migrations
- [x] Board API implementation
- [x] List API implementation (+ reorder endpoint)
- [x] Card API implementation (+ reposition endpoint, rank-based ordering)
- [x] TimeLog API implementation
- [x] React project initialization (Vite, MUI, React Router)
- [x] API client setup
- [x] Board list + board detail pages
- [x] List column CRUD (create, delete) + drag-and-drop reordering
- [x] Card CRUD (create, delete) + drag-and-drop reordering, including cross-list moves

### Previous Sprint: Core UI Completeness (Complete)
- [x] Card detail view / editing (title, description, priority)
- [x] List renaming
- [x] Time tracking UI (start/finish/delete in the card detail dialog; per-card entry cap + global running-timer cap)
- [x] Automated backend test project (xUnit against the service layer, in-memory SQLite)

### Follow-ups from card editing
- [ ] Sync the open card editor to a `?card=<id>` URL param (deep-linkable, survives refresh)
- [x] Dedupe the priority-chip colour lookup shared by `CardItem` and `CardPreview` (`priorityChipSx`)
- [ ] Add `theme.js` component overrides for MUI `Dialog`/form controls instead of local `sx` fixes

### Follow-ups from time tracking
- [ ] Manual editing of a time entry's start/finish times
- [ ] Project-manager settings UI for `MaxEntriesPerCard` / `MaxRunningTimers` (after auth/roles)
- [ ] DB-level guard for one running timer per card (partial unique index on `card_id WHERE end_time IS NULL`)
- [ ] Decide the fate of the unused `Card.TimeTracked` column (sync from logs or drop)
- [x] Surface the server's error `message` in `api.js` instead of the generic `HTTP error: 409`

### Follow-ups from backend tests
- [ ] Controller-level integration tests (`WebApplicationFactory`): validation 400s, 404/409 mapping, response envelope
- [ ] Optional Postgres Testcontainers run to verify `Position` ordering under the real collation
- [x] Run `dotnet test` in CI (GitHub Actions)

### Previous Sprint: Hardening (Complete)
- [x] Rank rebalancing when a position gap is exhausted (`PATCH /lists/:listId/cards/rebalance`)
- [x] Per-feature loading/error states (board name, lists and cards load and retry independently; failed drag persists roll back)
- [x] Frontend test coverage (Vitest + MSW: rank/duration utils and the `useLists`, `useBoardCards`, `useCardTimeLogs` hooks)

### Follow-ups from frontend tests
- [x] Component tests with React Testing Library (`CardEditDialog`, `TimeLogSection`, `LoadError`)
- [x] Tests for pages (`BoardsPage`, `BoardDetailPage`) and the drag-and-drop components (`ListColumn`, `CardItem`, `Lists`, `Cards`)
- [ ] `BoardDetailPage`'s `onDragOver` looks the dragged card up by its dnd-kit id (`card-3`) instead of its numeric id, so its "only commit same-list hovers" guard never fires and cross-list hovers are applied live too (see its comment for the ghost-card bug the guard was meant to prevent)
- [ ] A failed card create clears the add-card title (`submitCreateCard` resolves after recording the error), unlike the add-list form, which keeps the name for a retry
- [ ] The list title is click-only: make it keyboard-reachable like `CardEditDialog`'s title
- [ ] Browser-level drag-and-drop tests (Playwright): real pointer and keyboard drags
- [x] Accessibility gaps found while testing `CardEditDialog`: the time-estimate and description fields have no accessible name (`FieldLabel` isn't a `<label>`), the title isn't keyboard-reachable and its input has no name, and the dialog has no accessible name (`aria-labelledby`)
- [x] Test `api.js`'s timeout path (fake timers + MSW), alongside the server-error-message follow-up
- [x] Remove the unused `useCards` hook (superseded by `useBoardCards`, still exported from `features/cards/index.js`)
- [x] Check whether `useCardTimeLogs` should clear its state when `cardId` becomes null. Not needed: `TimeLogSection` only mounts while the dialog has a card, so closing it unmounts the hook
- [x] Run `pnpm test` in CI alongside `dotnet test`
- [x] Project-wide Biome cleanup (`pnpm lint` reports pre-existing errors in files outside the test suite), then add `pnpm lint` to CI
- [ ] Add coverage thresholds once components are tested

### Future Features
- [ ] User authentication
- [ ] AI command processing
- [ ] Deployment to production
- [ ] Mobile responsiveness optimization
- [ ] Real-time updates

---

## Development Principles

### Code Quality
- **DRY (Don't Repeat Yourself):** Reusable patterns across all APIs and frontend features
- **Separation of Concerns:** Clear model/service/controller boundaries on the backend; clear data/hooks/components boundaries on the frontend
- **Consistent Naming:** Descriptive, conventional variable/function names
- **Error Handling:** Field validation at the controller, reference validation at the service layer, surfaced as typed HTTP responses

### QA Mindset Applied to Development
- Boundary value testing during validation design
- Equivalence partitioning for error scenarios
- Edge case consideration (null values, empty strings, invalid references, exhausted rank gaps)
- Negative testing coverage (400, 404 responses)
- State transition testing (idle → running timer → finished timer)

---

## Developer Notes

**Reference Document:** CV uploaded in project files for technical depth calibration

**Development Preferences:**
- Step-by-step numbered guidance (max 5 steps per increment)
- Explanatory teaching over direct code solutions
- Credible documentation references
- Real-world examples and analogies
- Technical depth appropriate to ISTQB certification + 3+ years experience

**Available Time Commitment:**
- Weekdays: 15 hours (after 4:30 PM)
- Weekends: 10 hours
- Flexible session-based progress

---

## License

This is a portfolio project for educational and demonstration purposes.

---

Email: fklandee@gmail.com  
LinkedIn: [linkedin.com/in/patiphak-klandee](https://linkedin.com/in/patiphak-klandee)  
Portfolio: [faroklandee.in](https://faroklandee.in/)

 
**Current Phase:** Frontend Development - Core Kanban UI complete (boards, lists, cards, drag-and-drop, card editing, time tracking); hardening sprint and Phase 2 close-out complete (server error messages, dialog accessibility, Biome lint in CI)  
**Backend Status:** CRUD, reordering and timer endpoints complete across Board, List, Card, TimeLog resources | xUnit service-layer tests in place; controller integration tests pending
