/**
 * @file useCards.js
 * @description Custom React hook for fetching and managing the cards that
 * belong to a specific list (column) on a board. Mirrors the structure of
 * `useLists.js` — abstracts all data-fetching logic away from UI components
 * so they only need to consume the returned state values.
 *
 * Consumed by:
 *   - Any component that renders cards within a list column.
 *
 * Depends on:
 *   - getAllCards  (src/features/cards/api/cardService.js)
 *   - React's built
-in `useState` and `useEffect` hooks
 */

import { useEffect, useState } from "react";

/*
 * getAllCards is the service function responsible for sending the HTTP GET
 * request that retrieves every card belonging to the given list ID.
 */
import { getAllCards } from "../api/cardService";

/**
 * Custom hook that fetches all cards associated with a given list and exposes
 * loading / error state so that consuming components can render appropriate UI
 * for each data-fetching phase (loading spinner, error message, populated cards).
 *
 * The fetch is automatically re-triggered whenever `listId` changes, which means
 * switching between list columns will always load the correct set of cards
 * without needing to unmount and remount the component.
 *
 * @param {number} listId - The numeric primary key of the list whose cards
 *   should be fetched. Passed as the `listId` query-string parameter to the
 *   API. Originates from the list object rendered in the lists feature.
 *
 * @returns {{
 *   cards:   Array<Object>,
 *   loading: boolean,
 *   error:   string|null
 * }} An object containing:
 *   - `cards`   – The array of card objects returned by the API. Each object
 *                 represents a single task card within the list column (e.g.
 *                 title, description, priority). Starts as an empty array
 *                 before the fetch completes.
 *   - `loading` – `true` while the HTTP request is in-flight; flips to `false`
 *                 once the request either resolves or rejects. Useful for
 *                 rendering a spinner or skeleton UI.
 *   - `error`   – `null` on success; set to the caught error's `.message`
 *                 string if the fetch fails. Allows the consumer to display a
 *                 user-facing error message.
 *
 * @example
 * // Inside a component that receives a list object as a prop:
 * const { cards, loading, error } = useCards(list.id);
 *
 * if (loading) return <Spinner />;
 * if (error)   return <ErrorBanner message={error} />;
 * return cards.map(card => <CardItem key={card.id} card={card} />);
 */
export function useCards(listId) {

	/* -------------------------------------------------------------------------
	 * State declarations
	 * ---------------------------------------------------------------------- */

	/**
	 * Holds the array of card objects fetched from the API.
	 * Initialised to an empty array so that consumers can safely call
	 * `.map()` or `.length` on it before data arrives.
	 *
	 * @type {[Array<Object>, Function]}
	 */
	const [cards, setCards] = useState([]);

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

	/* -------------------------------------------------------------------------
	 * Side effect: fetch cards whenever the list ID changes
	 * ---------------------------------------------------------------------- */

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
		const fetchCards = async () => {
			/*
			 * Call the card service, passing the list ID so the API can filter
			 * results to only the cards that belong to this particular list.
			 * The underlying api client wraps fetch() and resolves to the parsed
			 * JSON body, so `response.data` is the actual array of card objects.
			 */
			const response = await getAllCards(listId);

			/*
			 * Commit the retrieved cards to state, which will trigger a re-render
			 * and give consuming components access to the fresh data.
			 */
			setCards(response.data);
		};

		fetchCards()
			/*
			 * If fetchCards() rejects (network failure, non-2xx HTTP status, timeout
			 * after the 5 000 ms threshold in api.js, etc.) the caught error's message
			 * string is stored so the consumer can surface a meaningful error to the user.
			 */
			.catch(err => setError(err.message))
			/*
			 * Always runs after either resolution or rejection. Marks the loading
			 * phase as complete so consumers can hide spinners / skeletons.
			 */
			.finally(() => setLoading(false));

	/*
	 * Re-run this effect whenever the list ID prop changes. This ensures that
	 * switching between different list columns always loads the correct cards
	 * without requiring a full page navigation or component unmount.
	 */
	}, [listId]);

	/* -------------------------------------------------------------------------
	 * Return value
	 * ---------------------------------------------------------------------- */

	/*
	 * Expose state as a plain object so consumers can destructure only what they
	 * need: const { cards } = useCards(listId)  ← valid; unused values are ignored.
	 */
	return { cards, loading, error };
}