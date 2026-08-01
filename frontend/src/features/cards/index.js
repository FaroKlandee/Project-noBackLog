/**
 * @fileoverview Public barrel file for the cards feature module.
 *
 * The single, authoritative entry point for everything cards-related.
 * Consumers import from `features/cards` rather than reaching into internal
 * sub-folders:
 *
 *   import { useCards, Cards }              from '../../cards';
 *   import { getAllCards, createCard }       from '../../cards';
 *
 * Exported surface:
 *   getAllCards,
 *   getAllCardsByBoard,
 *   createCard, deleteCard,
 *   reorderCard              — raw async HTTP functions (cardService.js)
 *   useCards                 — hook: fetches cards for a *single* list and
 *                              exposes create/delete mutations. Currently unused
 *                              — superseded by useBoardCards when card state was
 *                              lifted to the board level for cross-list drag.
 *                              Retained for any future single-list view.
 *   useBoardCards            — hook: fetches every card on a board in one
 *                              request into a record keyed by list ID, and
 *                              exposes create/delete/reorder mutations. Required
 *                              for cross-list drag-and-drop, which needs a
 *                              single owner able to see both the source and
 *                              destination list's cards.
 *   Cards                    — component: renders a list of card items
 *   generateRank             — util: computes a card's position rank so it
 *                              sorts between two given neighbors (or past one
 *                              end, when a neighbor is omitted)
 */

/* API service layer — raw async CRUD functions for the /api/cards resource. */
export * from './api/cardService';

/* Hooks — React hooks that wrap the service layer with local state management. */
export * from './hooks/useCards';
export * from './hooks/useBoardCards';

/* Utils — pure helpers shared by the hooks above and by page-level drag handlers. */
export * from './utils/rank';

/* Components — presentational components for the cards feature. */
export { default as Cards } from './components/Cards';
