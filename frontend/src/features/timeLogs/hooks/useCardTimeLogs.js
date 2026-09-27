/**
 * @fileoverview useCardTimeLogs — time-log state for a single card.
 *
 * Fetches a card's time logs, the server's time-tracking settings, and every
 * timer running app-wide whenever `cardId` changes, and exposes start /
 * finish / remove mutations. The app-wide running list is refetched after each
 * mutation, since the global running-timer cap depends on every card. Mutations
 * are pessimistic (mirroring useBoardCards' submitUpdateCard): each awaits the
 * server, merges the canonical response into local state, and rethrows on
 * failure so the calling component can show the error inline.
 *
 * Consumed by TimeLogSection (features/timeLogs/components/TimeLogSection.jsx).
 */

import { useEffect, useState } from 'react';

import {
	deleteTimeLog,
	finishTimeLog,
	getRunningTimers,
	getTimeLogSettings,
	getTimeLogsByCard,
	startTimeLog,
} from '../api/timeLogService';

/**
 * @param {number|null} cardId - The card to load, or null (nothing is fetched).
 * @returns {{
 *   logs: Object[],
 *   maxEntries: number|null,
 *   maxRunning: number|null,
 *   runningElsewhere: Object[],
 *   isLoading: boolean,
 *   error: string|null,
 *   running: Object|null,
 *   atLimit: boolean,
 *   globalAtLimit: boolean,
 *   totalMs: number,
 *   start: () => Promise<void>,
 *   finish: (id: number) => Promise<void>,
 *   remove: (id: number) => Promise<void>,
 * }}
 *   logs       — the card's time logs, oldest first.
 *   maxEntries — server-side cap on entries per card (null until loaded).
 *   running    — the entry with no `endTime`, if any (at most one per card).
 *   maxRunning — server-side cap on timers running at once across all cards.
 *   runningElsewhere — timers running on *other* cards: `{ id, cardId, cardTitle, startTime }`.
 *   atLimit    — true once the card holds `maxEntries` entries (running included).
 *   globalAtLimit — true once `maxRunning` timers are running app-wide.
 *   totalMs    — summed duration of every finished entry.
 */
export function useCardTimeLogs(cardId) {
	const [logs, setLogs] = useState([]);
	const [maxEntries, setMaxEntries] = useState(null);
	const [maxRunning, setMaxRunning] = useState(null);
	const [runningAll, setRunningAll] = useState([]);
	const [isLoading, setIsLoading] = useState(false);
	const [error, setError] = useState(null);

	/*
	 * Reload whenever a different card opens. The `ignore` flag drops a slow
	 * response for a previous card so it can't overwrite the current one.
	 */
	useEffect(() => {
		if (cardId == null) return;
		let ignore = false;

		setLogs([]);
		setError(null);
		setIsLoading(true);

		Promise.all([getTimeLogsByCard(cardId), getTimeLogSettings(), getRunningTimers()])
			.then(([logsResponse, settingsResponse, runningResponse]) => {
				if (ignore) return;
				setLogs(logsResponse.data);
				setMaxEntries(settingsResponse.data.maxEntriesPerCard);
				setMaxRunning(settingsResponse.data.maxRunningTimers);
				setRunningAll(runningResponse.data);
			})
			.catch((err) => {
				if (!ignore) setError(err.message);
			})
			.finally(() => {
				if (!ignore) setIsLoading(false);
			});

		return () => {
			ignore = true;
		};
	}, [cardId]);

	const running = logs.find((log) => log.endTime == null) ?? null;
	const atLimit = maxEntries != null && logs.length >= maxEntries;
	const globalAtLimit = maxRunning != null && runningAll.length >= maxRunning;
	const runningElsewhere = runningAll.filter((timer) => timer.cardId !== cardId);
	const totalMs = logs.reduce((sum, log) => (log.endTime ? sum + log.duration : sum), 0);

	/*
	 * Refresh the app-wide running list after a mutation. Best-effort: the
	 * mutation itself already succeeded, and the server enforces the cap anyway.
	 */
	async function refreshRunning() {
		try {
			const response = await getRunningTimers();
			setRunningAll(response.data);
		} catch {
			/* Stale list only affects the Start button hint; ignore. */
		}
	}

	async function start() {
		const response = await startTimeLog(cardId);
		setLogs((prev) => [...prev, response.data]);
		await refreshRunning();
	}

	async function finish(id) {
		const response = await finishTimeLog(id);
		setLogs((prev) => prev.map((log) => (log.id === id ? response.data : log)));
		await refreshRunning();
	}

	async function remove(id) {
		await deleteTimeLog(id);
		setLogs((prev) => prev.filter((log) => log.id !== id));
		await refreshRunning();
	}

	return {
		logs,
		maxEntries,
		maxRunning,
		runningElsewhere,
		isLoading,
		error,
		running,
		atLimit,
		globalAtLimit,
		totalMs,
		start,
		finish,
		remove,
	};
}
