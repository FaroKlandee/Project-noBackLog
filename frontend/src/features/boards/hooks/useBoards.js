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
import { useEffect, useState } from 'react';
import { getAllBoards } from '../api/boardService';

/**
 * Custom hook that fetches all boards on mount and exposes loading/error state.
 *
 * @returns {{
 *   boards:  Array<Object>,
 *   loading: boolean,
 *   error:   string|null
 * }} An object containing:
 *   - `boards`  — Array of board objects returned by the API. Empty array
 *                 before the fetch completes.
 *   - `loading` — `true` while the HTTP request is in-flight.
 *   - `error`   — `null` on success; the error message string if the fetch fails.
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

	useEffect(() => {
		/*
		 * fetchBoards is defined as an inner async function because useEffect
		 * callbacks must not be async themselves.
		 */
		const fetchBoards = async () => {
			const response = await getAllBoards();
			setBoards(response.data);
		};

		fetchBoards()
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));

	}, []); /* Empty dependency array — fetch runs once on mount. */

	return { boards, loading, error };
}
