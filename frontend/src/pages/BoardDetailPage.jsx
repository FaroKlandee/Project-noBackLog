import { useParams } from "react-router";
import { useLists, Lists } from "../features/lists/";
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import { useBoardDetails } from "../features/boards";
import { Box, Divider, Typography } from "@mui/material";
import { lightBlue } from "@mui/material/colors";

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
			<Box
  sx={{
    minHeight: '100vh',
    background: `
      radial-gradient(circle at 20% 0%, rgba(124,58,237,0.25), transparent 40%),
      radial-gradient(circle at 80% 100%, rgba(147,51,234,0.2), transparent 50%),
      linear-gradient(
        130deg,
        transparent 25%,
        rgba(168, 85, 247, 0.12) 30%,
        rgba(124, 58, 237, 0.35) 35%,
        rgba(168, 85, 247, 0.12) 50%,
        transparent 75%
      ),

      #0B0120
    `,
    color: '#E9D5FF',
  }}
>
			<Box
  sx={{
    position: 'relative',
    px: 3,
    py: 2,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: `
      linear-gradient(
        90deg,
        rgba(12, 10, 35, 0.96) 0%,
        rgba(24, 13, 54, 0.94) 45%,
        rgba(45, 14, 83, 0.88) 100%
      )
    `,
    backdropFilter: 'blur(12px)',
    borderBottom: '1px solid rgba(168, 85, 247, 0.4)',
    boxShadow: `
      0 1px 0 rgba(168, 85, 247, 0.6),
      0 6px 25px rgba(124, 58, 237, 0.25)
    `,
    overflow: 'hidden',
    '&::before': {
      content: '""',
      position: 'absolute',
      inset: 0,
      background: `
        radial-gradient(circle at 20% 50%, rgba(124,58,237,0.35), transparent 60%),
        radial-gradient(circle at 80% 50%, rgba(147,51,234,0.25), transparent 60%)
      `,
      opacity: 0.6,
      zIndex: 0,
    },

    '& > *': {
      position: 'relative',
      zIndex: 1,
    },
  }}
>
	<Typography
  variant="h5"
  sx={{
    fontWeight: 600,
    color: '#E9D5FF',
    letterSpacing: '0.3px',
    textShadow: '0 0 12px rgba(124, 58, 237, 0.6)',
    display: 'flex',
    alignItems: 'center',
    gap: 1,
  }}
				>{board.name}
				</Typography>
			</Box>
			<Divider
  sx={{
    mx: 3,
    my: 1.5,
    borderColor: 'transparent',
    height: '1px',
    background: 'linear-gradient(90deg, transparent, #3B1F5C, transparent)',
    opacity: 0.6,
    boxShadow: '0 0 8px rgba(168, 85, 247, 0.6)',
  }}
/>
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
				<Lists lists={lists} />
			</Box>
		</Box>
	);
}
