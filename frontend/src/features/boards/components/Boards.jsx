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
 * Box, Skeleton — MUI layout wrapper and loading placeholders.
 * useBoards  — custom hook that fetches all boards and exposes
 *              { boards, loading, error, reload } state.
 * BoardCard  — presentational card component for a single board.
 * LoadError  — shared error banner with a Retry action.
 */
import { Box, Skeleton } from "@mui/material";
import { useBoards } from "../hooks/useBoards";
import BoardCard from "./BoardCard";
import LoadError from "../../../shared/components/LoadError";

/*
 * Shared grid layout, so the loading placeholders occupy exactly the cells
 * the real BoardCards will.
 */
const GRID_SX = { display: 'grid', gap: 1, gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' };

/**
 * Boards component.
 *
 * Fetches all boards via `useBoards` and renders them as a responsive
 * auto-fill grid of BoardCard components. Handles loading and error states
 * with traffic-light early returns before reaching the happy-path render.
 *
 * @component
 * @returns {JSX.Element} Loading placeholders, an error banner with Retry, or
 *   a grid of BoardCards.
 */
export default function Boards() {
	/*
	 * Data Fetching
	 * ─────────────────────────────────────────────────────────────────────
	 * useBoards calls GET /api/boards/ on mount and returns the boards array
	 * alongside loading and error state.
	 */
	const { boards, loading, error, reload } = useBoards();

	/*
	 * Loading State
	 * ─────────────────────────────────────────────────────────────────────
	 * Board-card-shaped placeholders in the same grid, while the HTTP request
	 * is in-flight.
	 */
	if (loading === true) {
		return (
			<Box sx={GRID_SX} aria-label="Loading boards…">
				{[0, 1, 2].map(i => <Skeleton key={i} variant="rounded" height={72} />)}
			</Box>
		);
	}

	/*
	 * Error State
	 * ─────────────────────────────────────────────────────────────────────
	 * Surface the failure with its message and a Retry action.
	 */
	if (error != null) {
		return <LoadError title="Couldn't load boards" message={error} onRetry={reload} />;
	}

	/*
	 * Render — Happy Path
	 * ─────────────────────────────────────────────────────────────────────
	 * Render a responsive auto-fill grid of BoardCard components. Each card
	 * is keyed by board.id for efficient reconciliation. When no boards exist
	 * a plain text fallback is shown instead of an empty grid.
	 */
	return (
		<Box sx={GRID_SX}>
			{boards.length === 0 ? "No boards yet" : boards.map((board) => (
				<BoardCard key={board.id} board={board} />
			))}
		</Box>
	)
}
