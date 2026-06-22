/**
 * @file useLists.js
 * @description Custom React hook for fetching and managing the lists (columns)
 * belonging to a specific board.
 *
 * Manages the full list lifecycle for one board:
 *   - Fetches all lists on mount (and re-fetches if the board ID changes).
 *   - Exposes createNewList and deleteExistingList for server mutations with
 *     optimistic local-state updates.
 *   - Exposes updateListOrder for drag-and-drop reorder without a re-fetch.
 *
 * Consumed by:
 *   - BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *
 * Depends on:
 *   - getAllLists, createList, deleteList (features/lists/api/listService.js)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect, useState — React hooks for side-effects and local state.
 * createList          — POST /api/lists/
 * getAllLists          — GET  /api/lists?boardId=<id>
 * deleteList          — DELETE /api/lists/<id>
 */
import { useEffect, useState } from "react";
import { createList, getAllLists, deleteList } from "../api/listService";

/**
 * Custom hook that fetches all lists for a given board and exposes list
 * mutation helpers.
 *
 * @param {number|string} id - The numeric primary key of the board whose lists
 *   should be fetched. Re-running the effect when this value changes ensures
 *   the correct lists are always shown when navigating between boards.
 * @returns {{
 *   lists:               Array<Object>,
 *   loading:             boolean,
 *   error:               string|null,
 *   updateListOrder:     Function,
 *   createNewList:       Function,
 *   deleteExistingList:  Function
 * }} An object containing:
 *   - `lists`              — Array of list objects for this board, ordered by position.
 *   - `loading`            — `true` while any request (fetch or mutation) is in-flight.
 *   - `error`              — `null` on success; error message string if any request fails.
 *   - `updateListOrder`    — Replaces the lists array with a new ordered array.
 *                            Called after drag-and-drop to update local state without
 *                            triggering a full re-fetch.
 *   - `createNewList`      — Async function to create a list and append it to local state.
 *   - `deleteExistingList` — Async function to delete a list and remove it from local state.
 */
export function useLists(id) {
	/*
	 * State
	 * ─────────────────────────────────────────────────────────────────────
	 * lists   — the fetched lists array, ordered by position.
	 * loading — true while any request (initial fetch or mutation) is in-flight.
	 * error   — null on success; error message string on any failure.
	 */
	const [lists, setLists] = useState([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState(null);

	/*
	 * Mutation Helpers
	 * ─────────────────────────────────────────────────────────────────────
	 */

	/**
	 * Replace the local lists array with a new ordered array.
	 *
	 * Called after a drag-and-drop reorder to reflect the new order in the UI
	 * immediately, without waiting for a re-fetch from the server.
	 *
	 * @param {Array<Object>} newOrderedLists - The lists array in its new order.
	 */
	function updateListOrder(newOrderedLists) {
		setLists(newOrderedLists);
	}

	/**
	 * Create a new list on the server and append it to local state on success.
	 *
	 * Sets loading while the request is in-flight and sets error on failure.
	 * Unwraps `response.data` before appending to ensure the list entity
	 * (not the full API response envelope) is stored in state.
	 *
	 * @async
	 * @param {string} name - Display name for the new list.
	 */
	async function createNewList(name) {
		setLoading(true);
		try {
			const list = await createList({ name, boardId: id });
			setLists([...lists, list.data]);
		} catch (error) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	}

	/**
	 * Delete an existing list on the server and remove it from local state on success.
	 *
	 * Sets loading while the request is in-flight and sets error on failure.
	 *
	 * @async
	 * @param {number} listId - The ID of the list to delete.
	 */
	async function deleteExistingList(listId) {
		setLoading(true);
		try {
			await deleteList(listId);
			setLists(lists.filter((list) => list.id !== listId));
		} catch (error) {
			setError(error.message);
		} finally {
			setLoading(false);
		}
	}

	/*
	 * Initial Fetch Effect
	 * ─────────────────────────────────────────────────────────────────────
	 * Runs on mount and re-runs whenever the board ID changes. fetchLists is
	 * a nested async function because useEffect callbacks must not themselves
	 * be async.
	 */
	useEffect(() => {
		const fetchLists = async () => {
			const response = await getAllLists(id);
			setLists(response.data);
		};

		fetchLists()
			.catch(err => setError(err.message))
			.finally(() => setLoading(false));

	}, [id]); /* Re-run whenever the board ID changes. */

	return { lists, loading, error, updateListOrder, createNewList, deleteExistingList };
}
