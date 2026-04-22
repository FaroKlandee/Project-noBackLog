/**
 * @file routes.jsx
 * @description Defines the client-side route configuration for the nobacklog application.
 *
 * This file wires together URL paths and the React page components that should
 * render at those paths. It uses React Router v7's `createBrowserRouter`, which
 * leverages the HTML5 History API (pushState / popState) to enable clean URLs
 * without hash fragments (e.g. `/boards` instead of `/#/boards`).
 *
 * The exported `router` instance is consumed by `<RouterProvider>` in main.jsx,
 * making routing available to the entire component tree.
 */

import { createBrowserRouter } from "react-router";

/**
 * Import the two top-level page components that are each mapped to a route.
 *
 * `BoardsPage`      – Renders the full list of boards (the app's "home" view).
 * `BoardDetailPage` – Renders the detail view for a single board, including
 *                     its lists and cards. Requires a `boardId` URL parameter.
 *
 * Both are re-exported from the pages barrel file (`src/pages/index.js`),
 * which keeps import paths short and the pages directory self-contained.
 */
import { BoardDetailPage, BoardsPage } from "../pages/index";

/**
 * @constant {import('react-router').Router} router
 *
 * The application's single router instance, created with `createBrowserRouter`.
 *
 * `createBrowserRouter` accepts a flat array of route objects. Each route object
 * describes:
 *   - `path`    {string}      – The URL pattern to match. Segments prefixed with
 *                               a colon (`:boardId`) are dynamic parameters that
 *                               React Router captures and makes available via the
 *                               `useParams()` hook inside the rendered component.
 *   - `element` {JSX.Element} – The React component tree to render when the
 *                               current URL matches `path`.
 *
 * Route definitions:
 *
 * 1. `/boards`
 *    Renders `<BoardsPage>`, which displays all boards belonging to the user.
 *    Acts as the primary landing / dashboard view of the application.
 *
 * 2. `/boards/:boardId`
 *    Renders `<BoardDetailPage>`, which displays the detail view of a specific
 *    board. The `:boardId` segment is a dynamic parameter — e.g. navigating to
 *    `/boards/42` will set `boardId` to `"42"` inside `BoardDetailPage`.
 *    The component converts this string to a number before passing it to the
 *    `useLists` hook that fetches the board's lists from the API.
 */
const router = createBrowserRouter([
	{
		/*
		 * Route 1: Boards list page — matches the exact path "/boards".
		 */
		path: "/boards",
		element: <BoardsPage/>,
	},
	{
		/*
		 * Route 2: Board detail page — matches "/boards/<any id>" where
		 * `:boardId` is a named dynamic segment captured from the URL.
		 * Example: "/boards/7" → boardId = "7"
		 */
		path: "/boards/:boardId",
		element: <BoardDetailPage/>,
	}
]);

/**
 * Export the configured router so it can be provided to the app via
 * `<RouterProvider router={router}>` in main.jsx.
 *
 * Named export (rather than default) is used here so the consuming file
 * can import it with an explicit, self-documenting name: `{ router }`.
 */
export {router};