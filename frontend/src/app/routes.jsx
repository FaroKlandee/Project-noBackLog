/**
 * @file routes.jsx
 * @description Client-side route configuration for the nobacklog application.
 *
 * Uses React Router v7's `createBrowserRouter` (HTML5 History API) to define
 * clean URL routes without hash fragments. The exported `router` instance is
 * consumed by `<RouterProvider>` in main.jsx.
 *
 * Route map:
 *   /boards             → BoardsPage      (boards listing / dashboard)
 *   /boards/:boardId    → BoardDetailPage (single board with lists & cards)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * createBrowserRouter – React Router factory that builds a data router backed
 *                       by the HTML5 History API (pushState / popState).
 * BoardsPage          – Page component rendered at /boards.
 * BoardDetailPage     – Page component rendered at /boards/:boardId.
 */
import { createBrowserRouter } from "react-router";
import { BoardDetailPage, BoardsPage } from "../pages/index";

/**
 * @constant {import('react-router').Router} router
 *
 * The application's single router instance. Each route object maps a URL
 * pattern to a page component:
 *
 *   path  — URL pattern; segments prefixed with `:` are dynamic parameters
 *            captured by useParams() inside the rendered component.
 *   element — JSX element to render when the URL matches `path`.
 */
const router = createBrowserRouter([
	{
		/*
		 * Route 1 — Boards list page.
		 * Matches the exact path "/boards" and renders the full board grid.
		 */
		path: "/boards",
		element: <BoardsPage/>,
	},
	{
		/*
		 * Route 2 — Board detail page.
		 * Matches "/boards/<id>" where `:boardId` is a named dynamic segment.
		 * Example: "/boards/7" → boardId = "7" (string) inside BoardDetailPage.
		 */
		path: "/boards/:boardId",
		element: <BoardDetailPage/>,
	}
]);

/*
 * Export
 * ───────────────────────────────────────────────────────────────────────────
 * Named export so the consumer (main.jsx) imports with an explicit,
 * self-documenting name: `import { router } from './routes'`.
 */
export {router};
