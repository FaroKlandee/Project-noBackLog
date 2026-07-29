/**
 * @file useBoardCards.js
 * @description Board-level custom React hook that owns the card state for
 * *every* list on a board in a single place.
 *
 * ── Architectural decisions ────────────────────────────────────────────────
 *
 * Card state is owned board-wide here, chosen over each ListColumn calling
 * useCards for itself, because per-column hooks left every column's cards in a
 * private closure that no ancestor could read — making a card move *between*
 * two lists impossible to reconcile from the board-level drag handler, which
 * needs to see both the source and destination arrays at once.
 *
 * Keyed by list ID rather than held as a flat array, because the key matches the
 * `group` value CardItem passes to useSortable, and a keyed record is the shape
 * dnd-kit's `move()` helper and its multi-list `initialGroup`/`group`
 * reconciliation pattern already expect. A flat array would need a derived
 * grouping on every render plus manual index arithmetic.
 *
 * Fetched with one request per board via `getAllCardsByBoard`, chosen over one
 * request per list, because N lists otherwise meant N round-trips and forced the
 * card fetch to wait on the list fetch to learn which list IDs existed. Keying
 * the effect on `boardId` alone also means list reordering never refetches
 * cards, and cards load in parallel with lists rather than after them.
 *
 * One fetchError/mutationError pair for the whole board, chosen over one pair
 * per column, because a board-level load failure is genuinely not scoped to any
 * column. The mutation error is tagged `{ listId, message }` rather than being a
 * bare string, accepted deliberately over a second per-column state map, because
 * the tag lets a single slot still be rendered scoped to the column it came from
 * — at the cost of holding only one mutation error at a time.
 *
 * State shape:
 *   {
 *     3: [ { id: 12, title: "Fix login", listId: 3, position: "a1" }, ... ],
 *     4: [ { id: 18, title: "Write docs", listId: 4, position: "a0" }, ... ],
 *   }
 *
 * Depends on:
 *   - getAllCardsByBoard, createCard, deleteCard, reorderCard
 *     (features/cards/api/cardService.js)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect, useState  — React hooks for side-effects and local state.
 * getAllCardsByBoard   — GET    /api/cards?boardId=<id>
 * createCard           — POST   /api/cards/
 * deleteCard           — DELETE /api/cards/<id>
 * reorderCard          — PATCH  /api/cards/<id>/reorder
 */
import { useEffect, useState } from "react";
import { getAllCardsByBoard, createCard, deleteCard, reorderCard } from "../api/cardService";

/**
 * Group a flat array of cards into a record keyed by their list ID.
 *
 * ── Why the resulting arrays are correctly ordered ────────────────────────
 *
 * The API orders the whole board by (Position, CreatedAt) *globally*, so cards
 * from different lists interleave in the response, and Position values are only
 * unique within a list — two cards in different lists can both hold "a0".
 *
 * The per-list arrays still come out correctly ordered because this loop is a
 * *stable partition*: it walks the response in order and only ever appends, so
 * for any two cards in the same list, their relative order in the bucket is
 * their relative order in the response. Any subsequence of a sorted sequence is
 * itself sorted by the same key, so filtering the global ordering down to one
 * list yields exactly that list's ordering.
 *
 * Duplicate ranks across lists never matter, because two cards holding "a0" in
 * different lists are pushed into different buckets — the cross-list tie is
 * never compared. Only ranks *within* one list are ever ordered against each
 * other.
 *
 * This depends on append-only iteration. Any future change that reorders during
 * grouping, or an API ordering that is not a superset of the per-list ordering,
 * would break it.
 *
 * ── Sparseness ───────────────────────────────────────────────────────────
 *
 * Only lists that have at least one card get a key. A list with no cards is
 * absent from the record entirely, so consumers must read `record[id] ?? []`
 * rather than assuming a key exists. Kept sparse deliberately over seeding an
 * empty array per list, because seeding would require this hook to know the
 * board's list set — reintroducing the `lists` dependency that keying on
 * boardId alone removed.
 *
 * Implemented with a plain loop rather than `Object.groupBy`, chosen for
 * portability because `Object.groupBy` is ES2024 and this avoids depending on
 * the build's browser target for a four-line helper.
 *
 * @param {Array<Object>} cards - Flat cards array as returned by the API,
 *   globally ordered by (Position, CreatedAt).
 * @returns {Object<number, Array<Object>>} Sparse record of list ID to that
 *   list's cards, each array preserving the response's relative ordering.
 */
function groupCardsByList(cards) {
	const grouped = {};

	for (const card of cards ?? []) {
		if (!grouped[card.listId]) grouped[card.listId] = [];
		grouped[card.listId].push(card);
	}

	return grouped;
}

/**
 * Board-level hook that fetches and owns the cards for every list on a board.
 *
 * @param {number} boardId - The numeric primary key of the board whose cards
 *   should be fetched and managed.
 * @returns {{
 *   cardsByList:          Object<number, Array<Object>>,
 *   loading:              boolean,
 *   fetchError:           string|null,
 *   mutationError:        {listId: number, message: string}|null,
 *   setMutationError:     Function,
 *   submitCreateCard:     Function,
 *   submitDeleteCard:     Function,
 *   updateCardOrder:      Function,
 *   persistCardPosition:  Function
 * }} An object containing:
 *   - `cardsByList`         — Record of list ID to that list's cards array.
 *                             Lists with no cards are simply absent, so consumers
 *                             should read `cardsByList[id] ?? []`.
 *   - `loading`             — `true` while the board's card fetch is in-flight.
 *   - `fetchError`          — Message if the load failed; otherwise null.
 *   - `mutationError`       — `{ listId, message }` if the last create/delete/
 *                             reorder failed, so the UI can render the error
 *                             scoped to its originating column; otherwise null.
 *   - `setMutationError`    — Setter so the UI can dismiss the mutation error.
 *   - `submitCreateCard`    — Create a card in a given list and add it to state.
 *   - `submitDeleteCard`    — Delete a card from a given list and remove it.
 *   - `updateCardOrder`     — Replace the whole record after a drag reorder.
 *   - `persistCardPosition` — PATCH a card's new list + position to the backend.
 */
