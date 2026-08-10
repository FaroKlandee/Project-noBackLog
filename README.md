# NoBacklog MVP Development

AI-powered task management application with natural language command interface. A portfolio project demonstrating full-stack development expertise and QA-driven development practices.

**Developer:** Patiphak Klandee (Faro)  
**Technical Background:** ISTQB Certified | 3+ Years QA/Development Experience  
**Project Status:** Backend Complete (Core CRUD + Reordering) | Frontend In Progress (Boards/Lists/Cards + Drag-and-Drop Working)

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
**Status:** 20 endpoints operational across Board, List, Card, and TimeLog resources, plus dedicated reorder endpoints for Lists and Cards.

**Achievement Summary:**
- Built a production-ready 4-tier hierarchical REST API on ASP.NET Core
- Implemented comprehensive validation patterns (field + reference)
- Designed a controller → service → EF Core data-access layering with PostgreSQL
- Added rank-based positioning for drag-and-drop reordering (Lists and Cards)

**Completed APIs:**
1. **Board API** - Dashboard/workspace management (5 endpoints)
2. **List API** - Column/status management (5 endpoints + reorder)
3. **Card API** - Task/item management (5 endpoints + reposition)
4. **TimeLog API** - Time tracking functionality (5 endpoints) — implemented but not yet consumed by the frontend

**Total Backend Deliverables:**
- 4 EF Core entity models with relationships (`Board`, `List`, `Card`, `TimeLog`)
- 4 ASP.NET controllers, each backed by an injected service class and interface
- EF Core migrations tracking schema evolution (including the card `Position` ranking column)
- `.http` request file for manual endpoint testing

> **Note:** There is currently no automated test suite for the backend (no xUnit/NUnit project, no Postman collection). This is a gap versus the original QA-driven goal for this project and is worth prioritizing before further backend work.

### Phase 2: Frontend Development (CURRENT)
**Framework:** React 19 (Vite)  
**Styling/Components:** MUI (Material UI)  
**Status:** Core Kanban experience is functional — board list, board detail, list and card CRUD, and full drag-and-drop reordering (within and across columns) are implemented.

**Implemented so far:**
- Boards list and board detail pages (`react-router` routed)
- List columns: create, delete, drag-and-drop reordering
- Cards: create (inline form with title + priority, keyboard shortcuts), delete, drag-and-drop reordering within a column and across columns
- Rank-based position encoding (`generateRank`) so client-assigned positions sort correctly against the backend's plain string ordering
- `@dnd-kit` integration with a shared `DragDropProvider`, type-scoped sortables (`list` vs `card`), and a `DragOverlay` to avoid DOM-relocation conflicts with React's reconciliation

**Not yet built:**
- Card detail view / editing (title, description, priority updates)
- List renaming
- Time tracking UI (backend API exists, frontend `timeLogs` feature folder is still a stub)
- Loading/error states beyond a single board-level spinner and error banner

### Phase 3: AI Integration (FUTURE)
**Planned Technology:** Anthropic Claude API  
**Core Functionality:** Natural language command processing

### Phase 4: Deployment (FUTURE)
**Target Platform:** TBD  
**Database:** PostgreSQL (local for dev/staging; hosting TBD)

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

### Future Integrations
- **AI:** Anthropic Claude API
- **Deployment:** TBD
- **CI/CD:** GitHub Actions (planned)

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
│   │   └── ListReorderItem.cs
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
└── frontend/
    └── src/
        ├── app/                    # main.jsx, routes.jsx, theme.js
        ├── pages/                  # BoardsPage, BoardDetailPage
        ├── features/
        │   ├── boards/              # api, components, hooks
        │   ├── lists/               # api, components, hooks
        │   ├── cards/               # api, components, hooks, rank.js
        │   └── timeLogs/            # stub — not yet implemented
        └── shared/
            └── api/                 # shared axios/fetch client (api.js)
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
                    ├── TimeTracked: int
                    └── TimeLogs[] ─┐
                                    │
                              TimeLog (Work Log Entry)
                                ├── CardId: int → Card
                                ├── StartTime: DateTime
                                ├── EndTime: DateTime? (nullable)
                                └── Duration: (calculated)
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
Lists and Cards both carry a string `Position` field. The backend orders by a plain `OrderBy(x => x.Position)`; the frontend generates fixed-width, zero-padded rank strings (see [`rank.js`](frontend/src/features/cards/utils/rank.js)) so a lexicographic string sort is equivalent to a numeric one. New positions are computed client-side as the midpoint between two neighboring ranks, which supports append and insert-between without a server round trip to compute the value. Rebalancing an exhausted gap is not yet implemented.

---

## API Endpoints

### Base URL
```
Dev:      http://localhost:5000/api
Staging:  http://localhost:5001/api
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
```

### TimeLog Endpoints
```
GET    /timelogs        - Get all time logs (optional: ?cardId=xxx)
POST   /timelogs        - Create new time log
GET    /timelogs/:id    - Get time log by ID
PUT    /timelogs/:id    - Update time log
DELETE /timelogs/:id    - Delete time log
```
*(Implemented on the backend; not yet wired up to any frontend UI.)*

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
- `500` - Server Error (unhandled)

---

## Testing Approach

### Testing Philosophy
**QA-Driven Development:** Leveraging ISTQB Foundation Level principles — positive/negative cases, boundary value analysis, equivalence partitioning, reference integrity testing.

### Current State
There is **no automated test suite in the repository right now** (backend or frontend). The `.http` file in `backend-dotnet/` supports manual endpoint verification during development, but it is not a substitute for a real test project.

**Recommended next step:** stand up an xUnit test project against the service layer (services are already interface-based and injected, so they're mockable) before the API surface grows further — this restores the QA-driven approach the project is meant to demonstrate.

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
- Node.js (v18+) and pnpm
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

The project has two environments — **dev** and **staging** — designed to run simultaneously, each on its own port pair. This supports having both branches open in the same Zed window.

| | Frontend | Backend | Database |
|---|---|---|---|
| **Dev** | `http://localhost:5173` | `http://localhost:5000` | `nobacklog` |
| **Staging** | `http://localhost:5174` | `http://localhost:5001` | `nobacklog_staging` |

### Dev

```bash
# Terminal 1 — backend (from backend-dotnet/)
dotnet run --launch-profile http

# Terminal 2 — frontend (from frontend/)
pnpm dev
```

### Staging

```bash
# Terminal 1 — backend (from backend-dotnet/)
dotnet run --launch-profile staging

# Terminal 2 — frontend (from frontend/)
pnpm dev:staging
```

### Running both simultaneously

Open four terminals — one per process — and run all four commands above at the same time. Dev and staging use separate ports and separate databases so they won't interfere with each other.

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

### Current Sprint: Core UI Completeness
- [ ] Card detail view / editing (title, description, priority)
- [ ] List renaming
- [ ] Time tracking UI (start/stop/edit, backed by the existing TimeLog API)
- [ ] Automated backend test project (xUnit against the service layer)

### Next Sprint: Hardening
- [ ] Rank rebalancing when a position gap is exhausted
- [ ] Per-feature loading/error states (currently board-level only)
- [ ] Frontend test coverage

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
- State transition testing (active timer → stopped timer, once TimeLog UI exists)

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

 
**Current Phase:** Frontend Development - Core Kanban UI functional (boards, lists, cards, drag-and-drop); time tracking UI and card editing still open  
**Backend Status:** Core CRUD + reordering complete across Board, List, Card, TimeLog resources | No automated test suite yet
