/**
 * @file Boards.jsx
 * @description Container component for the boards listing view.
 *
 * Calls the `useBoards` hook to fetch all boards and applies traffic-light
 * early returns for loading and error states before rendering the happy-path
 * board grid. Each board is rendered as a `BoardCard` component.
 *
 * Hierarchy:
 *   BoardsPage (pages layer)
 *     └─ Boards  ← YOU ARE HERE
 *          └─ BoardCard (one per board)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * Alert, Box, CircularProgress — MUI components for error banner, layout
 *                                wrapper, and loading spinner respectively.
 * useBoards  — custom hook that fetches all boards and exposes
 *              { boards, loading, error } state.
 * BoardCard  — presentational card component for a single board.
 */
import { Alert, Box, CircularProgress } from "@mui/material";
import { useBoards } from "../hooks/useBoards";
import BoardCard from "./BoardCard";

/**
 * Boards component.
 *
 * Fetches all boards via `useBoards` and renders them as a responsive
 * auto-fill grid of BoardCard components. Handles loading and error states
 * with traffic-light early returns before reaching the happy-path render.
 *
 * @component
 * @returns {JSX.Element} A spinner, an error banner, or a grid of BoardCards.
 */
export default function Boards() {
	/*
	 * Data Fetching
	 * ─────────────────────────────────────────────────────────────────────
	 * useBoards calls GET /api/boards/ on mount and returns the boards array
	 * alongside loading and error state.
	 */
	const { boards, loading, error } = useBoards();

	/*
	 * Loading State
	 * ─────────────────────────────────────────────────────────────────────
	 * Show a spinner while the HTTP request is in-flight.
	 */
	if (loading === true) {
		return <CircularProgress aria-label={`Loading boards...`} />;
	}

	/*
	 * Error State
	 * ─────────────────────────────────────────────────────────────────────
	 * Surface an error banner if the fetch failed for any reason.
	 */
	if (error != null) {
		return (
			<Alert variant="filled" severity="error" color="error">
				Failed to load boards.
			</Alert>
		);
	}

	/*
	 * Render — Happy Path
	 * ─────────────────────────────────────────────────────────────────────
	 * Render a responsive auto-fill grid of BoardCard components. Each card
	 * is keyed by board.id for efficient reconciliation. When no boards exist
	 * a plain text fallback is shown instead of an empty grid.
	 */
	return (
		<Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))'}}>
			{boards.length === 0 ? "No boards yet" : boards.map((board) => (
				<BoardCard key={board.id} board={board} />
			))}
		</Box>
	)
}
