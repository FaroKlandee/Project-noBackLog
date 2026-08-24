/**
 * @file BoardDetailPage.jsx
 * @description Route-level page component for the detail view of a single board.
 *
 * Rendered when the user navigates to `/boards/:boardId`. Responsibilities:
 *   1. Read the dynamic `:boardId` URL segment via useParams.
 *   2. Fetch the board metadata (name) via useBoardDetails.
 *   3. Fetch the board's lists and expose list mutations via useLists.
 *   4. Provide the DragDropProvider context for drag-and-drop list reordering.
 *   5. Compose the board header bar and the Lists presenter.
 *
 * Sits in the `pages/` layer — acts as a composition root and delegates all
 * data-fetching and UI to feature-level hooks and components.
 *
 * Route: `/boards/:boardId`
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * useParams       – React Router hook; extracts dynamic URL segments.
 * useLists        – Custom hook; fetches lists for a board and exposes
 *                   create/delete/reorder mutations.
 * Lists           – Presentational component; renders list columns and the
 *                   "add new list" form.
 * CircularProgress– MUI spinner shown while data is loading.
 * Alert           – MUI error banner shown when a fetch fails.
 * useBoardDetails – Custom hook; fetches a single board's metadata by ID.
 * Box             – MUI layout wrapper.
 * Typography      – MUI text component; renders the board name in the header.
 * DragDropProvider– @dnd-kit/react context provider; enables drag-and-drop.
 * move            – @dnd-kit/helpers utility; reorders an array given a drag event.
 * reorderLists    – Service function; PATCHes the new list order to the backend.
 */
import { useParams } from "react-router";
import { useLists, Lists, ListColumnPreview } from "../features/lists/";
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useBoardDetails } from "../features/boards";
import { useBoardCards, generateRank, CardPreview } from "../features/cards";
import { Box, Typography } from "@mui/material";
import { DragDropProvider, DragOverlay } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { reorderLists } from "../features/lists/";
import { useRef } from "react";

/**
 * Translate between dnd-kit's registry ids and the underlying numeric
 * database id.
 *
 * ListColumn and CardItem register with dnd-kit using `list-<id>` /
 * `card-<id>` rather than the bare numeric id, because dnd-kit keeps a
 * single flat, id-keyed registry per DragDropProvider shared by every
 * draggable/droppable regardless of `type` — and List.Id/Card.Id come from
 * independent Postgres identity sequences (separate tables), so an
 * unrelated list and card can easily share the same numeric id. An
 * unprefixed collision silently overwrote one item's registry entry with
 * the other's, detaching its drag-tracking/shift-animation effects (see the
 * comment on ListColumn.jsx's useSortable call for the full story).
 *
 * `move()` (from @dnd-kit/helpers) matches a drag event's source/target
 * against the `.id` field of the plain objects in the array/record it's
 * given, so every call below wraps `lists`/`cardsByList` with the same
 * prefixed id just for the duration of the `move()` call, then unwraps the
 * result back to the raw numeric id before it re-enters React state.
 */
function toListDndId(listId) { return `list-${listId}`; }
function toCardDndId(cardId) { return `card-${cardId}`; }
function fromDndId(dndId) { return Number(dndId.slice(dndId.indexOf('-') + 1)); }

/**
 * Resolve a card drag event against a cardsByList record, returning a new
 * record with the dragged card relocated and its `.listId` field kept in
 * sync with whichever list's array it now sits in.
 *
 * Called from two places:
 *   - `onDragOver`, live on every hover frame, but only commits the result
 *     when the card stays within the same list. @dnd-kit/dom's Sortable
 *     animates a card whenever its `index` PROP changes — which only
 *     happens when React itself re-renders with a new array order — so this
 *     live, same-list commit is what actually drives the shift animation
 *     (relying only on the library's own fully-internal collision tracking,
 *     without ever touching React state, turned out NOT to animate
 *     reliably on its own). It deliberately discards cross-list results:
 *     relocating a card into a different list's <Cards> subtree forces an
 *     unmount/remount, which is unsafe to do repeatedly mid-drag — see the
 *     comment in onDragOver below.
 *   - `handleDragEnd`, once, after the drag has ended, which is what
 *     actually finalizes a cross-list move.
 *
 * Always strips the dragged card out of every bucket before reinserting it —
 * rather than assuming it currently lives in exactly one place — so calling
 * this repeatedly across successive hover frames is safe and never produces
 * a duplicate entry on its own.
 *
 * @param {Object<number, Array<Object>>} cardsByList - Current cards keyed by list ID.
 * @param {import('@dnd-kit/react').DragOverEvent|import('@dnd-kit/react').DragEndEvent} event
 * @returns {Object<number, Array<Object>>} The updated record.
 */
