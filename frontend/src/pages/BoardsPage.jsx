/**
 * @file BoardsPage.jsx
 * @description Route-level page component that renders the full boards listing view.
 *
 * This is the page component mounted at the `/boards` route (defined in
 * `src/app/routes.jsx`). Its sole responsibility is to act as a thin
 * composition layer: it imports the self-contained `Boards` feature component
 * and renders it inside the page tree. Keeping page components thin like this
 * separates routing concerns from feature/business logic.
 *
 * Hierarchy:
 *   RouterProvider  (src/app/main.jsx)
 *     └─ BoardsPage            ← YOU ARE HERE
 *          └─ Boards           (src/features/boards/components/Boards.jsx)
 *               └─ BoardCard[] (src/features/boards/components/BoardCard.jsx)
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

/**
 * `Boards` is the feature-level smart component responsible for:
 *   - Fetching all boards from the backend via the `useBoards` hook
 *   - Rendering a `BoardCard` for every board returned by the API
 *   - Displaying a fallback message when no boards exist yet
 *
 * It is re-exported from the boards feature's public barrel file
 * (`src/features/boards/index.js`) so page components never import
 * directly from deep internal paths — this keeps the feature's internals
 * encapsulated and free to be reorganised without touching page files.
 */
import { Boards } from "../features/boards/index.js";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * BoardsPage
 *
 * The top-level page component rendered at the `/boards` route.
 *
 * Responsibilities:
 *   - Provide a stable, named entry-point that the router can mount.
 *   - Delegate all data-fetching and rendering logic to the `Boards`
 *     feature component, keeping the page itself free of business logic.
 *
 * This component intentionally contains no local state, no hooks, and no
 * direct API calls. Any future additions that are truly page-scoped (e.g. a
 * page-level heading, breadcrumb navigation, or an "Add Board" button that
 * lives outside the feature) should be added here rather than inside the
 * feature component, preserving the separation of concerns.
 *
 * @component
 * @returns {JSX.Element} The boards listing page, composed of the `Boards` feature component.
 *
 * @example
 * // This component is mounted automatically by React Router when the user
 * // navigates to /boards. You would not normally render it manually, but
 * // it can be used directly in tests:
 * <BoardsPage />
 */
export default function BoardsPage() {
	return (
		// Render the Boards feature component.
		// All data-fetching (via useBoards), loading/error state handling,
		// and the list-of-BoardCard rendering all happen inside <Boards />.
		// BoardsPage itself stays as a pure, stateless wrapper.
		<Boards />
	)
}