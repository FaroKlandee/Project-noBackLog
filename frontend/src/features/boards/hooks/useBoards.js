/**
 * @file useBoards.js
 * @description Custom React hook for fetching and managing the list of all boards.
 *
 * Abstracts the data-fetching lifecycle away from UI components so they only
 * need to consume the returned state values.
 *
 * Consumed by:
 *   - Boards (src/features/boards/components/Boards.jsx)
 *
 * Depends on:
 *   - getAllBoards (src/features/boards/api/boardService.js)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect, useState — React hooks for side-effects and local state.
 * getAllBoards        — service function that calls GET /api/boards/.
 */
import { useCallback, useEffect, useState } from 'react';
import { getAllBoards } from '../api/boardService';

/**
 * Custom hook that fetches all boards on mount and exposes loading/error state.
 *
 * @returns {{
 *   boards:  Array<Object>,
 *   loading: boolean,
 *   error:   string|null,
 *   reload:  Function
 * }} An object containing:
 *   - `boards`  — Array of board objects returned by the API. Empty array
 *                 before the fetch completes.
 *   - `loading` — `true` while the HTTP request is in-flight.
 *   - `error`   — `null` on success; the error message string if the fetch fails.
 *   - `reload`  — Re-runs the fetch, e.g. from a Retry button after a failure.
 */
export function useBoards() {
	/*
	 * State
	 * ─────────────────────────────────────────────────────────────────────
	 * boards  — the fetched boards array; empty until the first successful fetch.
	 * loading — true while the request is in-flight.
	 * error   — null on success; error message string on failure.
	 */
	const [boards, setBoards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/*
	 * Bumped by `reload` to re-run the fetch effect below. A counter rather
	 * than exposing the fetch function itself, so the effect stays the single
	 * owner of the request and its cancellation.
	 */
	const [reloadKey, setReloadKey] = useState(0);
	const reload = useCallback(() => setReloadKey(key => key + 1), []);

	// biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is read only as a trigger — bumping it via `reload` re-runs the fetch.
	useEffect(() => {
		/*
		 * The `cancelled` flag drops a response that resolves after unmount or
		 * after a newer reload has started.
		 */
		let cancelled = false;

		/*
		 * fetchBoards is defined as an inner async function because useEffect
		 * callbacks must not be async themselves.
		 */
		const fetchBoards = async () => {
			const response = await getAllBoards();
			if (!cancelled) setBoards(response.data);
		};

		setLoading(true);
		setError(null);

		fetchBoards()
			.catch(err => { if (!cancelled) setError(err.message); })
			.finally(() => { if (!cancelled) setLoading(false); });

		return () => { cancelled = true; };
	}, [reloadKey]); /* Runs on mount and again on every reload. */

	return { boards, loading, error, reload };
}
