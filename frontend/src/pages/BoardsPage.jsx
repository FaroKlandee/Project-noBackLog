/**
 * @file BoardsPage.jsx
 * @description Route-level page component for the boards listing view.
 *
 * Rendered when the user navigates to `/boards`. Acts as a thin composition
 * root — it delegates all data-fetching and rendering to the `Boards` feature
 * component, keeping the pages layer free of business logic.
 *
 * Route: `/boards`
 */

/*
 * Import
 * ───────────────────────────────────────────────────────────────────────────
 * Boards — feature component that fetches all boards via `useBoards` and
 *          renders them as a responsive grid of BoardCard items.
 */
import { Boards } from "../features/boards/index.js";

/**
 * BoardsPage component.
 *
 * Thin page wrapper that renders the `Boards` feature component.
 * All data-fetching and presentation logic lives inside `Boards`.
 *
 * @component
 * @returns {JSX.Element} The full boards listing view.
 */
export default function BoardsPage() {
	return (
		<Boards />
	)
}
