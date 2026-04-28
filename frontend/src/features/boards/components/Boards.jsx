/**
 * @file Boards.jsx
 * @description Container component that fetches and renders all boards
 * belonging to the current user. Acts as the top-level view for the
 * boards listing page in the nobacklog project management app.
 */

/*
 * useBoards is a custom hook that encapsulates all data-fetching logic
 * for the boards collection (loading state, error state, and the data itself).
 */
import { Alert, Box, CircularProgress } from "@mui/material";
import { useBoards } from "../hooks/useBoards";

/*
 * BoardCard is the presentational component used to render each individual
 * board as a clickable Material UI card with a link to that board's detail page.
 */
import BoardCard from "./BoardCard";

/**
 * Boards component — the primary listing view for all project boards.
 *
 * Responsibilities:
 * - Invokes the `useBoards` hook to retrieve the full list of boards from
 *   the API, along with associated loading and error states.
 * - Renders a fallback message when no boards exist yet.
 * - Maps over the fetched boards array and renders a `BoardCard` for each entry.
 *
 * Note: Loading and error states are currently logged to the console for
 * debugging purposes but are not yet reflected in the UI. Future iterations
 * should handle these states visually (e.g. a spinner or error banner).
 *
 * @component
 * @returns {JSX.Element|string} A list of `BoardCard` components, or the
 *   string "No boards yet" when the boards array is empty.
 *
 * @example
 * // Used as a route-level component, e.g. on the /boards page:
 * <Boards />
 */
export default function Boards() {
	/*
	 * Destructure the three pieces of state exposed by useBoards:
	 *   boards  — the array of board objects returned from the API
	 *   loading — boolean; true while the fetch request is in flight
	 *   error   — holds an error message string if the fetch failed, otherwise null
	 */
	const { boards, loading, error } = useBoards();

	if (loading) {
		return <CircularProgress aria-label={`Loading boards...`} />;
	}

	if (error) {
		return (
			<Alert variant="filled" severity="error" color="error">
				Failed to load boards.
			</Alert>
		);
	}

	return (
		<Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'}}>
			{boards.length === 0 ? "No boards yet" : boards.map((board) => (
				/*
				 * BoardCard receives the full board object as a prop.
				 * The `key` prop is set to `board.id` (the unique database identifier)
				 * so that React can efficiently reconcile the list when it changes
				 * (e.g. after a board is added or removed).
				 */
				<BoardCard key={board.id} board={board} />
			))}
		</Box>
		/*
		 * Ternary guard: if the boards array is empty (either because none exist
		 * yet, or because the fetch hasn't resolved) render a plain-text fallback.
		 * Otherwise, iterate over the boards and render a BoardCard for each one.
		 */

	)
}
