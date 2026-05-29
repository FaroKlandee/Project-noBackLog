import { useParams } from "react-router";
import { useLists, Lists } from "../features/lists/";
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useBoardDetails } from "../features/boards";
import { Box, Typography } from "@mui/material";
import { DragDropProvider } from "@dnd-kit/react";
import { move } from "@dnd-kit/helpers";
import { reorderLists } from "../features/lists/";

/*
 * @file BoardDetailPage.jsx
 * @description Route-level page component for displaying the detail view of a
 * single board. This page is rendered when the user navigates to
 * `/boards/:boardId`. It is responsible for:
 *   1. Reading the dynamic `:boardId` segment from the URL.
 *   2. Fetching all lists that belong to that board via the `useLists` hook.
 *   3. Rendering board-specific content (lists, cards, etc.) once the data
 *      layer is wired up further.
 *
 * This component sits in the `pages/` layer of the Feature-Sliced Design
 * hierarchy, meaning it acts purely as a composition root — it delegates all
 * data fetching and UI to feature-level hooks and components.
 */

/**
 * BoardDetailPage component.
 *
 * Serves as the full-page view for an individual board, identified by the
 * `boardId` URL parameter. It fetches the lists associated with that board and
 * will eventually render them as columns (Trello-style).
 *
 * Route: `/boards/:boardId`
 *
 * @component
 * @returns {JSX.Element} The rendered detail page for the board identified by
 *   the current URL's `boardId` parameter.
 *
 * @example
 * // Rendered automatically by React Router when the user visits:
 * //   http://localhost:5173/boards/3
 * // The `:boardId` segment ("3") is extracted and used to load the board's
 * // lists from the backend.
 */
export default function BoardDetailPage() {
	/*
	 * Extract the `boardId` dynamic route parameter from the current URL.
	 *
	 * `useParams()` is a React Router hook that returns an object whose keys
	 * map to the named segments defined in the route path.
	 * For the route `/boards/:boardId`, navigating to `/boards/5` yields:
	 *   { boardId: "5" }
	 *
	 * Note: URL parameters are always strings, so `boardId` must be explicitly
	 * converted to a number before being passed to hooks or API calls that
	 * expect a numeric ID.
	 *
	 * @type {{ boardId: string }}
	 */
	const { boardId } = useParams();

	/*
	 * Fetch all lists that belong to this board.
	 *
	 * `useLists` is a custom React hook (defined in
	 * `features/lists/hooks/useLists.js`) that:
	 *   - Accepts a numeric board ID.
	 *   - Calls `GET /api/lists?boardId=<id>` via the shared API client.
	 *   - Returns `{ lists, loading, error }` state managed internally with
	 *     `useState` and `useEffect`.
	 *
	 * `Number(boardId)` converts the string URL param to the integer the API
	 * expects. Passing a non-numeric string here would result in `NaN`, so a
	 * future improvement could add validation before calling the hook.
	 *
	 * @type {{ lists: Array<Object>, loading: boolean, error: string|null }}
	 */
	const { lists, loading: loadingList, error: errorList, updateListOrder, createNewList, deleteExistingList } = useLists(Number(boardId));

	const { board, loading: loadingBoard, error: errorBoard } = useBoardDetails(Number(boardId));

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
		 * move() from @dnd-kit/helpers uses the full event object (source index
		 * and target index) to return a new ordered array of full list objects.
		 */
		const newOrderedLists = move(lists, event);

		/* Update local state immediately for a responsive UI. */
		updateListOrder(newOrderedLists);

		/* Persist the new order to the backend as an array of IDs. */
		reorderLists(newOrderedLists.map(list => list.id));
	}

	if (loadingList === true || loadingBoard === true) {
		return <CircularProgress aria-label="Loading…" />;
	}

	if (errorList !== null || errorBoard !== null) {
		return <Alert variant="filled" severity="error">An error has occurred.</Alert>;
	}

	return (
		<DragDropProvider onDragEnd={handleDragEnd}>
			{/*
			  * Outermost wrapper for the board detail layout.
			  * Will eventually contain the board header, list columns, and
			  * card drag-and-drop functionality once the feature is complete.
			  */}
			<Box
				sx={{
					minHeight: '100vh',
					bgcolor: '#0D0B1E',
					backgroundImage: 'radial-gradient(ellipse at 85% 20%, rgba(109,40,217,0.35) 0%, transparent 55%)',
					color: '#fff',
				}}
			>
				<Box
					sx={{
						bgcolor: '#0D0B1E',
						px: 3,
						py: 1.5,
						display: 'flex',
						alignItems: 'center',
						borderBottom: '1px solid #1E1B3A',
					}}
				>
					<Typography
						sx={{
							fontWeight: 700,
							color: '#fff',
							fontSize: '1.25rem',
						}}
					>{board.name}</Typography>
				</Box>
				<Box
					sx={{
						px: 3,
						py: 2,
					}}
				>
					{/*
					  * Render the Lists presenter component, passing the lists array
					  * from the useLists hook response. Lists is purely presentational —
					  * it does not fetch data itself, it only renders what it receives.
					  */}
					<Lists lists={lists} createNewList={createNewList} deleteExistingList={deleteExistingList} />
				</Box>
			</Box>
		</DragDropProvider>
	);
}
