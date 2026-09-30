/**
 * @file useBoardDetails.js
 * @description Custom React hook for fetching a single board's metadata by ID.
 *
 * Abstracts the data-fetching lifecycle for one board record away from UI
 * components. Used by BoardDetailPage to load the board name displayed in the
 * page header.
 *
 * Consumed by:
 *   - BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *
 * Depends on:
 *   - getBoardById (src/features/boards/api/boardService.js)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect, useState — React hooks for side-effects and local state.
 * getBoardById        — service function that calls GET /api/boards/<id>.
 */
import { useCallback, useEffect, useState } from "react";
import { getBoardById } from "../api/boardService";

/**
 * Custom hook that fetches a single board by ID and exposes loading/error state.
 *
 * The fetch is re-triggered whenever `id` changes, ensuring the correct board
 * is always displayed when navigating between boards without a page reload.
 *
 * @param {number} id - The numeric primary key of the board to fetch.
 * @returns {{
 *   board:   Object|null,
 *   loading: boolean,
 *   error:   string|null,
 *   reload:  Function
 * }} An object containing:
 *   - `board`   — The fetched board object (`{ id, name, ... }`), or `null`
 *                 before the first successful fetch.
 *   - `loading` — `true` while the HTTP request is in-flight.
 *   - `error`   — `null` on success; the error message string if the fetch fails.
 *   - `reload`  — Re-runs the fetch, e.g. from a Retry button after a failure.
 */
export function useBoardDetails(id) {
	/*
	 * State
	 * ─────────────────────────────────────────────────────────────────────
	 * board   — the fetched board object; null until the first successful fetch.
	 * loading — true while the request is in-flight.
	 * error   — null on success; error message string on failure.
	 */
	const [board, setBoard] = useState(null);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/* Bumped by `reload` to re-run the fetch effect (see useBoards). */
	const [reloadKey, setReloadKey] = useState(0);
	const reload = useCallback(() => setReloadKey(key => key + 1), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is read only as a trigger — bumping it via `reload` re-runs the fetch.
	useEffect(() => {
		/*
		 * The `cancelled` flag drops a late response from a previous board, so
		 * navigating quickly between boards can't show the wrong name.
		 */
		let cancelled = false;

		/*
		 * fetchBoard is defined as an inner async function because useEffect
		 * callbacks must not be async themselves (they must return either nothing
		 * or a cleanup function, not a Promise).
		 */
		const fetchBoard = async () => {
			const response = await getBoardById(id);
			if (!cancelled) setBoard(response.data);
		};

		/*
		 * Reset on each re-run (id change or reload), so a previous failure
		 * doesn't outlive the fetch that replaced it.
		 */
		setLoading(true);
		setError(null);

		fetchBoard()
			.catch(err => { if (!cancelled) setError(err.message); })
			.finally(() => { if (!cancelled) setLoading(false); });

		return () => { cancelled = true; };
	}, [id, reloadKey]); /* Re-run whenever the board ID changes or on reload. */

	return { board, loading, error, reload };
}
