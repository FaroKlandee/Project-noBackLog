/**
 * @fileoverview Barrel export file for the pages layer.
 *
 * This module re-exports all page-level components from a single entry point,
 * following the "barrel" pattern. Instead of importing each page directly from
 * its own file (e.g. `import BoardsPage from './BoardsPage'`), consumers can
 * import everything they need from this one file:
 *
 *   import { BoardsPage, BoardDetailPage } from '../pages';
 *
 * This keeps import statements in the rest of the app short and location-agnostic —
 * if a page file is ever moved or renamed, only this index needs to be updated.
 *
 * Pages in this app map 1-to-1 to top-level routes defined in `src/app/routes.jsx`.
 * Each page component is a thin layout wrapper that composes feature-level components
 * (e.g. `<Boards />`, `<Lists />`) and passes them any route-level data they need
 * (such as URL params).
 */

/**
 * BoardsPage — the "/boards" route.
 * Displays the full list of project boards available to the user.
 * Internally renders the `<Boards />` feature component, which fetches
 * and maps over the boards collection.
 *
 * @see ./BoardsPage
 */
export { default as BoardsPage } from './BoardsPage';

/**
 * BoardDetailPage — the "/boards/:boardId" route.
 * Displays the detail view for a single board, including all of its lists.
 * Reads the `boardId` URL parameter via `useParams` and passes it to the
 * `useLists` hook to load the corresponding data from the API.
 *
 * @see ./BoardDetailPage
 */
export { default as BoardDetailPage } from './BoardDetailPage';