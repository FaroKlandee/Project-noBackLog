/**
 * @fileoverview Board service — HTTP operations for the /api/boards resource.
 *
 * Each function is a thin async wrapper around the shared `api` client
 * (shared/api/api.js). On success the raw parsed JSON response object is
 * returned to the caller. On failure the error is logged to the console and
 * re-thrown so the calling hook or component can handle it.
 *
 * Consumed primarily by the `useBoards` and `useBoardDetails` hooks.
 */

/*
 * Import
 * ───────────────────────────────────────────────────────────────────────────
 * api — shared HTTP client that prefixes every path with the backend base URL,
 *       sets Content-Type: application/json, enforces a 5 s timeout, and throws
 *       on non-2xx responses.
 */
import api from '../../../shared/api/api';

/* ── Read ─────────────────────────────────────────────────────────────────── */

/**
 * Fetch every board from the backend.
 *
 * Calls `GET /api/boards/`. Returns all board records without filtering.
 * Used by the `useBoards` hook to populate the boards listing page.
 *
 * @async
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: Board[] }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getAllBoards() {
	try {
		return await api.get('/api/boards/');
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/**
 * Fetch a single board by its unique identifier.
 *
 * Calls `GET /api/boards/<id>`. Used by the `useBoardDetails` hook to load
 * board metadata (e.g. name) for the BoardDetailPage header.
 *
 * @async
 * @param {number|string} id - The unique identifier of the board to fetch.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: Board }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getBoardById(id) {
	try {
		return await api.get(`/api/boards/${id}`);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/* ── Write ────────────────────────────────────────────────────────────────── */

/**
 * Create a new board on the server.
 *
 * Calls `POST /api/boards/` with a JSON body. The server assigns a unique ID
 * and returns the created board so the caller can update local state without
 * a follow-up GET.
 *
 * @async
 * @param {Object} data - Fields for the new board (e.g. `{ name: 'Sprint 1' }`).
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: Board }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function createBoard(data) {
	try {
		return await api.post('/api/boards/', data);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/**
 * Update an existing board by its unique identifier.
 *
 * Calls `PUT /api/boards/<id>` with a JSON body containing the updated fields.
 * PUT semantics — include all relevant fields, not just changed ones.
 *
 * @async
 * @param {number|string} id   - The unique identifier of the board to update.
 * @param {Object}        data - Updated board fields (e.g. `{ name: 'Q2 Sprint' }`).
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: Board }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function updateBoard(id, data) {
	try {
		return await api.put(`/api/boards/${id}`, data);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

/**
 * Permanently delete a board by its unique identifier.
 *
 * Calls `DELETE /api/boards/<id>`. Destructive and irreversible — the server
 * may cascade-delete all lists and cards belonging to the board.
 *
 * @async
 * @param {number|string} id - The unique identifier of the board to delete.
 * @returns {Promise<Object>} Parsed JSON response (typically a confirmation message).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function deleteBoard(id) {
	try {
		return await api.delete(`/api/boards/${id}`);
	} catch (error) {
		console.error(`${error}`);
		throw error;
	}
}

export { getAllBoards, getBoardById, createBoard, updateBoard, deleteBoard };
