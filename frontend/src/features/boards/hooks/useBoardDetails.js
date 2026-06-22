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
import { useEffect, useState } from "react";
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
 *   error:   string|null
 * }} An object containing:
 *   - `board`   — The fetched board object (`{ id, name, ... }`), or `null`
 *                 before the first successful fetch.
 *   - `loading` — `true` while the HTTP request is in-flight.
 *   - `error`   — `null` on success; the error message string if the fetch fails.
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

	useEffect(() => {
		/*
		 * fetchBoard is defined as an inner async function because useEffect
		 * callbacks must not be async themselves (they must return either nothing
		 * or a cleanup function, not a Promise).
		 */
		const fetchBoard = async () => {
			const response = await getBoardById(id);
			setBoard(response.data);
		};

		/* Reset loading to true on each re-run (e.g. when id changes). */
		setLoading(true);

		fetchBoard()
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));

	}, [id]); /* Re-run whenever the board ID changes. */

	return { board, loading, error };
}
