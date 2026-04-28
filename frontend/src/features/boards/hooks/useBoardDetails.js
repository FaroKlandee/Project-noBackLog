/**
 * @file useBoardDetails.js
 * @description Custom React hook for fetching and managing the details of a
 * single board by its ID. Mirrors the structure of `useBoards.js` but is
 * scoped to one board rather than the full collection.
 *
 * Consumed by:
 *   - Any component that needs to display a single board's metadata.
 *
 * Depends on:
 *   - getBoardById  (src/features/boards/api/boardService.js)
 *   - React's built-in `useState` and `useEffect` hooks
 */

import { useEffect, useState } from "react";

/*
 * getBoardById is the service function responsible for sending the HTTP GET
 * request that retrieves a single board by its numeric primary key.
 */
import { getBoardById } from "../api/boardService";

/**
 * @hook useBoardDetails
 *
 * A custom React hook that fetches a single board's details from the backend
 * API whenever the supplied `id` changes. Exposes the resulting board object,
 * a loading flag, and any fetch error to the calling component.
 *
 * @param {number} id - The numeric primary key of the board to fetch.
 *   Originates from the `:boardId` URL segment parsed by react-router's
 *   `useParams()` in the consuming page component.
 *
 * @returns {{ board: Object|null, loading: boolean, error: string|null }}
 *   - `board`   — The board object returned by the API, or null before load.
 *   - `loading` — true while the request is in-flight.
 *   - `error`   — null on success; the error message string on failure.
 *
 * @example
 * const { boardId } = useParams();
 * const { board, loading, error } = useBoardDetails(Number(boardId));
 *
 * if (loading) return <CircularProgress />;
 * if (error)   return <Alert severity="error">{error}</Alert>;
 * return <h1>{board.name}</h1>;
 */
export function useBoardDetails(id) {

	/*
	 * -------------------------------------------------------------------------
	 * State declarations
	 * -------------------------------------------------------------------------
	 */

	/*
	 * The board object fetched from the API.
	 * Initialised to null rather than [] because this hook fetches a single
	 * resource, not a collection — null clearly signals "not yet loaded".
	 *
	 * @type {[Object|null, Function]}
	 */
	const [board, setBoard] = useState(null);

	/*
	 * Tracks whether an async fetch is currently in-flight.
	 * Initialised to true because a fetch begins immediately on mount.
	 *
	 * @type {[boolean, Function]}
	 */
	const [loading, setLoading] = useState(true);

	/*
	 * Holds the error message string if the fetch failed, or null if fine.
	 *
	 * @type {[string|null, Function]}
	 */
	const [error, setError] = useState(null);

	/*
	 * -------------------------------------------------------------------------
	 * Side effect: fetch board whenever the id changes
	 * -------------------------------------------------------------------------
	 */

	/*
	 * [id] dependency array — re-runs whenever the board ID changes, ensuring
	 * the correct board is always loaded without a full page reload.
	 */
	useEffect(() => {

		/**
		 * Inner async function that performs the actual HTTP request.
		 * Must be defined inside the effect and invoked immediately — useEffect
		 * callbacks cannot themselves be async.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const fetchBoard = async () => {
			/* Call the board service with the given ID and await the JSON response. */
			const response = await getBoardById(id);

			/*
			 * Store the board object in state, triggering a re-render so that
			 * consuming components receive the freshly loaded data.
			 */
			setBoard(response.data);
		};
		/*
		 * Reset state in resposne to changes of id.
		 */
		setLoading(true);
		/*
		 * Invoke fetchBoard then attach promise handlers for error and loading.
		 */
		fetchBoard()
			/*
			 * Capture any rejection reason and store it as a string in error state
			 * so the consumer can surface a meaningful message to the user.
			 */
			.catch(err => setError(err.message))

			/*
			 * Always clears the loading flag — runs after both resolution and
			 * rejection, preventing a permanently stuck loading state.
			 */
			.finally(() => setLoading(false));

	}, [id]);

	/*
	 * -------------------------------------------------------------------------
	 * Return value
	 * -------------------------------------------------------------------------
	 */

	/*
	 * Expose state as a plain object so consumers can destructure only what
	 * they need: const { board, loading, error } = useBoardDetails(id);
	 */
	return { board, loading, error };
}
