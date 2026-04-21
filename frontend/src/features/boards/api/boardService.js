/**
 * @fileoverview Board Service — API layer for all board-related HTTP operations.
 *
 * This module is the single point of contact between the boards feature and the
 * backend REST API. Every function here maps 1-to-1 to a backend endpoint and
 * wraps the shared `api` client so that the rest of the application never has
 * to construct URLs or handle raw fetch logic directly.
 *
 * All functions are async and follow the same pattern:
 *   - Issue the request through the shared `api` client.
 *   - Return the resolved response on success.
 *   - Log the error to the console on failure (silent fail — callers receive
 *     `undefined` when an error occurs, so callers / hooks should guard for
 *     that case).
 */

/**
 * Shared API client instance.
 *
 * Wraps the native `fetch` API with a base URL, a request timeout, JSON
 * serialisation/deserialisation, and unified error handling.  Exposes four
 * convenience methods: `get`, `post`, `put`, and `delete`.
 *
 * Imported from the shared layer so that every feature uses the same
 * configuration rather than constructing its own fetch calls.
 *
 * @see src/shared/api/api.js
 */
import api from '../../../shared/api/api';

// ---------------------------------------------------------------------------
// READ operations
// ---------------------------------------------------------------------------

/**
 * Fetches every board that exists in the system.
 *
 * Calls `GET /api/boards/` and returns the full list of board objects as
 * parsed JSON.  Intended to be used
 by list views and dashboard components
 * that need to display all available boards at once.
 *
 * @async
 * @function getAllBoards
 * @returns {Promise<Object[]|undefined>} A promise that resolves to an array
 *   of board objects returned by the API, or `undefined` if the request
 *   fails (error is logged to the console).
 *
 * @example
 * const boards = await getAllBoards();
 * if (boards) {
 *   console.log(`Loaded ${boards.length} boards`);
 * }
 */
async function getAllBoards() {
	try {
		// Issue a GET request to the boards collection endpoint and return the
		// parsed JSON response directly to the caller.
		return await api.get('/api/boards/');
	} catch (error) {
		// Log the error without re-throwing so the app degrades gracefully.
		// The caller will receive `undefined` and should handle that case.
		console.error(`${error}`);
	}
}

/**
 * Fetches a single board by its unique identifier.
 *
 * Calls `GET /api/boards/:id` and returns the matching board object.
 * Intended to be used by detail/board views that need to render a specific
 * board and its associated data (columns, cards, etc.).
 *
 * @async
 * @function getBoardById
 * @param {string|number} id - The unique identifier of the board to retrieve.
 *   Injected directly into the URL path, so it should be a valid board ID
 *   as stored in the backend (typically a numeric primary key or UUID).
 * @returns {Promise<Object|undefined>} A promise that resolves to the board
 *   object, or `undefined` if the request fails.
 *
 * @example
 * const board = await getBoardById(42);
 * if (board) {
 *   console.log(board.name);
 * }
 */
async function getBoardById(id) {
	try {
		// Interpolate the board ID into the path to target the correct resource.
		return await api.get(`/api/boards/${id}`);
	} catch (error) {
		console.error(`${error}`);
	}
}

// ---------------------------------------------------------------------------
// WRITE operations
// ---------------------------------------------------------------------------

/**
 * Creates a new board with the supplied payload.
 *
 * Calls `POST /api/boards/` with `data` serialised as JSON in the request
 * body.  The backend is expected to validate the payload, persist the new
 * board, and return the created board object (including its generated `id`).
 *
 * @async
 * @function createBoard
 * @param {Object} data - The board creation payload.
 * @param {string} data.name - The display name for the new board.
 * @returns {Promise<Object|undefined>} A promise that resolves to the newly
 *   created board object as returned by the API, or `undefined` on failure.
 *
 * @example
 * const newBoard = await createBoard({ name: 'Sprint 1' });
 * if (newBoard) {
 *   console.log(`Created board with ID: ${newBoard.id}`);
 * }
 */
async function createBoard(data) {
	try {
		// POST the new board payload to the collection endpoint.
		// The shared api client serialises `data` to JSON automatically.
		return await api.post('/api/boards/', data);
	} catch (error) {
		console.error(`${error}`);
	}
}

/**
 * Replaces (full update) an existing board's data.
 *
 * Calls `PUT /api/boards/:id` with `data` as the request body.  A PUT
 * request semantically replaces the entire resource, so `data` should
 * contain all fields the backend expects, not just the changed ones.
 * For partial updates a PATCH endpoint would be more appropriate, but the
 * current backend uses PUT.
 *
 * @async
 * @function updateBoard
 * @param {string|number} id   - The unique identifier of the board to update.
 * @param {Object}        data - The replacement payload for the board.
 * @param {string}        data.name - The updated display name of the board.
 * @returns {Promise<Object|undefined>} A promise that resolves to the updated
 *   board object as returned by the API, or `undefined` on failure.
 *
 * @example
 * const updated = await updateBoard(42, { name: 'Sprint 2' });
 * if (updated) {
 *   console.log(`Board renamed to: ${updated.name}`);
 * }
 */
async function updateBoard(id, data) {
	try {
		// Target the specific board by ID and send the full updated payload.
		return await api.put(`/api/boards/${id}`, data);
	} catch (error) {
		console.error(`${error}`);
	}
}

// ---------------------------------------------------------------------------
// DELETE operations
// ---------------------------------------------------------------------------

/**
 * Permanently deletes a board from the system.
 *
 * Calls `DELETE /api/boards/:id`.  This action is destructive and
 * irreversible — the backend is expected to cascade-delete any related
 * resources (columns, cards, etc.) that belong to the board.  Callers
 * should present a confirmation dialog to the user before invoking this.
 *
 * @async
 * @function deleteBoard
 * @param {string|number} id - The unique identifier of the board to delete.
 * @returns {Promise<Object|undefined>} A promise that resolves to the
 *   backend's deletion confirmation response (structure depends on the API),
 *   or `undefined` if the request fails.
 *
 * @example
 * await deleteBoard(42);
 * // Board 42 no longer exists in the backend.
 */
async function deleteBoard(id) {
	try {
		// Target the specific board by ID and issue the DELETE request.
		return await api.delete(`/api/boards/${id}`);
	} catch (error) {
		console.error(`${error}`);
	}
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

/**
 * Named exports for all board service functions.
 *
 * Exported individually (rather than as a default object) so that consumers
 * can import only the functions they need, keeping bundle sizes smaller and
 * making import intent explicit.
 *
 * Re-exported from `features/boards/index.js` as part of the feature's
 * public API surface.
 */
export { getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard };