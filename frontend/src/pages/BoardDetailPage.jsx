import { useParams } from "react-router";
import { useLists, Lists } from "../features/lists/";
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useBoardDetails } from "../features/boards";
import { Typography } from "@mui/material";

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
	const { lists, loading: loadingList, error: errorList } = useLists(Number(boardId));

	const { board, loading: loadingBoard, error: errorBoard } = useBoardDetails(Number(boardId));

	if (loadingList === true || loadingBoard === true) {
		return <CircularProgress aria-label="Loading…" />;
	}

	if (errorList !== null || errorBoard !== null) {
		return <Alert variant="filled" severity="error">An error has occurred.</Alert>;
	}

	return (
		/*
		 * Outermost wrapper for the board detail layout.
		 * Will eventually contain the board header, list columns, and
		 * card drag-and-drop functionality once the feature is complete.
		 */
		<div>
			<Typography gutterBottom variant='h5'>{board.name}</Typography>
			{/*
			  * Render the Lists presenter component, passing the lists array
			  * from the useLists hook response. Lists is purely presentational —
			  * it does not fetch data itself, it only renders what it receives.
			  */}
			<Lists lists={lists} />
		</div>
	);
}
