/**
 * @file index.js
 * @description Public barrel file for the `lists` feature module.
 *
 * This file acts as the single, stable entry point for everything the `lists`
 * feature exposes to the rest of the application. Consumers should always
 * import from this barrel (e.g. `import { useLists } from 'features/lists'`)
 * rather than reaching into sub-folders directly. This keeps internal file
 * organisation free to change without touching every import site across the
 * codebase.
 *
 * Exported surface area
 * ─────────────────────
 * • listService  – raw async CRUD functions that talk to the REST API
 *                  (getAllLists, getListById, createList, updateList, deleteList)
 * • useLists     – React hook that fetches all lists for a given board and
 *                  tracks loading / error state for the calling component
 *
 * @module features/lists
 */

// Re-export every named export from the lists API service layer.
// This surfaces the raw async functions (getAllLists, getListById, createList,
// updateList, deleteList) so that non-React code (e.g. route loaders, tests,
// or other services) can call the API without going through a hook.
export * from './api/listService';

// Re-export every named export from the lists custom-hook layer.
// Currently this exposes `useLists`, the primary React hook components use to
// fetch and subscribe to the list data for a specific board.
export * from './hooks/useLists';

// Re-export the Lists presentational component as a named export.
// `Lists` accepts a `lists` prop and is responsible only for rendering —
// it does not fetch data itself.
export { default as Lists } from './components/Lists';