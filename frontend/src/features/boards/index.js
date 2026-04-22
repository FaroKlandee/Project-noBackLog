/**
 * @file index.js
 * @description Public API barrel file for the "boards" feature module.
 *
 * This file acts as the single, canonical entry point through which the rest
 * of the application consumes anything related to boards. By importing from
 * this file (rather than from individual sub-paths), consumers are decoupled
 * from the internal folder structure of the feature. If a file is moved or
 * refactored internally, only this barrel needs updating — not every import
 * site across the codebase.
 *
 * Typical usage from outside the feature:
 *   import { Boards, useBoards, getAllBoards } from 'features/boards';
 */

/*
 * Service layer — async functions that communicate with the boards REST API.
 * Re-exports: getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard
 */
export * from './api/boardService';

/*
 * Custom hooks — React hooks that encapsulate boards-related state and side
 * effects, built on top of the service layer.
 * Re-exports: useBoards
 */
export * from './hooks/useBoards';

/*
 * UI Components — React components that render boards-related views.
 *
 * `Boards` is exported under its own name via a named alias because it is a
 * default export in its source file. Using `export { default as Boards }`
 * converts it into a named export so that it can be cleanly destructured
 * alongside the other named exports above.
 * Re-exports: Boards
 */
export { default as Boards } from './components/Boards';