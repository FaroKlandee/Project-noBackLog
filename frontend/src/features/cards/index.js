/**
 * @fileoverview Public API barrel file for the cards feature.
 *
 * This is the single entry point for everything the cards feature exposes
 * to the rest of the application. Consumers should always import from this
 * file rather than reaching into sub-directories directly. Doing so keeps
 * internal implementation details (file layout, refactors, renames) hidden
 * behind a stable public interface.
 *
 * Typical usage from outside this feature:
 *
 *   import { createCard, deleteCard } from '../features/cards';
 *
 * Current exports
 * ───────────────
 *   cardService  – async CRUD helpers that talk to the /api/cards REST
 *                  endpoints via the shared `api` client.
 *
 * As the feature grows, additional exports (hooks, components, constants,
 * types …) should be added here so callers never need to change their
 * import paths.
 */

/*
 * Re-export every named export from the cards API service layer.
 * This includes functions such as getAllCards, getCardById, createCard,
 * updateCard, and deleteCard once they are implemented in cardService.js.
 */
export * from './api/cardService';

/*
 * Re-export every named export from the cards custom-hook layer.
 * Exposes `useCards`, the React hook components use to fetch and subscribe
 * to the card data for a specific list.
 */
export * from './hooks/useCards';

/*
 * Re-export the Cards presentational component as a named export.
 * `Cards` accepts a `cards` prop and is responsible only for rendering —
 * it does not fetch data itself.
 *
 * `export { default as Cards }` is required because Cards is a default export
 * in its source file — default exports cannot be picked up by `export *`,
 * so an explicit named alias is needed to include it in this barrel.
 */
export { default as Cards } from './components/Cards';