/**
 * @fileoverview List service — HTTP operations for the /api/lists resource.
 *
 * Every function in this module is a thin, async wrapper around the shared
 * `api` client (`shared/api/api.js`).  Each wrapper follows the same
 * try/catch pattern:
 *   - on success  → returns the parsed JSON response object from the server
 *   - on failure  → logs the error to the console and re-throws
 *
 * The module is consumed primarily by the `useLists` hook and can also be
 * imported directly via the lists feature barrel (`features/lists/index.js`).
 */

/**
 * Shared HTTP client.
 *
 * `api` is a thin facade over the native `fetch` API defined in
 * `shared/api/api.js`.  It exposes four methods that map 1-to-1 to HTTP
 * verbs:  api.get · api.post · api.put · api.delete
 *
 * The client automatically:
 *   - prefixes every path with the base URL (http://localhost:5000)
 *   - sets the `Content-Type: application/json` header on every request
 *   - aborts requests that exceed the configured timeout (5 000 ms)
 *   - throws an `Error` for any non-2xx HTTP status code
 */
import api from '../../../shared/api/api';

/*
 * ---------------------------------------------------------------------------
 * READ operations
 * ---------------------------------------------------------------------------
 */

/**
 * Fetch every list that belongs
 to a specific board.
 *
 * Calls `GET /api/lists?boardId=<boardId>`.  The server is expected to filter
 * its list collection and return only those records whose `boardId` foreign
 * key matches the supplied value.
 *
 * This is the primary way lists are loaded — always scoped to a single board
 * so that the client never has to download the entire lists table at once.
 *
 * @async
 * @param {number|string} boardId - The unique identifier of the board whose
 *   lists should be retrieved.  Passed as a query-string parameter so the
 *   server can filter server-side.
 * @returns {Promise<Object|undefined>} Resolves with the raw response object
 *   returned by the `api` client (typically `{ data: List[] }`) on success,
 *   or `undefined` if the request fails.
 */
async function getAllLists(boardId) {
	try {
		/*
		 * Append boardId as a query-string parameter so the server can scope
		 * the result set to only the lists belonging to this board.
		 */
		return await api.get(`/api/lists?boardId=${boardId}`)
	} catch (error) {
		/*
		 * Log the error for debugging, then re-throw the original error so
		 * callers can inspect the message and handle it appropriately.
		 */
		console.error(`${error}`);
		throw error;
	}
}

/**
 * Fetch a single list by its unique identifier.
 *
 * Calls `GET /api/lists/<id>`.  Useful when a component needs full detail
 * for one specific list without re-fetching all lists on the board, e.g.
 * when navigating directly to a list detail view or refreshing a single card
 * column after an update.
 *
 * @async
 * @param {number|string} id - The unique identifier of the list to retrieve.
 *   Embedded directly in the URL path as a REST resource identifier.
 * @returns {Promise<Object|undefined>} Resolves with the raw response object
 *   returned by the `api` client (typically `{ data: List }`) on success,
 *   or `undefined` if the request fails.
 */
async function getListById(id) {
	try {
		/*
		 * Use a path parameter (/:id) to target the exact list resource.
		 */
		return await api.get(`/api/lists/${id}`);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/*
 * ---------------------------------------------------------------------------
 * WRITE operations
 * ---------------------------------------------------------------------------
 */

/**
 * Create a new list on the server.
 *
 * Calls `POST /api/lists/` with a JSON body containing the new list's data.
 * The server is responsible for assigning a unique `id` and persisting the
 * record.  The created list object is returned in the response so the caller
 * can immediately update local state without a follow-up GET.
 *
 * Typical payload shape: { name: "To Do", boardId: 3, position: 0 }
 *
 * @async
 * @param {Object} data - Plain object containing the fields for the new list.
 *   At minimum this should include `name` and `boardId`.
 * @returns {Promise<Object|undefined>} Resolves with the raw response object
 *   returned by the `api` client (typically `{ data: List }`) on success,
 *   or `undefined` if the request fails.
 */
async function createList(data) {
	try {
		/*
		 * POST to the collection endpoint; `data` is serialised to JSON by the
		 * shared api client before being sent in the request body.
		 */
		return await api.post('/api/lists/', data);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/**
 * Update an existing list by its unique identifier.
 *
 * Calls `PUT /api/lists/<id>` with a JSON body containing the fields to be
 * updated.  PUT semantics mean the server may treat this as a full replacement
 * of the resource, so callers should include all relevant fields — not just
 * the ones that changed — unless the backend explicitly supports partial
 * updates via PATCH.
 *
 * Common use-cases:
 *   - Renaming a list column
 *   - Reordering lists on a board (updating the `position` field)
 *
 * @async
 * @param {number|string} id   - The unique identifier of the list to update.
 *   Embedded in the URL path to target the exact resource.
 * @param {Object}        data - Plain object containing the updated list
 *   fields, e.g. `{ name: "In Review", position: 2 }`.
 * @returns {Promise<Object|undefined>} Resolves with the raw response object
 *   returned by the `api` client (typically `{ data: List }`) on success,
 *   or `undefined` if the request fails.
 */
async function updateList(id, data) {
	try {
		/*
		 * Pass both the path parameter (which list) and the request body
		 * (what to change) to the api client's PUT method.
		 */
		return await api.put(`/api/lists/${id}`, data);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/**
 * Permanently delete a list by its unique identifier.
 *
 * Calls `DELETE /api/lists/<id>`.  This is a destructive, irreversible
 * operation — the server is expected to remove the list record and, depending
 * on backend cascade rules, may also delete all cards that belong to it.
 *
 * Callers should confirm the action with the user before invoking this
 * function.
 *
 * @async
 * @param {number|string} id - The unique identifier of the list to delete.
 *   Embedded in the URL path to target the exact resource.
 * @returns {Promise<Object|undefined>} Resolves with the raw response object
 *   returned by the `api` client (often an empty body or a confirmation
 *   message) on success, or `undefined` if the request fails.
 */
async function deleteList(id) {
	try {
		/*
		 * DELETE requests carry no body; the resource to remove is identified
		 * solely by the path parameter.
		 */
		return await api.delete(`/api/lists/${id}`);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/*
 * ---------------------------------------------------------------------------
 * Exports
 * ---------------------------------------------------------------------------
 */

/**
 * Named exports for all list service functions.
 *
 * Exported individually (rather than as a default object) so that consumers
 * can import only what they need and so that the barrel file
 * (`features/lists/index.js`) can re-export them with a simple `export *`.
 *
 * Usage examples:
 *   import { getAllLists, createList } from '../api/listService';
 *   import { getAllLists } from '../../lists';           // via barrel
 */
export { getAllLists, getListById, createList, updateList, deleteList };