function moveCardsByList(cardsByList, event) {
	const cardId = fromDndId(event.operation.source.id);

	/*
	 * move() understands cardsByList's keyed-by-list-ID shape natively (see
	 * useBoardCards.js's state-shape note), so it alone resolves both a
	 * same-list reorder and a cross-list move to a new record. It matches
	 * the event's source/target against each card's `.id` field, so the
	 * cards are temporarily given their dnd-kit registry id (see
	 * toCardDndId's doc comment above) for this call, then translated back
	 * to their real numeric id immediately after.
	 */
	const dndCardsByList = Object.fromEntries(
		Object.entries(cardsByList).map(([listId, cards]) => [
			listId,
			cards.map(card => ({ ...card, id: toCardDndId(card.id) })),
		])
	);
	const movedDnd = move(dndCardsByList, event);
	let moved = movedDnd === dndCardsByList
		? cardsByList
		: Object.fromEntries(
			Object.entries(movedDnd).map(([listId, cards]) => [
				listId,
				cards.map(card => ({ ...card, id: fromDndId(card.id) })),
			])
		);

	/*
	 * move() only resolves a target it can locate by id among the cards
	 * already rendered in `cardsByList`. ListColumn also registers a plain
	 * useDroppable (`list-<id>-cards`, see ListColumn.jsx's cardDropRef) that
	 * covers the empty space below the last card — and the whole area of an
	 * empty column — so a card can still be dropped there even though no
	 * CardItem exists to collide with. move() doesn't know that id maps to a
	 * list, so it can't resolve it and returns `cardsByList` back unchanged.
	 * When that happens, fall back to reading the destination list straight
	 * off the droppable's own `data.listId` (set in ListColumn.jsx).
	 *
	 * Strips the card out of every bucket first, then appends it to the
	 * resolved destination, instead of assuming it currently lives in
	 * exactly one place — that's what makes this fallback idempotent.
	 */
	if (moved === cardsByList) {
		const targetListId = event.operation.target?.data?.listId;
		const card = Object.values(cardsByList).flat().find(c => c.id === cardId);

		if (targetListId == null || !card) return cardsByList;

		const withoutCard = Object.fromEntries(
			Object.entries(cardsByList).map(([listId, cards]) => [listId, cards.filter(c => c.id !== cardId)])
		);

		moved = {
			...withoutCard,
			[targetListId]: [...(withoutCard[targetListId] ?? []), card],
		};
	}

	/*
	 * move() does NOT update the moved card's own `.listId` field when it
	 * crosses lists — the object is relocated into the destination array
	 * as-is. CardItem reads `card.listId` as its sortable `group`, so leaving
	 * it stale would desync the card's group from the list it now visually
	 * sits in for the rest of the drag, not just after drop.
	 */
	const destination = Object.entries(moved).find(
		([, cards]) => cards.some(card => card.id === cardId)
	);
	if (!destination) return moved;

	const [listIdKey, cardsInList] = destination;
	const listId = Number(listIdKey);

	return {
		...moved,
		[listId]: cardsInList.map(card =>
			card.id === cardId ? { ...card, listId } : card
		),
	};
}

/**
 * BoardDetailPage component.
 *
 * Full-page view for an individual board identified by the `:boardId` URL
 * parameter. Renders a board header bar and a horizontally-scrollable row of
 * list columns with drag-and-drop reordering.
 *
 * @component
 * @returns {JSX.Element} The rendered detail page, a loading spinner, or an
 *   error banner depending on fetch state.
 */
