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
 *   getAllCards, createCard, deleteCard — raw async HTTP functions (cardService.js)
 *   useCards                           — hook: fetches cards for a list and
 *                                        exposes create/delete mutations
 *   Cards                              — component: renders a list of card items
 */

/* API service layer — raw async CRUD functions for the /api/cards resource. */
export * from './api/cardService';

/* Hooks — React hooks that wrap the service layer with local state management. */
export * from './hooks/useCards';

/* Components — presentational components for the cards feature. */
export { default as Cards } from './components/Cards';
