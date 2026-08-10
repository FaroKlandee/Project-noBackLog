/**
 * @fileoverview List service — HTTP operations for the /api/lists resource.
 *
 * Each function is a thin async wrapper around the shared `api` client
 * (shared/api/api.js). On success the raw parsed JSON response object is
 * returned to the caller. On failure the error is propagated so the calling
 * hook can handle it.
 *
 * Consumed primarily by the `useLists` hook (features/lists/hooks/useLists.js).
 */

/*
 * Import
 * ───────────────────────────────────────────────────────────────────────────
 * api — shared HTTP client that prefixes every path with the backend base URL,
 *       sets Content-Type: application/json, enforces a 5 s timeout, and throws
 *       on non-2xx responses.
 */
import api from '../../../shared/api/api';

/**
 * Fetch every list that belongs to a specific board.
 *
 * Calls `GET /api/lists?boardId=<boardId>`. The server filters and returns only
 * those lists whose `boardId` foreign key matches the supplied value, ordered
 * by their `position` field.
 *
 * @async
 * @param {number|string} boardId - The unique identifier of the board whose
 *   lists should be retrieved. Passed as a query-string parameter.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: List[] }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getAllLists(boardId) {
	return await api.get(`/api/lists?boardId=${boardId}`);
}

/**
 * Fetch a single list by its unique identifier.
 *
 * Calls `GET /api/lists/<id>`. Useful when a component needs full detail for
 * one specific list without re-fetching all lists on the board.
 *
 * @async
 * @param {number|string} id - The unique identifier of the list to retrieve.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: List }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getListById(id) {
	return await api.get(`/api/lists/${id}`);
}

/**
 * Create a new list on the server.
 *
 * Calls `POST /api/lists/` with a JSON body. The server assigns a unique ID
 * and returns the created list so the caller can update local state without a
 * follow-up GET.
 *
 * Expected payload shape: `{ name: "To Do", boardId: 3, position: 0 }`
 *
 * @async
 * @param {Object} data - Fields for the new list (at minimum: `name`, `boardId`).
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: List }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function createList(data) {
	return await api.post('/api/lists/', data);
}

/**
 * Update an existing list by its unique identifier.
 *
 * Calls `PUT /api/lists/<id>` with a JSON body. PUT semantics — include all
 * relevant fields, not just the changed ones.
 *
 * @async
 * @param {number|string} id   - The unique identifier of the list to update.
 * @param {Object}        data - Updated list fields (e.g. `{ name: "In Review", position: 2 }`).
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: List }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function updateList(id, data) {
	return await api.put(`/api/lists/${id}`, data);
}

/**
 * Permanently delete a list by its unique identifier.
 *
 * Calls `DELETE /api/lists/<id>`. Destructive and irreversible — the server
 * may cascade-delete all cards belonging to the list.
 *
 * @async
 * @param {number|string} id - The unique identifier of the list to delete.
 * @returns {Promise<Object>} Parsed JSON response (typically a confirmation message).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function deleteList(id) {
	return await api.delete(`/api/lists/${id}`);
}

/**
 * Persist a new list order to the backend in a single PATCH call.
 *
 * Calls `PATCH /api/lists/reorder` with an ordered array of list IDs. The
 * server assigns each list a `position` value equal to its index in the array,
 * updating all affected rows in one database round-trip.
 *
 * Typically called after a drag-and-drop reorder to sync the optimistically
 * updated local state with the backend.
 *
 * @async
 * @param {number[]} data - Ordered array of list IDs representing the desired
 *   sequence (e.g. `[3, 1, 2]` sets list 3 to position 0, list 1 to position 1, etc.).
 * @returns {Promise<Object>} Parsed JSON response (typically a success confirmation).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function reorderLists(data) {
	return await api.patch(`/api/lists/reorder`, data);
}

/* Exports */
export { getAllLists, getListById, createList, updateList, deleteList, reorderLists };