export function useBoardCards(boardId) {
	/*
	 * State
	 * ─────────────────────────────────────────────────────────────────────
	 * cardsByList   — record of list ID to that list's cards array.
	 * loading       — true while the board's card fetch is in-flight.
	 * fetchError    — set if the load failed.
	 * mutationError — set if a create/delete/reorder failed, tagged with the
	 *                 originating listId so it can be rendered scoped.
	 */
	const [cardsByList, setCardsByList] = useState({});
	const [loading, setLoading] = useState(true);
	const [fetchError, setFetchError] = useState(null);
	const [mutationError, setMutationError] = useState(null);

	/*
	 * Fetch Effect
	 * ─────────────────────────────────────────────────────────────────────
	 * One request for the whole board, grouped into the keyed record on arrival.
	 *
	 * The `cancelled` flag guards against a late response resolving after the
	 * board has changed, which would otherwise write another board's cards into
	 * state.
	 */
	useEffect(() => {
		/* No board resolved yet (e.g. a non-numeric URL param). */
		if (!boardId && boardId !== 0) {
			setCardsByList({});
			setLoading(false);
			return;
		}

		let cancelled = false;

		setLoading(true);
		setFetchError(null);

		const fetchBoardCards = async () => {
			const response = await getAllCardsByBoard(boardId);
			if (!cancelled) setCardsByList(groupCardsByList(response.data));
		};

		fetchBoardCards()
			.catch(err => { if (!cancelled) setFetchError(err.message); })
			.finally(() => { if (!cancelled) setLoading(false); });

		return () => { cancelled = true; };
	}, [boardId]);

	/*
	 * Local State Helpers
	 * ─────────────────────────────────────────────────────────────────────
	 */

	/**
	 * Append a card to one list's bucket in the record.
	 *
	 * @param {number} listId - ID of the list to add the card to.
	 * @param {Object} card   - The newly created card returned by the API.
	 */
	function addCard(listId, card) {
		setCardsByList(prev => ({
			...prev,
			[listId]: [...(prev[listId] ?? []), card],
		}));
	}

	/**
	 * Remove a card from one list's bucket in the record.
	 *
	 * @param {number} listId - ID of the list the card belongs to.
	 * @param {number} cardId - ID of the card to remove.
	 */
	function removeCard(listId, cardId) {
		setCardsByList(prev => ({
			...prev,
			[listId]: (prev[listId] ?? []).filter(card => card.id !== cardId),
		}));
	}

	/*
	 * Mutation Handles
	 * ─────────────────────────────────────────────────────────────────────
	 */

	/**
	 * Create a card in a specific list and add it to that list's bucket.
	 *
	 * `listId` is an explicit argument rather than closed over, because this hook
	 * serves every list on the board rather than a single column.
	 *
	 * @async
	 * @param {number} listId - ID of the list to create the card in.
	 * @param {Object} data   - Card fields (e.g. `{ title: "Fix bug", priority: "High" }`).
	 */
	async function submitCreateCard(listId, data) {
		try {
			const response = await createCard({ ...data, listId });
			addCard(listId, response.data);
		} catch (err) {
			setMutationError({ listId, message: err.message });
		}
	}

	/**
	 * Delete a card and remove it from its list's bucket.
	 *
	 * `listId` is required so the correct bucket can be updated directly, chosen
	 * over scanning every list in the record to locate the card.
	 *
	 * @async
	 * @param {number} listId - ID of the list the card belongs to.
	 * @param {number} cardId - ID of the card to delete.
	 */
	async function submitDeleteCard(listId, cardId) {
		try {
			await deleteCard(cardId);
			removeCard(listId, cardId);
		} catch (err) {
			setMutationError({ listId, message: err.message });
		}
	}

	/**
	 * Replace the entire cards record with a new one.
	 *
	 * Takes the whole record rather than a single list's array, because a
	 * cross-list move mutates two buckets at once — the source list loses a card
	 * and the destination gains one. Mirrors the role `updateListOrder` plays for
	 * lists in useLists.
	 *
	 * @param {Object<number, Array<Object>>} nextCardsByList - The new record.
	 */
	function updateCardOrder(nextCardsByList) {
		setCardsByList(nextCardsByList);
	}

	/**
	 * Persist a card's new placement to the backend.
	 *
	 * Intended to be called *after* `updateCardOrder` has already applied the
	 * change locally, chosen over awaiting the server before updating the UI,
	 * because an optimistic update keeps the drag interaction responsive and a
	 * failure can still surface as a scoped mutation error.
	 *
	 * @async
	 * @param {number} cardId   - ID of the card that moved.
	 * @param {number} listId   - ID of the list the card now belongs to.
	 * @param {string} position - The card's new position rank within that list.
	 */
	async function persistCardPosition(cardId, listId, position) {
		try {
			await reorderCard(cardId, { listId, position });
		} catch (err) {
			setMutationError({ listId, message: err.message });
		}
	}

	return {
		cardsByList,
		loading,
		fetchError,
		mutationError,
		setMutationError,
		submitCreateCard,
		submitDeleteCard,
		updateCardOrder,
		persistCardPosition,
	};
}