export default function BoardDetailPage() {
	/*
	 * URL Parameter
	 * ─────────────────────────────────────────────────────────────────────
	 * Extract the `boardId` dynamic segment from the current URL.
	 * useParams() always returns strings, so it is converted to a number
	 * before being passed to hooks that expect a numeric ID.
	 */
	const { boardId } = useParams();

	/*
	 * Data Fetching
	 * ─────────────────────────────────────────────────────────────────────
	 * useLists   — fetches all lists for this board; also exposes mutation
	 *              helpers (createNewList, deleteExistingList, updateListOrder).
	 * useBoardDetails — fetches the board record (name, metadata).
	 * Both hooks are keyed on the numeric boardId; they re-fetch automatically
	 * if the ID changes (e.g. navigating between boards).
	 */
	const { lists, loading: loadingList, error: errorList, updateListOrder, createNewList, deleteExistingList } = useLists(Number(boardId));

	const { board, loading: loadingBoard, error: errorBoard } = useBoardDetails(Number(boardId));

	/*
	 * Card Data — Board Level
	 * ──────────────────────────────────────────────────────────────────
	 * useBoardCards owns the cards for EVERY list on this board in one record
	 * keyed by list ID, chosen over each ListColumn calling useCards for itself,
	 * because per-column hooks left each column's cards in a private closure that
	 * this drag handler could not read — and a cross-list card move needs both the
	 * source and destination arrays in one place.
	 *
	 * Keyed on boardId rather than the lists array, because the board-scoped
	 * endpoint means the fetch no longer needs to know which list IDs exist. Cards
	 * therefore load in parallel with lists instead of after them, and reordering
	 * lists never triggers a card refetch.
	 */
	const {
		cardsByList,
		loading: loadingCards,
		fetchError: errorCards,
		mutationError: cardMutationError,
		setMutationError: setCardMutationError,
		submitCreateCard,
		submitDeleteCard,
		updateCardOrder,
		persistCardPosition,
	} = useBoardCards(Number(boardId));

	/*
	 * Snapshots of cardsByList/lists taken at the start of each drag, used to
	 * revert onDragOver's live updates if the drag is cancelled (e.g. Escape)
	 * — see handleDragEnd's cancel guard and onDragStart below. Refs rather
	 * than state because writing them must never itself trigger a re-render.
	 */
	const previousCardsByList = useRef(cardsByList);
	const previousLists = useRef(lists);

	/**
	 * Handle the end of a drag-and-drop operation on the board.
	 *
	 * Called by DragDropProvider's `onDragEnd` event, which fires for both list
	 * column drags (type: 'list') and card drags (type: 'card') since they share
	 * this single provider. Branches on the dragged item's type:
	 *   - 'list' — computes the new list order, updates local state immediately
	 *              for a responsive UI, then persists the new order to the
	 *              backend as an array of list IDs.
	 *   - 'card' — computes the new cardsByList record (same-list reorder or
	 *              cross-list move), re-ranks the dragged card against its new
	 *              neighbors, updates local state immediately for a responsive
	 *              UI, then persists the card's new list + rank to the backend.
	 *
	 * @param {import('@dnd-kit/react').DragEndEvent} event - The dnd-kit drag
	 *   end event containing source/target descriptors and a `canceled` flag.
	 */
	function handleDragEnd(event) {
		/* Guard: drag was cancelled (e.g. user pressed Escape). */
		if (event.canceled) {
			updateCardOrder(previousCardsByList.current);
			updateListOrder(previousLists.current);
			return;
		}

		/* Guard: no valid drop target — dragged outside any droppable zone. */
		if (event.operation.target === null) {
			return;
		}

		/*
		 * Branch on the dragged item's `type`, read from the source descriptor.
		 * DragDropProvider is shared by both list columns (type: 'list') and
		 * individual cards (type: 'card'), so this handler must only run the
		 * list-reorder logic below for list drags.
		 */
		const draggedType = event.operation.source?.type;

		if (draggedType === 'card') {
			const cardId = fromDndId(event.operation.source.id);
			const moved = moveCardsByList(cardsByList, event);

			const destination = Object.entries(moved).find(
				([, cards]) => cards.some(card => card.id === cardId)
			);

			/* No bucket contains the dragged card — nothing valid to persist. */
			if (!destination) return;

			const [listIdKey, cardsInList] = destination;
			const listId = Number(listIdKey);
			const index = cardsInList.findIndex(card => card.id === cardId);

			/*
			 * Rank the card between its new neighbors (undefined at either end of
			 * the list, which generateRank treats as "no bound on that side").
			 */
			const position = generateRank(cardsInList[index - 1]?.position, cardsInList[index + 1]?.position);

			const nextCardsByList = {
				...moved,
				[listId]: cardsInList.map((card, i) =>
					i === index ? { ...card, listId, position } : card
				),
			};

			/* Update local state immediately for a responsive UI. */
			updateCardOrder(nextCardsByList);

			/* Persist the card's new list + rank to the backend. */
			persistCardPosition(cardId, listId, position);

			return;
		}

		/*
		 * Unlike cards, lists is kept live-in-sync unconditionally by
		 * onDragOver on every hover frame (see its comment — there's no
		 * cross-group complication to gate on for lists), so by the time the
		 * drop completes, lists is already in its final order here.
		 *
		 * Deliberately NOT calling move(lists, event) again: move() re-derives
		 * the shift from the drag event's tracked source.index versus the
		 * array's current position, and re-running it against an
		 * already-settled array (rather than the pre-drag array it expects)
		 * could compute a redundant shift that partially undoes the live
		 * reorder instead of confirming it.
		 */

		/* Persist the current (already up to date) order to the backend as an array of IDs. */
		reorderLists(lists.map(list => list.id));
	}

	/**
	 * Render the floating drag preview for whatever is currently being dragged.
	 *
	 * DragOverlay renders this into a dedicated, React-owned node that dnd-kit
	 * targets as its drag feedback instead of the real CardItem/ListColumn
	 * element (see CardPreview.jsx for why that matters: without an overlay,
	 * dnd-kit relocates the real dragged DOM node via the Popover API, which
	 * raced with React's own reconciliation on a cross-list card move and threw
	 * `NotFoundError: Failed to execute 'removeChild'`). `source` is dnd-kit's
	 * Draggable instance for the in-progress drag, not our own card/list object,
	 * so it's looked up by id here.
	 *
	 * @param {import('@dnd-kit/dom').Draggable|null} source - The draggable
	 *   currently being dragged, or null when no drag is in progress.
	 * @returns {JSX.Element|null}
	 */
	function renderDragOverlay(source) {
		if (!source) return null;

		if (source.type === 'card') {
			const cardId = fromDndId(source.id);
			const card = Object.values(cardsByList).flat().find(c => c.id === cardId);
			if (!card) return null;
			return <CardPreview card={card} />;
		}

		if (source.type === 'list') {
			const listId = fromDndId(source.id);
			const list = lists.find(l => l.id === listId);
			if (!list) return null;
			return <ListColumnPreview list={list} cardCount={(cardsByList[list.id] ?? []).length} />;
		}

		return null;
	}

	/*
	 * Loading State
	 * ─────────────────────────────────────────────────────────────────────
	 * Show a spinner while either the board metadata or the lists are still
	 * in-flight. Both must be ready before the page can render meaningfully.
	 */
	if (loadingList === true || loadingBoard === true || loadingCards === true) {
		return <CircularProgress aria-label="Loading…" />;
	}

	/*
	 * Error State
	 * ─────────────────────────────────────────────────────────────────────
	 * Surface a single error banner if either fetch failed. Individual error
	 * messages from each hook are not surfaced here to keep the UI simple.
	 */
	if (errorList !== null || errorBoard !== null || errorCards !== null) {
		return <Alert variant="filled" severity="error">An error has occurred.</Alert>;
	}

	/*
	 * Render
	 * ─────────────────────────────────────────────────────────────────────
	 * Happy path — both board metadata and lists are loaded.
	 *
	 * Layout structure:
	 *   DragDropProvider              (drag-and-drop context)
	 *     └─ Page canvas Box          (full viewport, dark bg + radial gradient)
	 *          ├─ Board header Bar    (board name, bottom border)
	 *          └─ List columns area   (horizontally scrollable, flex row)
	 *               └─ Lists          (columns + "add new list" form)
	 */
	return (
		<DragDropProvider
			onDragEnd={handleDragEnd}
			onDragStart={() => {
				previousCardsByList.current = cardsByList;
				previousLists.current = lists;
			}}
			onDragOver={(event) => {
				const { source } = event.operation;

				/*
				 * List drags have no cross-group complication the way cards do —
				 * every ListColumn is rendered by this same single Lists.jsx
				 * component, mapping over the one `lists` array, so reordering it
				 * live is just a same-array reindex (no unmount/remount risk).
				 * Safe to commit on every hover frame unconditionally.
				 */
				if (source?.type === 'list') {
					updateListOrder(prev => {
						/*
						 * Same id-collision concern as moveCardsByList above: move()
						 * matches against each list's `.id` field, so lists are
						 * temporarily given their dnd-kit registry id for this call.
						 */
						const dndLists = prev.map(list => ({ ...list, id: toListDndId(list.id) }));
						const movedDnd = move(dndLists, event);
						if (movedDnd === dndLists) return prev;
						return movedDnd.map(list => ({ ...list, id: fromDndId(list.id) }));
					});
					return;
				}

				updateCardOrder(prev => {
					const cardId = source.id;
					const currentListId = Object.entries(prev).find(
						([, cards]) => cards.some(card => card.id === cardId)
					)?.[0];

					const moved = moveCardsByList(prev, event);
					const movedListId = Object.entries(moved).find(
						([, cards]) => cards.some(card => card.id === cardId)
					)?.[0];

					/*
					 * Only commit this live update when the card is still in the list
					 * it started in. A cross-list move relocates the card out of one
					 * ListColumn's <Cards> subtree and into another's — React can't
					 * reconcile that by key the way it can a same-list reindex; it has
					 * to unmount the CardItem and mount a new one. Doing that on every
					 * hover frame, while dnd-kit's own drag registration for that exact
					 * DOM node is still active, left a stale "ghost" card behind. Same-
					 * list reorders stay within the same <Cards> instance, so those are
					 * safe to apply live — and it's specifically this state update,
					 * causing React to reindex the card, that drives the shift
					 * animation (see moveCardsByList's doc comment). Cross-list moves
					 * are instead finalized once, in handleDragEnd, after the drag has
					 * already ended.
					 */
					if (movedListId !== currentListId) return prev;

					return moved;
				});
			}}
		>
			{/*
			  * Page canvas — full-viewport dark background with a subtle violet
			  * radial gradient in the top-right corner.
			  */}
			<Box
				sx={{
					height: '100vh',
					bgcolor: 'background.default',
					backgroundImage: 'radial-gradient(ellipse at 85% 20%, rgba(109,40,217,0.35) 0%, transparent 55%)',
					color: 'text.primary',
					display: 'flex',
					flexDirection: 'column',
				}}
			>
				{/*
				  * Board header bar — displays the board name with a subtle
				  * bottom border that separates it from the list columns area.
				  */}
				<Box
					sx={theme => ({
						bgcolor: 'background.default',
						px: 3,
						py: 1.5,
						display: 'flex',
						alignItems: 'center',
						borderBottom: `1px solid ${theme.palette.badge.bg}`,
					})}
				>
					<Typography
						sx={{
							fontWeight: 700,
							color: 'text.primary',
							fontSize: '1.25rem',
						}}
					>{board.name}</Typography>
				</Box>

				{/*
				  * List columns area — horizontally scrollable flex container.
				  * Fills the remaining viewport height below the header bar and
				  * passes create/delete handlers down to Lists.
				  */}
				<Box
					sx={{
						px: 3,
						py: 2,
						flex: 1,
						overflowY: 'hidden',
						overflowX: 'auto',
					}}
				>
					<Lists
						lists={lists}
						createNewList={createNewList}
						deleteExistingList={deleteExistingList}
						cardsByList={cardsByList}
						onCreateCard={submitCreateCard}
						onDeleteCard={submitDeleteCard}
						cardMutationError={cardMutationError}
						onDismissCardMutationError={() => setCardMutationError(null)}
					/>
				</Box>
			</Box>
			<DragOverlay>{renderDragOverlay}</DragOverlay>
		</DragDropProvider>
	);
}
