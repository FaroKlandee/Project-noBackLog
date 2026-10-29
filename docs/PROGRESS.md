# nobacklog — Project Progress

As of 2026-10-27 · Faro

> Exported from the [project progress doc](https://claude.ai/artifact/TJGFtDXZnCsdsAs2fYzRY5), which is the copy that gets edited. Re-export it here when it changes.

## Summary

Phase 2 (frontend) is in progress: 36 of 47 roadmap items are done, and 6 follow-ups plus 5 future features remain open. The backend API is complete; Phases 3 (AI) and 4 (deployment) have not started.

| Phase | Scope | State | Work dates |
| --- | --- | --- | --- |
| 1. Backend API | ASP.NET Core + EF Core + PostgreSQL; 27 endpoints across Board, List, Card, TimeLog | Complete | Dec 2025 – Sep 2026 |
| 2. Frontend | React 19 + Vite + MUI Kanban, drag-and-drop, card editing, time tracking, Vitest suite, CI | In progress | Apr 2026 – now |
| 3. AI integration | Natural-language commands via the Claude API | Not started | — |
| 4. Deployment | Hosting platform and production database | Not started | — |

Active branch is `dev`; it was last merged to `main` on 2026-10-21, and 7 commits have landed on `dev` since.

## Planned work

11 of 12 planned items are still open. When an item lands, set it to Done and add a row to Committed work.

| Item | Area | Source | Status |
| --- | --- | --- | --- |
| Add coverage thresholds now that components are tested | Frontend tests | Frontend-test follow-up | Done |
| Browser-level drag-and-drop tests (Playwright): real pointer and keyboard drags | Frontend tests | Frontend-test follow-up | Planned |
| Controller-level integration tests (`WebApplicationFactory`): validation 400s, 404/409 mapping, response envelope | Backend tests | Backend-test follow-up | Planned |
| Optional Postgres Testcontainers run to verify `Position` ordering under the real collation | Backend tests | Backend-test follow-up | Planned |
| DB-level guard for one running timer per card (partial unique index on `card_id WHERE end_time IS NULL`) | Time tracking | Time-tracking follow-up | Planned |
| Decide the fate of the unused `Card.TimeTracked` column (sync from logs or drop) | Time tracking | Time-tracking follow-up | Planned |
| Project-manager settings UI for `MaxEntriesPerCard` / `MaxRunningTimers` (needs auth/roles) | Time tracking | Time-tracking follow-up | Blocked |
| User authentication | Platform | Future feature | Planned |
| Mobile responsiveness optimization | Frontend | Future feature | Planned |
| Real-time updates | Platform | Future feature | Planned |
| AI command processing (Phase 3) | AI | Future feature | Planned |
| Deployment to production (Phase 4) | Deployment | Future feature | Planned |

## Committed work

Every completed work item, grouped by area and newest first within each, with the commits that delivered it.

| Item | Area | Commits | Landed |
| --- | --- | --- | --- |
| Card rank rebalancing endpoint (`PATCH /lists/:listId/cards/rebalance`) | Backend | `3d5f8f8` | 2026-09-30 |
| xUnit service-layer test project on in-memory SQLite | Backend | `d7728a9` | 2026-09-28 |
| Server-stamped Start/Finish timers with per-card and global limits | Backend | `d79b158` | 2026-09-27 |
| Partial card updates on `PUT /api/cards/:id` | Backend | `b5d9d41` | 2026-09-17 |
| Card reposition endpoint and rank-based ordering | Backend | `cd0e159`, `92b4049`, `f8b8a9f` | 2026-07-15 – 08-04 |
| List reorder endpoint | Backend | `6cb18cf` | 2026-05-05 |
| TimeLog API | Backend | `5f4721f` | 2026-02-05 |
| Card API | Backend | `959bd0b` | 2026-01-30 |
| Board and List APIs | Backend | `747c25a` | 2026-01-18 |
| Data models and database setup | Backend | `e3ef7de` | 2025-12-27 |
| Failed card create keeps title and priority; list title keyboard-reachable | Frontend | `3fc1659` | 2026-10-27 |
| Cross-list card hover held until the drop (`onDragOver` guard fix) | Frontend | `d6980b1` | 2026-10-27 |
| Shared Dialog and form-control styling in `theme.js` overrides | Frontend | `59e324a` | 2026-10-26 |
| Open card kept in the URL as `?card=<id>` | Frontend | `e6b3deb` | 2026-10-26 |
| Manual correction of a time entry's start and finish | Frontend | `a84ff8c` | 2026-10-26 |
| Remove unused `useCards` hook; share `priorityChipSx` | Frontend | `98b49d7` | 2026-10-17 |
| `CardEditDialog` fully labelled and keyboard-reachable | Frontend | `b096ba0` | 2026-10-17 |
| Server error message surfaced from `api.js` | Frontend | `aa242d6` | 2026-10-17 |
| Per-feature loading/error states; failed drags roll back | Frontend | `75d53ab`, `9237683` | 2026-09-30 |
| Whole list column is a card drop target | Frontend | `f385568` | 2026-09-30 |
| Time tracking section in the card dialog | Frontend | `684e009`, `db9f82a` | 2026-09-27 |
| Card edit dialog with per-field saving (title, description, priority, estimate) | Frontend | `6418521`, `da2b182`, `ee7afef` | 2026-09-17 – 09-19 |
| Inline list title rename | Frontend | `8012c45`, `24c587f` | 2026-08-27 – 09-17 |
| Card drag-and-drop within and across lists | Frontend | `4657add`, `5f958bd`, `9c4a4be` | 2026-07-29 – 08-04 |
| List drag-and-drop reordering with backend sync | Frontend | `6cb18cf`, `e4798e0` | 2026-05-05 – 08-13 |
| Card create and delete | Frontend | `43b7e68`, `242d4f2` | 2026-05-25 – 05-29 |
| List create and delete | Frontend | `a224b35`, `4bd9d14` | 2026-05-07 – 05-20 |
| Boards page and board detail page | Frontend | `855c050`, `29c1333` | 2026-04-21 – 04-28 |
| Project migration to Vite, MUI, Biome, pnpm; API client | Frontend | `a66525a`, `83fad48` | 2026-04-03 |
| Coverage thresholds enforced in CI (94/88/95/95%) | Tests and CI | `1aa5816` | 2026-10-27 |
| Page and drag-and-drop component tests | Tests and CI | `0164428` | 2026-10-23 |
| Biome formatting project-wide; `pnpm lint` in CI | Tests and CI | `fc6c067`, `2af357e` | 2026-10-17 |
| Component tests: `LoadError`, `CardEditDialog`, `TimeLogSection` | Tests and CI | `b94a0c1` | 2026-10-16 |
| CI workflow running `dotnet test` and `pnpm test` | Tests and CI | `3878dbc` | 2026-10-06 |
| Vitest + MSW tests for utils and data hooks, with coverage report | Tests and CI | `d10d045`, `b3a5225` | 2026-10-05 |

## Changelog

95 commits (merge commits left out) from 2025-12-27 to 2026-10-27, newest first, as written in git.

| Date | Commit | Message |
| --- | --- | --- |
| 2026-10-27 | `1aa5816` | Enforce frontend coverage thresholds in CI |
| 2026-10-27 | `3fc1659` | Keep a failed card's title and make the list title keyboard-reachable |
| 2026-10-27 | `79502b4` | Ignore Claude Code planning notes in .claude/plans/ |
| 2026-10-27 | `d6980b1` | Hold a card's cross-list hover until the drop |
| 2026-10-26 | `59e324a` | Move shared Dialog and form-control styling into theme.js overrides |
| 2026-10-26 | `e6b3deb` | Keep the open card in the board URL as `?card=<id>` |
| 2026-10-26 | `a84ff8c` | Let a time entry's start and finish times be corrected by hand |
| 2026-10-23 | `0164428` | Test the pages and drag-and-drop components |
| 2026-10-21 | `3b232c3` | Bring the docs in line with dev before merging to main |
| 2026-10-17 | `2af357e` | Run pnpm lint in CI and document the Phase 2 close-out |
| 2026-10-17 | `fc6c067` | Apply Biome formatting project-wide so pnpm lint passes |
| 2026-10-17 | `98b49d7` | Remove the unused useCards hook and share the priority chip's sx |
| 2026-10-17 | `b096ba0` | Make CardEditDialog fully labelled and keyboard-reachable |
| 2026-10-17 | `aa242d6` | Surface the server's error message from api.js and test its timeout |
| 2026-10-16 | `b94a0c1` | Add component tests for LoadError, CardEditDialog and TimeLogSection |
| 2026-10-07 | `2a5d096` | Document the CI workflow and tick the CI follow-ups |
| 2026-10-06 | `3878dbc` | Add CI workflow for backend and frontend tests |
| 2026-10-05 | `b3a5225` | Add MSW-backed tests for the data hooks and a coverage report |
| 2026-10-05 | `d10d045` | Add Vitest and unit tests for rank and duration utils |
| 2026-10-01 | `a05a0ce` | Switch frontend back to pnpm and block npm installs |
| 2026-10-01 | `a68cafa` | Switch frontend back to pnpm and block npm installs |
| 2026-10-01 | `38729a9` | ignored .claude |
| 2026-09-30 | `f385568` | Make the whole list column a card drop target |
| 2026-09-30 | `75d53ab` | Add per-feature loading/error states and roll back failed drags |
| 2026-09-30 | `3d5f8f8` | Add card rank rebalancing when a position gap is exhausted |
| 2026-09-29 | `8df6fb9` | Update README to reflect completed core UI sprint |
| 2026-09-28 | `3b86ec6` | Tick backend tests off the roadmap, document the test project |
| 2026-09-28 | `d7728a9` | Add xUnit service-layer test project backed by in-memory SQLite |
| 2026-09-27 | `fbe0c99` | Tick time tracking UI off the roadmap, document timer endpoints |
| 2026-09-27 | `db9f82a` | Add time tracking section to the card detail dialog |
| 2026-09-27 | `684e009` | Add timeLogs service, useCardTimeLogs hook, and duration formatters |
| 2026-09-27 | `d79b158` | Add server-stamped timer endpoints with per-card and global limits |
| 2026-09-24 | `9237683` | Scope list mutation errors, rework list/card drag activation |
| 2026-09-22 | `b8580d9` | Clone dragged list's cards into the DragOverlay preview |
| 2026-09-19 | `ee7afef` | Redesign card edit dialog with per-field saving |
| 2026-09-19 | `da2b182` | Add nullable TimeEstimate field to Card |
| 2026-09-17 | `4dda29a` | Tick card editing off the roadmap, add its follow-up items |
| 2026-09-17 | `6418521` | Add card editing (title, description, priority) |
| 2026-09-17 | `b5d9d41` | Support partial card updates on PUT /api/cards/:id |
| 2026-09-17 | `b5ff240` | Add priority constant shared by the add-card form and card editor |
| 2026-09-17 | `24c587f` | Fix Enter key not committing list title edit |
| 2026-08-27 | `5817b98` | Trim whitespace from inbound titles/names consistently |
| 2026-08-27 | `8012c45` | Add inline list title rename (Trello-style click-to-edit) |
| 2026-08-13 | `e4798e0` | Fix list drag-and-drop dead zones and reorder repaint failure |
| 2026-08-10 | `cb88c1e` | Untrack nobacklog-cluster.txt and gitignore it |
| 2026-08-10 | `6cd14f2` | Update README to reflect actual .NET/PostgreSQL stack and current progress |
| 2026-08-04 | `9c4a4be` | Fix duplicate cards and removeChild crash in card drag-and-drop |
| 2026-08-04 | `f8b8a9f` | Remove UNSET position sentinel now that ranks are always client-assigned |
| 2026-08-01 | `5f958bd` | Implement card drag-and-drop reordering and creation ranking |
| 2026-07-30 | `180a980` | Set up zed for inkstation |
| 2026-07-29 | `6d52594` | Lift card state to the board level |
| 2026-07-29 | `4657add` | Add card drag-and-drop with type-scoped sortables |
| 2026-07-21 | `92bb88e` | Implemented dragndrop in CardItem. |
| 2026-07-21 | `d27f66a` | Updated card.jsx to pass index to carditem for reordering. |
| 2026-07-21 | `ba775fc` | Moved styling and individual functions inside card into carditem.jsx. Implemented map in cards.jsx to render. |
| 2026-07-21 | `92b4049` | Updated GetAllCardsAsync to orderby c.position instead of createdAt |
| 2026-07-15 | `cd0e159` | added position property to card and default value for card.cs; Added entity property to ef core.; Created CardReorderRequest model.; Added reorder card Service method.; Added card reorder controller method. |
| 2026-06-22 | `364e58b` | Updated and added new comment and descriptions boxes for all frontend logic. |
| 2026-06-18 | `ef1d7f3` | Updated appsettings config and gitignore signs |
| 2026-06-17 | `aff2c9c` | Untrack appsettings.json and add example template |
| 2026-06-16 | `0c89427` | Added individual list column scrolling for lists with overflow cards. Added horizontal scroll for overflow lists. |
| 2026-06-16 | `28bab19` | Fixed frontend port config error and createNewList logic error. setLists was passing the whoel JSON objects instead of JSON body. |
| 2026-06-15 | `2bf1c5b` | Appended gitignore |
| 2026-06-15 | `2ecfef2` | Removed error config files and scripts. Fixed ASP.NET backend config |
| 2026-06-15 | `481ee44` | Remove redundant config files |
| 2026-06-15 | `6d43ff2` | Fixed backend errors and config to dev db. Attempted to implement column & workspace scroll |
| 2026-06-04 | `ffaac83` | Added shortcut keys for priority selection. Fixed staging backend port |
| 2026-06-02 | `261c718` | git env config |
| 2026-06-02 | `761bdc0` | staging env addition. Theme rework |
| 2026-05-29 | `8b223d8` | Resolved mutationError handling, theme and colours to adapt and menuitem selection |
| 2026-05-29 | `242d4f2` | Added staging DB connection. Feat: Card creation and deletion |
| 2026-05-25 | `43b7e68` | Created handlers for createCard and deleteCard |
| 2026-05-20 | `4bd9d14` | Feat: menu with delete option. Refined deleteexistinglist boarddetailpage and lists |
| 2026-05-07 | `a224b35` | Feat: Created list frontend to backend functionality |
| 2026-05-06 | `cf29dda` | feat: add new list button with styling |
| 2026-05-05 | `6cb18cf` | feat: implement drag-and-drop list reordering with persistent backend sync |
| 2026-04-28 | `5d46522` | Traffic light guards on Boards.jsx |
| 2026-04-28 | `29c1333` | Implemented grid layout for boardspage and column for listpage. Added state handling. |
| 2026-04-24 | `6029845` | Add simple styling to list and flexbox |
| 2026-04-23 | `6bc6dee` | Completed cards feature. Corrected enum translation from ASP.NET to frontend |
| 2026-04-22 | `40fa907` | Constructed cards feature: Routing, Components, index and hooks done. Will need to integrate with boarddetailpage |
| 2026-04-21 | `855c050` | Constructed simple boards logic, routing and render. Constructed simple lists logic, routing and render |
| 2026-04-06 | `e202703` | Implemented boards hook, console logs and completed browser test |
| 2026-04-05 | `ded9569` | Implemented frontend getBoard hook fetch |
| 2026-04-03 | `d10eacd` | corrected structuring on features. Added index for public boundaries |
| 2026-04-03 | `6c91ae2` | Restructured according to FSD |
| 2026-04-03 | `83fad48` | Assigned api.js to carry out HTTP concerns and boardService.js to call api and return data |
| 2026-04-03 | `a66525a` | Performed project migration. Implemented feature slice, added MUI+ emotion, Biome, pnpm, Native Fetch API, C# ASP.NET Core, Postgresql |
| 2026-03-26 | `c7d5abe` | Updated README.md |
| 2026-02-05 | `5f4721f` | Implemented time log feature, added routing |
| 2026-01-30 | `959bd0b` | Implemented card API - Tested |
| 2026-01-20 | `c1f8368` | Added project devlopment logbook |
| 2026-01-18 | `1e27270` | Add project context and development details to README |
| 2026-01-18 | `747c25a` | Completed board and list controller and APIs |
| 2025-12-27 | `e3ef7de` | feat: Completed data models and database setup |

## Keeping this doc current

The README's Development Roadmap and `git log` are the sources; this doc mirrors them.

1. New planned item: add a row to Planned work with Status set to Planned.
2. Work starts: set its Status to In progress.
3. Work lands: set Status to Done, add a row to Committed work with its commit hashes, and add the commits to the Changelog.
4. Update the Summary counts and the as-of date at the top.
