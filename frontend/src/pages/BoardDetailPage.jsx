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
import { useLists, Lists } from "../features/lists/";
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useBoardDetails } from "../features/boards";
import { Box, Typography } from "@mui/material";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { reorderLists } from "../features/lists/";

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

	/**
	 * Handle the end of a drag-and-drop list reorder operation.
	 *
	 * Called by DragDropProvider's `onDragEnd` event. Computes the new list
	 * order, updates local state immediately for a responsive UI, then persists
	 * the new order to the backend as an array of list IDs.
	 *
	 * @param {import('@dnd-kit/react').DragEndEvent} event - The dnd-kit drag
	 *   end event containing source/target indices and a `canceled` flag.
	 */
	function handleDragEnd(event) {
		/* Guard: drag was cancelled (e.g. user pressed Escape). */
		if (event.canceled) {
			return;
		}

		/* Guard: no valid drop target — dragged outside any droppable zone. */
		if (event.operation.target === null) {
			return;
		}

		/*
		 * move() uses the drag event's source and target indices to return a
		 * new array of list objects in the updated order.
		 */
		const newOrderedLists = move(lists, event);

		/* Update local state immediately for a responsive UI. */
		updateListOrder(newOrderedLists);

		/* Persist the new order to the backend as an array of IDs. */
		reorderLists(newOrderedLists.map(list => list.id));
	}

	/*
	 * Loading State
	 * ─────────────────────────────────────────────────────────────────────
	 * Show a spinner while either the board metadata or the lists are still
	 * in-flight. Both must be ready before the page can render meaningfully.
	 */
	if (loadingList === true || loadingBoard === true) {
		return <CircularProgress aria-label="Loading…" />;
	}

	/*
	 * Error State
	 * ─────────────────────────────────────────────────────────────────────
	 * Surface a single error banner if either fetch failed. Individual error
	 * messages from each hook are not surfaced here to keep the UI simple.
	 */
	if (errorList !== null || errorBoard !== null) {
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
		<DragDropProvider onDragEnd={handleDragEnd}>
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
					<Lists lists={lists} createNewList={createNewList} deleteExistingList={deleteExistingList} />
				</Box>
			</Box>
		</DragDropProvider>
	);
}
