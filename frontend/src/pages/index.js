/**
 * @fileoverview Barrel export file for the pages layer.
 *
 * Re-exports every page component so that the rest of the application
 * (e.g. routes.jsx) can import from a single stable path rather than
 * reaching into individual page files:
 *
 *   import { BoardsPage, BoardDetailPage } from '../pages';
 *
 * Pages exported:
 *   BoardsPage      – Boards listing view, rendered at /boards.
 *   BoardDetailPage – Single-board detail view (lists + cards), rendered at
 *                     /boards/:boardId. Uses useLists and useBoardDetails.
 */

export { default as BoardsPage } from './BoardsPage';
export { default as BoardDetailPage } from './BoardDetailPage';
