/**
 * @fileoverview Public barrel file for the boards feature module.
 *
 * The single, authoritative entry point for everything boards-related.
 * Consumers import from `features/boards` and never reach into internal
 * sub-folders directly:
 *
 *   import { useBoards, useBoardDetails, Boards } from '../features/boards';
 *   import { getAllBoards, createBoard }           from '../features/boards';
 *
 * Exported surface:
 *   getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard
 *                             — raw async HTTP functions (boardService.js)
 *   useBoards                 — hook: fetches all boards with loading/error state
 *   useBoardDetails           — hook: fetches a single board by ID
 *   Boards                    — component: responsive board grid with traffic-light guards
 */

/* API service layer — raw async CRUD functions for the /api/boards resource. */
export * from './api/boardService';

/* Hooks — React hooks that wrap the service layer with local state management. */
export * from './hooks/useBoards';
export * from './hooks/useBoardDetails';

/* Components — presentational and container components for the boards feature. */
export { default as Boards } from './components/Boards';
