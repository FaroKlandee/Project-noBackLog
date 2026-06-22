/**
 * @fileoverview Public barrel file for the lists feature module.
 *
 * The single, authoritative entry point for everything lists-related.
 * Consumers import from `features/lists` rather than reaching into internal
 * sub-folders:
 *
 *   import { useLists, Lists, ListColumn }         from '../features/lists';
 *   import { getAllLists, createList, reorderLists } from '../features/lists';
 *
 * Exported surface:
 *   getAllLists, getListById, createList,
 *   updateList, deleteList, reorderLists — raw async HTTP functions (listService.js)
 *   useLists                            — hook: fetches lists for a board and
 *                                         exposes create/delete/reorder mutations
 *   Lists                               — component: horizontally-scrollable row
 *                                         of list columns + "add new list" form
 *   ListColumn                          — component: single Kanban column with
 *                                         cards and an inline add-card form
 */

/* API service layer — raw async CRUD functions for the /api/lists resource. */
export * from './api/listService';

/* Hooks — React hooks that wrap the service layer with local state management. */
export * from './hooks/useLists';

/* Components — container and presentational components for the lists feature. */
export { default as Lists } from './components/Lists';
export { default as ListColumn } from './components/ListColumn';
