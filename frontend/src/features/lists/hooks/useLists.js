/**
 * @file useLists.js
 * @description Custom React hook for fetching and managing the lists (columns)
 * belonging to a specific board.
 *
 * Manages the full list lifecycle for one board:
 *   - Fetches all lists on mount (and re-fetches if the board ID changes).
 *   - Exposes createNewList and deleteExistingList for server mutations with
 *     optimistic local-state updates.
 *   - Exposes updateListOrder for drag-and-drop reorder without a re-fetch,
 *     and persistListOrder to save that order (rolling back on failure).
 *   - Exposes reload so a failed initial fetch can be retried.
 *
 * The initial fetch and later mutations report failures separately, like
 * useBoardCards does: `fetchError` means the board has no lists to show, while
 * `mutationError` is scoped to one list (or the add-list form) so a rejected
 * rename surfaces as a banner instead of replacing the whole board.
 *
 * Consumed by:
 *   - BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *
 * Depends on:
 *   - getAllLists, createList, deleteList, updateList, reorderLists
 *     (features/lists/api/listService.js)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect, useState — React hooks for side-effects and local state.
 * createList          — POST /api/lists/
 * getAllLists          — GET  /api/lists?boardId=<id>
 * deleteList          — DELETE /api/lists/<id>
 * updateList          — PUT  /api/lists/<id>
 * reorderLists        — PATCH /api/lists/reorder
 */
import { useCallback, useEffect, useState } from "react";
import { createList, getAllLists, deleteList, updateList, reorderLists } from "../api/listService";

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
 *   fetchError:          string|null,
 *   mutationError:       {listId: number|null, message: string}|null,
 *   setMutationError:    Function,
 *   updateListOrder:     Function,
 *   persistListOrder:    Function,
 *   reload:              Function,
 *   createNewList:       Function,
 *   deleteExistingList:  Function,
 *   renameList:          Function
 * }} An object containing:
 *   - `lists`              — Array of list objects for this board, ordered by position.
 *   - `loading`            — `true` while the initial fetch is in-flight.
 *   - `fetchError`         — `null` on success; error message string if the fetch fails.
 *   - `mutationError`      — `{ listId, message }` if the last create/delete/rename/
 *                            reorder failed; `listId` is null for a failed create.
 *   - `setMutationError`   — Setter so the UI can dismiss the mutation error.
 *   - `updateListOrder`    — Replaces the lists array with a new ordered array.
 *                            Called after drag-and-drop to update local state without
 *                            triggering a full re-fetch.
 *   - `persistListOrder`   — Saves the current order to the backend, restoring a
 *                            given snapshot if the request fails.
 *   - `reload`             — Re-runs the initial fetch, e.g. from a Retry button.
 *   - `createNewList`      — Async function to create a list and append it to local state.
 *                            Resolves to `true` on success, `false` on failure.
 *   - `deleteExistingList` — Async function to delete a list and remove it from local state.
 *   - `renameList`         — Async function to rename a list and reflect the new name
 *                            in local state.
 */
