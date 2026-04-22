/**
 * @file useLists.js
 * @description Custom React hook for fetching and managing the list of columns
 * (referred to as "lists" in Trello-like terminology) that belong to a specific
 * board. Abstracts all data-fetching logic away from UI components so they only
 * need to consume the returned state values.
 *
 * Consumed by:
 *   - BoardDetailPage  (src/pages/BoardDetailPage.jsx)
 *
 * Depends on:
 *   - getAllLists  (src/features/lists/api/listService.js)
 *   - React's built-in `useState` and `useEffect` hooks
 */

import { useEffect, useState } from "react";

/*
 * getAllLists is the service function responsible for sending the HTTP GET
 * request that retrieves every list belonging to the given board ID.
 */
import { getAllLists } from "../api/listService";

/**
 * Custom hook that fetches all lists associated with a given board and exposes
 * loading / error state so that consuming components can render appropriate UI
 * for each data-fetching phase (loading spinner, error message, populated list).
 *
 * The fetch is automatically re-triggered whenever `id` changes, which means
 * navigating between different boards will always load the correct set of lists
 * without needing to unmount and remount the component.
 *
 * @param {number} id - The numeric primary key of the board whose lists should
 *   be fetched. Passed as the `boardId` query-string parameter to the API.
 *   Originates from the `:boardId` URL segment parsed by react-router's
 *   `useParams()` in BoardDetailPage.
 *
 * @returns {{
 *   lists:   Array<Object>,
 *   loading: boolean,
 *   error:   string|null
 * }} An object containing:
 *   - `lists`   – The array of list objects returned by the API. Each object
 *                 represents a single column on the board (e.g. "To Do",
 *                 "In Progress", "Done"). Starts as an empty array before the
 *                 fetch completes.
 *   - `loading` – `true` while the HTTP request is in-flight; flips to `false`
 *                 once the request either resolves or rejects. Useful for
 *                 rendering a spinner or skeleton UI.
 *   - `error`   – `null` on success; set to the caught error's `.message`
 *                 string if the fetch fails. Allows the consumer to display a
 *                 user-facing error message.
 *
 * @example
 * // Inside a component that receives the boardId from the URL:
 * const { boardId } = useParams();
 * const { lists, loading, error } = useLists(Number(boardId));
 *
 * if (loading) return <Spinner />;
 * if (error)   return <ErrorBanner message={error} />;
 * return lists.map(list => <ListColumn key={list.id} list={list} />);
 */
export function useLists(id) {
	/*
	 * -------------------------------------------------------------------------
	 * State declarations
	 * -------------------------------------------------------------------------
	 */

	/**
	 * Holds the array of list objects fetched from the API.
	 * Initialised to an empty array so that consumers can safely call
	 * `.map()` or `.length` on it before data arrives.
	 *
	 * @type {[Array<Object>, Function]}
	 */
	const [lists, setLists] = useState([]);

	/**
	 * Tracks whether an HTTP request is currently in-flight.
	 * Starts as `true` because a fetch is triggered immediately on mount,
	 * then flips to `false` in the `finally` block regardless of outcome.
	 *
	 * @type {[boolean, Function]}
	 */
	const [loading, setLoading] = useState(true);

	/**
	 * Holds the error message string if the fetch fails, or `null` when
	 * everything is fine. Only the `.message` property of the caught Error
	 * object is stored — keeping the exposed value serialisation-friendly.
	 *
	 * @type {[string|null, Function]}
	 */
	const [error, setError] = useState(null);

	/*
	 * -------------------------------------------------------------------------
	 * Side effect: fetch lists whenever the board ID changes
	 * -------------------------------------------------------------------------
	 */

	useEffect(() => {
		/**
		 * Inner async function that performs the actual API call.
		 * Defined inside the effect so it can be declared `async` — useEffect
		 * callbacks themselves must not be async (they must return either nothing
		 * or a cleanup function, not a Promise).
		 *
		 * @async
		 * @returns {Promise<void>}
		 */
		const fetchLists = async () => {
			/*
			 * Call the list service, passing the board ID so the API can filter
			 * results to only the lists that belong to this particular board.
			 * The underlying api client wraps fetch() and resolves to the parsed
			 * JSON body, so `response.data` is the actual array of list objects.
			 */
			const response = await getAllLists(id);

			/*
			 * Commit the retrieved lists to state, which will trigger a re-render
			 * and give consuming components access to the fresh data.
			 */
			setLists(response.data);
		};

		fetchLists()
			/*
			 * If fetchLists() rejects (network failure, non-2xx HTTP status, timeout
			 * after the 5 000 ms threshold in api.js, etc.) the caught error's message
			 * string is stored so the consumer can surface a meaningful error to the user.
			 */
			.catch(err => setError(err.message))
			/*
			 * Always
 runs after either resolution or rejection. Marks the loading
			 * phase as complete so consumers can hide spinners / skeletons.
			 */
			.finally(() => setLoading(false));

	/*
	 * Re-run this effect whenever the board ID prop changes. This ensures that
	 * switching from one board to another always loads the correct lists without
	 * requiring a full page navigation or component unmount.
	 */
	}, [id]);

	/*
	 * -------------------------------------------------------------------------
	 * Return value
	 * -------------------------------------------------------------------------
	 */

	/*
	 * Expose state as a plain object so consumers can destructure only what they
	 * need: const { lists } = useLists(id)  ← valid; unused values are ignored.
	 */
	return { lists, loading, error };
}