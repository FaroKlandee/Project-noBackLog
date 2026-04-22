/**
 * @file useBoards.js
 * @description Custom React hook for fetching and managing the full list of
 * boards in the nobacklog application. Abstracts all data-fetching logic away
 * from UI components so they only need to consume the returned state values.
 *
 * Consumed by:
 *   - Boards  (src/features/boards/components/Boards.jsx)
 *
 * Depends on:
 *   - getAllBoards  (src/features/boards/api/boardService.js)
 *   - React's built-in `useState` and `useEffect` hooks
 */

import { useEffect, useState } from 'react';
import { getAllBoards } from '../api/boardService';

/**
 * @hook useBoards
 *
 * A custom React hook that encapsulates all data-fetching logic for the boards
 * feature. It is responsible for loading the full list of boards from the
 * backend API on mount, and for exposing the resulting state — the board
 * records themselves, a loading flag, and any error that occurred — to
 * whatever component consumes it.
 *
 * Keeping this logic in a dedicated hook rather than directly inside a
 * component means:
 *   - The fetching behaviour can be reused by multiple components without
 *     duplicating code.
 *   - Components stay focused on rendering; they receive ready-to-use state
 *     rather than managing async side-effects themselves.
 *   - The hook is independently testable in isolation from any UI.
 *
 * @returns {{ boards: Array<Object>, loading: boolean, error: string|null }}
 *   An object containing:
 *   - `boards`  — The array of board objects returned by the API. Each object
 *                 is the raw JSON representation of a board record (e.g.
 *                 `{ id, name, ... }`). Starts as an empty array before the
 *                 first successful fetch completes.
 *   - `loading` — `true` while the network request is in-flight; `false` once
 *                 it has either succeeded or failed. Consumers should use this
 *                 flag to render a loading indicator or skeleton UI.
 *   - `error`   — `null` when no error has occurred. If the fetch rejects for
 *                 any reason (network failure, timeout, non-2xx response, etc.)
 *                 this is set to the error's `.message` string so that
 *                 consumers can surface a meaningful message to the user.
 *
 * @example
 * function MyComponent() {
 *   const { boards, loading, error } = useBoards();
 *
 *   if (loading) return <Spinner />;
 *   if (error)   return <ErrorBanner message={error} />;
 *   return boards.map(b => <BoardCard key={b.id} board={b} />);
 * }
 */
export function useBoards() {
	/*
	 * ---------------------------------------------------------------------------
	 * State declarations
	 * ---------------------------------------------------------------------------
	 */

	/*
	 * The list of board objects fetched from the API.
	 * Initialised to an empty array so that consumers can always safely call
	 * array methods on it (e.g. `.map`, `.length`) even before the fetch
	 * completes — no null-checks required.
	 *
	 * @type {[Array<Object>, Function]}
	 */
	const [boards, setBoards] = useState([]);

	/*
	 * Tracks whether an async fetch is currently in-flight.
	 * Initialised to `true` because a fetch begins immediately on mount; this
	 * way consumers never see a brief false→true flicker at startup.
	 *
	 * @type {[boolean, Function]}
	 */
	const [loading, setLoading] = useState(true);

	/*
	 * Holds the error message string if the fetch failed, or `null` if
	 * everything is fine. Using `null` (rather than `undefined` or `false`)
	 * makes truthiness checks straightforward: `if (error) { ... }`.
	 *
	 * @type {[string|null, Function]}
	 */
	const [error, setError] = useState(null);

	/*
	 * ---------------------------------------------------------------------------
	 * Side effect: fetch boards on mount
	 * ---------------------------------------------------------------------------
	 */

	/*
	 * `useEffect` with an empty dependency array (`[]`) runs exactly once —
	 * after the component that called this hook first mounts to the DOM. This
	 * is the standard React pattern for "fetch data on mount".
	 *
	 * An async function cannot be passed directly as the `useEffect` callback
	 * (because that would make the callback return a Promise, conflicting with
	 * the cleanup-function return value that React expects), so `fetchBoards`
	 * is defined as an inner async function and then immediately invoked.
	 */
	useEffect(() => {
		/**
		 * Inner async function that performs the actual HTTP request.
		 * Defined inside the effect so it can close over `setBoards` without
		 * needing it in a dependency array.
		 *
		 * Note: `getAllBoards()` delegates to the shared `api` utility, which
		 * returns parsed JSON directly (not an Axios-style `{ data }` wrapper).
		 * The response IS the array of boards, stored under the `.data` property
		 * as shaped by the backend response envelope.
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const fetchBoards = async () => {
			/* Call the boards API service function and await the JSON response. */
			const response = await getAllBoards();

			/*
			 * Store the board records in state, triggering a re-render so that
			 * consuming components receive the freshly loaded data.
			 */
			setBoards(response.data);
		};

		/*
		 * Invoke the async function, then attach promise handlers to manage the
		 * remaining state transitions.
		 */
		fetchBoards()
			/*
			 * If `fetchBoards` rejects for any reason (network error, timeout,
			 * non-2xx HTTP status, or a JSON parse failure), capture the human-
			 * readable message and store it in `error` state so the UI can
			 * surface it. Using `.catch` on the returned promise rather than a
			 * try/catch inside `fetchBoards` keeps the error-handling path
			 * visible at the call site and avoids swallowing errors silently.
			 */
			.catch(err => setError(err.message))

			/*
			 * `.finally` runs regardless of whether the promise resolved or
			 * rejected, making it the correct place to clear the loading flag.
			 * This guarantees that `loading` always returns to `false` after
			 * the fetch settles, even if it failed — preventing the UI from
			 * being permanently stuck in a loading state.
			 */
			.finally(() => setLoading(false));

	}, []); /* Empty array — effect runs only on mount, never on updates. */

	/*
	 * ---------------------------------------------------------------------------
	 * Return value
	 * ---------------------------------------------------------------------------
	 */

	/*
	 * Expose the three pieces of state as a plain object so that consumers
	 * can destructure only what they need:
	 *
	 *   const { boards, loading, error } = useBoards();
	 *
	 * Returning an object (rather than an array like `useState` does) means
	 * consumers always use named properties, which is more readable and
	 * avoids positional ordering mistakes when only a subset is needed.
	 */
	return { boards, loading, error };
}