export function useLists(id) {
	/*
	 * State
	 * ─────────────────────────────────────────────────────────────────────
	 * lists         — the fetched lists array, ordered by position.
	 * loading       — true while the initial fetch is in-flight. Mutations
	 *                 don't touch it: BoardDetailPage swaps the list columns
	 *                 for placeholders while it's true.
	 * fetchError    — set if the initial fetch failed.
	 * mutationError — set if a create/delete/rename failed, tagged with the
	 *                 originating listId (null for create).
	 */
	const [lists, setLists] = useState([]);
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState(null);
	const [mutationError, setMutationError] = useState(null);

	/* Bumped by `reload` to re-run the fetch effect (see useBoards). */
	const [reloadKey, setReloadKey] = useState(0);
	const reload = useCallback(() => setReloadKey(key => key + 1), []);

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
	 * Persist a list order that updateListOrder has already applied locally.
	 *
	 * Rolls local state back to `previousLists` on failure, chosen over leaving
	 * the optimistic order in place, because the server still holds the old
	 * order — the next load would silently undo the drag, so it's better to
	 * undo it visibly now, next to an error. The error is tagged with the
	 * dragged list's id so it renders in that column.
	 *
	 * The rollback replaces the whole array, so a rename or create that lands
	 * while the reorder is in flight is also reverted; accepted given how
	 * short that window is.
	 *
	 * @async
	 * @param {number[]}      orderedIds    - Every list ID on the board, in the new order.
	 * @param {number}        movedListId   - The list that was dragged.
	 * @param {Array<Object>} previousLists - The pre-drag lists array to restore on failure.
	 */
	async function persistListOrder(orderedIds, movedListId, previousLists) {
		try {
			await reorderLists(orderedIds);
		} catch (err) {
			setLists(previousLists);
			setMutationError({ listId: movedListId, message: `Couldn't save the new list order: ${err.message}` });
		}
	}

	/**
	 * Create a new list on the server and append it to local state on success.
	 *
	 * Sets mutationError (with a null listId) on failure. Unwraps
	 * `response.data` before appending to ensure the list entity (not the full
	 * API response envelope) is stored in state.
	 *
	 * @async
	 * @param {string} name - Display name for the new list.
	 * @returns {Promise<boolean>} Whether the list was created, so the add-list
	 *   form can stay open with the typed name after a failure.
	 */
	async function createNewList(name) {
		try {
			const list = await createList({ name, boardId: id });
			setLists((prev) => [...prev, list.data]);
			return true;
		} catch (err) {
			setMutationError({ listId: null, message: err.message });
			return false;
		}
	}

	/**
	 * Delete an existing list on the server and remove it from local state on success.
	 *
	 * Sets mutationError on failure; the list stays on the board.
	 *
	 * @async
	 * @param {number} listId - The ID of the list to delete.
	 */
	async function deleteExistingList(listId) {
		try {
			await deleteList(listId);
			setLists((prev) => prev.filter((list) => list.id !== listId));
		} catch (err) {
			setMutationError({ listId, message: err.message });
		}
	}

	/**
	 * Rename an existing list on the server and reflect the new name in local
	 * state on success.
	 *
	 * Sends only `{ name }` — updateList's PUT endpoint treats a falsy BoardId
	 * or zero Position in the payload as "unchanged" rather than as a literal
	 * value to write, so a name-only payload can't accidentally move the list
	 * to another board or bump it to the front of the column order.
	 *
	 * Sets mutationError on failure and leaves `list.name` untouched, which is
	 * what lets ListColumn's optimistic title fall back to the old name.
	 *
	 * Uses the functional setLists form because ListColumn awaits this inside
	 * a transition, so the `lists` closure can be stale by the time the
	 * request resolves (e.g. a drag reorder landed mid-request).
	 *
	 * @async
	 * @param {number} listId - The ID of the list to rename.
	 * @param {string} name   - The new display name for the list.
	 */
	async function renameList(listId, name) {
		try {
			await updateList(listId, { name });
			setLists((prev) => prev.map((list) => (list.id === listId ? { ...list, name } : list)));
		} catch (err) {
			setMutationError({ listId, message: err.message });
		}
	}

	/*
	 * Initial Fetch Effect
	 * ─────────────────────────────────────────────────────────────────────
	 * Runs on mount and re-runs whenever the board ID changes or `reload` is
	 * called. fetchLists is a nested async function because useEffect
	 * callbacks must not themselves be async.
	 *
	 * The `cancelled` flag drops a late response from a previous board, which
	 * would otherwise write another board's lists into state.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: reloadKey is read only as a trigger — bumping it via `reload` re-runs the fetch.
	useEffect(() => {
		let cancelled = false;

		const fetchLists = async () => {
			const response = await getAllLists(id);
			if (!cancelled) setLists(response.data);
		};

		setLoading(true);
		setFetchError(null);

		fetchLists()
			.catch(err => { if (!cancelled) setFetchError(err.message); })
			.finally(() => { if (!cancelled) setLoading(false); });

		return () => { cancelled = true; };
	}, [id, reloadKey]); /* Re-run whenever the board ID changes or on reload. */

	return {
		lists,
		loading,
		fetchError,
		mutationError,
		setMutationError,
		updateListOrder,
		persistListOrder,
		reload,
		createNewList,
		deleteExistingList,
		renameList,
	};
}
