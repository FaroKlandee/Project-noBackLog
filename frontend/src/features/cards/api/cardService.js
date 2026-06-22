/**
 * @fileoverview Card service — HTTP operations for the /api/cards resource.
 *
 * Each function is a thin async wrapper around the shared `api` client
 * (shared/api/api.js). On success the raw parsed JSON response object is
 * returned to the caller. On failure the error is propagated so the calling
 * hook can handle it.
 *
 * Consumed primarily by the `useCards` hook (features/cards/hooks/useCards.js).
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
 * Fetch all cards that belong to a specific list.
 *
 * Calls `GET /api/cards?listId=<listId>`. The server filters and returns only
 * those cards whose `listId` foreign key matches the supplied value.
 *
 * @async
 * @param {number|string} listId - The unique identifier of the list whose
 *   cards should be retrieved. Passed as a query-string parameter.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: Card[] }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getAllCards(listId) {
	return await api.get(`/api/cards?listId=${listId}`);
}

/**
 * Create a new card on the server.
 *
 * Calls `POST /api/cards/` with a JSON body. The server assigns a unique ID
 * and returns the created card so the caller can update local state without
 * a follow-up GET.
 *
 * Expected payload shape: `{ title: "Card title", priority: "Medium", listId: 3 }`
 *
 * @async
 * @param {Object} data - Fields for the new card (title, priority, listId, etc.).
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: Card }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function createCard(data) {
	return await api.post(`/api/cards/`, data);
}

/**
 * Permanently delete a card by its unique identifier.
 *
 * Calls `DELETE /api/cards/<id>`. Destructive and irreversible.
 *
 * @async
 * @param {number|string} id - The unique identifier of the card to delete.
 * @returns {Promise<Object>} Parsed JSON response (typically a confirmation message).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function deleteCard(id) {
	return await api.delete(`/api/cards/${id}`);
}

/* Exports */
export { getAllCards, createCard, deleteCard };
