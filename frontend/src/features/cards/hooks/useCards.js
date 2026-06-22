/**
 * @file useCards.js
 * @description Custom React hook for fetching and mutating cards in a single
 * list column.
 *
 * Manages the full card lifecycle for one list:
 *   - Fetches all cards on mount (and re-fetches if listId changes).
 *   - Exposes submitCreateCard and submitDeleteCard for optimistic local-state
 *     updates after successful API calls.
 *   - Separates fetch errors (fetchError) from mutation errors (mutationError)
 *     so the UI can surface them independently.
 *
 * Consumed by:
 *   - ListColumn (src/features/lists/components/ListColumn.jsx)
 *
 * Depends on:
 *   - getAllCards, createCard, deleteCard (features/cards/api/cardService.js)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect, useState — React hooks for side-effects and local state.
 * getAllCards         — GET /api/cards?listId=<id>
 * createCard          — POST /api/cards/
 * deleteCard          — DELETE /api/cards/<id>
 */
import { useEffect, useState } from "react";
import { getAllCards, createCard, deleteCard } from "../api/cardService";

/**
 * Custom hook that fetches all cards for a given list and exposes mutation
 * helpers for creating and deleting cards.
 *
 * @param {number} listId - The numeric primary key of the list whose cards
 *   should be fetched and managed.
 * @returns {{
 *   cards:            Array<Object>,
 *   loading:          boolean,
 *   fetchError:       string|null,
 *   mutationError:    string|null,
 *   setMutationError: Function,
 *   submitCreateCard: Function,
 *   submitDeleteCard: Function
 * }} An object containing:
 *   - `cards`            — Array of card objects for this list.
 *   - `loading`          — `true` while the initial fetch is in-flight.
 *   - `fetchError`       — Error message if the initial GET failed; otherwise null.
 *   - `mutationError`    — Error message if the last create/delete failed; otherwise null.
 *   - `setMutationError` — Setter to clear the mutation error from the UI.
 *   - `submitCreateCard` — Async function to create a card and update local state.
 *   - `submitDeleteCard` — Async function to delete a card and update local state.
 */
export function useCards(listId) {
	/*
	 * State
	 * ─────────────────────────────────────────────────────────────────────
	 * cards         — the fetched cards array for this list column.
	 * loading       — true while the initial fetch is in-flight.
	 * fetchError    — set if the initial GET /api/cards request fails.
	 * mutationError — set if a create or delete mutation fails; independently
	 *                 clearable so the UI can dismiss it without affecting the
	 *                 fetch error.
	 */
	const [cards, setCards] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState(null);
	const [mutationError, setMutationError] = useState(null);

	/*
	 * Initial Fetch Effect
	 * ─────────────────────────────────────────────────────────────────────
	 * Runs on mount and re-runs if listId changes (e.g. when the column is
	 * reused for a different list). fetchCards is a nested async function
	 * because useEffect callbacks must not themselves be async.
	 */
	useEffect(() => {
		const fetchCards = async () => {
			const response = await getAllCards(listId);
			setCards(response.data);
		};

		fetchCards()
			.catch(err => setFetchError(err.message))
			.finally(() => setLoading(false));

	}, [listId]);

	/**
	 * Append a single card to the local cards array.
	 * Used internally after a successful createCard API call.
	 *
	 * @param {Object} card - The newly created card object returned by the API.
	 */
	function addCard(card) {
		setCards(prev => [...prev, card]);
	}

	/**
	 * Remove a single card from the local cards array by ID.
	 * Used internally after a successful deleteCard API call.
	 *
	 * @param {number} cardId - The ID of the card to remove.
	 */
	function removeCard(cardId) {
		setCards(prev => prev.filter(c => c.id !== cardId));
	}

	/**
	 * Create a new card on the server and add it to local state on success.
	 *
	 * Automatically appends the current `listId` to the supplied data before
	 * sending. Sets `mutationError` if the request fails.
	 *
	 * @async
	 * @param {Object} data - Card fields (e.g. `{ title: "Fix bug", priority: "High" }`).
	 */
	async function submitCreateCard(data) {
		try {
			const response = await createCard({ ...data, listId });
			addCard(response.data);
		} catch (err) {
			setMutationError(err.message);
		}
	}

	/**
	 * Delete a card on the server and remove it from local state on success.
	 *
	 * Sets `mutationError` if the request fails so the UI can surface the issue
	 * without losing the existing cards list.
	 *
	 * @async
	 * @param {number} cardId - The ID of the card to delete.
	 */
	async function submitDeleteCard(cardId) {
		try {
			await deleteCard(cardId);
			removeCard(cardId);
		} catch (err) {
			setMutationError(err.message);
		}
	}

	return { cards, loading, fetchError, mutationError, setMutationError, submitCreateCard, submitDeleteCard };
}
