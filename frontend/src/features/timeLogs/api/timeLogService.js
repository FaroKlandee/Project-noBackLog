/**
 * @fileoverview Time log service — HTTP operations for the /api/timelogs resource.
 *
 * Each function is a thin async wrapper around the shared `api` client
 * (shared/api/api.js). On success the raw parsed JSON response object is
 * returned to the caller. On failure the error is propagated so the calling
 * hook can handle it.
 *
 * Start and finish times are always stamped by the server — the client only
 * says *which* card to start and *which* entry to finish, never *when*.
 *
 * Consumed primarily by the `useCardTimeLogs` hook
 * (features/timeLogs/hooks/useCardTimeLogs.js).
 */

import api from '../../../shared/api/api';

/**
 * Fetch every time log for one card, oldest first.
 *
 * Calls `GET /api/timelogs?cardId=<cardId>`.
 *
 * @async
 * @param {number|string} cardId - The card whose time logs should be retrieved.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: TimeLog[] }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getTimeLogsByCard(cardId) {
	return await api.get(`/api/timelogs?cardId=${cardId}`);
}

/**
 * Fetch the server's time-tracking settings.
 *
 * Calls `GET /api/timelogs/settings`.
 *
 * @async
 * @returns {Promise<Object>} Parsed JSON response (typically
 *   `{ data: { maxEntriesPerCard: number, maxRunningTimers: number } }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getTimeLogSettings() {
	return await api.get('/api/timelogs/settings');
}

/**
 * Fetch every timer currently running, across all cards.
 *
 * Calls `GET /api/timelogs/running`. Used to enforce (in the UI) the global
 * cap on simultaneously running timers.
 *
 * @async
 * @returns {Promise<Object>} Parsed JSON response (typically
 *   `{ data: { id, cardId, cardTitle, startTime }[] }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function getRunningTimers() {
	return await api.get('/api/timelogs/running');
}

/**
 * Start a timer on a card.
 *
 * Calls `POST /api/timelogs/start`. The server stamps the start time and
 * rejects (409) if the card already has a running timer, the card has reached
 * its entry limit, or the global running-timer limit is reached.
 *
 * @async
 * @param {number|string} cardId - The card to start timing.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: TimeLog }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function startTimeLog(cardId) {
	return await api.post('/api/timelogs/start', { cardId });
}

/**
 * Finish a running timer.
 *
 * Calls `POST /api/timelogs/<id>/finish`. The server stamps the end time and
 * computes `duration` (ms); rejects (409) if the entry is already finished.
 *
 * @async
 * @param {number|string} id - The running time log to finish.
 * @returns {Promise<Object>} Parsed JSON response (typically `{ data: TimeLog }`).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function finishTimeLog(id) {
	return await api.post(`/api/timelogs/${id}/finish`);
}

/**
 * Permanently delete a time log.
 *
 * Calls `DELETE /api/timelogs/<id>`. Destructive and irreversible.
 *
 * @async
 * @param {number|string} id - The time log to delete.
 * @returns {Promise<Object>} Parsed JSON response (typically a confirmation message).
 * @throws {Error} On network failure, timeout, or non-2xx HTTP status.
 */
async function deleteTimeLog(id) {
	return await api.delete(`/api/timelogs/${id}`);
}

/* Exports */
export {
	getTimeLogsByCard,
	getTimeLogSettings,
	getRunningTimers,
	startTimeLog,
	finishTimeLog,
	deleteTimeLog,
};
