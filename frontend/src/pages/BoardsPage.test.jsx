/**
 * @fileoverview Tests for `BoardsPage` (and the `Boards` grid it renders),
 * against an MSW stand-in for the backend (see src/test/server.js).
 *
 * The page renders inside a memory router with the app's two routes, so a
 * board card is a real link and clicking it really navigates. The detail
 * route is a stub that echoes the `:boardId` it was given: the detail page has
 * its own tests, and here only the link target matters.
 */

import { screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryRouter, useParams } from 'react-router';
import { describe, expect, it } from 'vitest';
import { apiUrl } from '../test/apiUrl';
import { renderWithTheme } from '../test/render';
import { server } from '../test/server';
import BoardsPage from './BoardsPage';

/** Stand-in for BoardDetailPage: shows which board the route resolved to. */
function BoardRouteStub() {
	const { boardId } = useParams();
	return <p>Board route {boardId}</p>;
}

/** Render the page at `/boards` inside a router that also knows the detail route. */
function renderPage() {
	const router = createMemoryRouter(
		[
			{ path: '/boards', element: <BoardsPage /> },
			{ path: '/boards/:boardId', element: <BoardRouteStub /> },
		],
		{ initialEntries: ['/boards'] }
	);
	return renderWithTheme(<RouterProvider router={router} />);
}

/** Declare `GET /api/boards/` answering with the given boards. */
function serveBoards(boards) {
	server.use(http.get(apiUrl('/api/boards/'), () => HttpResponse.json({ data: boards })));
}

describe('BoardsPage', () => {
	it('shows placeholders while loading, then one link per board', async () => {
		serveBoards([
			{ id: 1, name: 'Sprint 1' },
			{ id: 2, name: 'Sprint 2' },
		]);

		renderPage();

		expect(screen.getByLabelText('Loading boards…')).toBeInTheDocument();
		expect(await screen.findByRole('link', { name: 'Sprint 1' })).toHaveAttribute(
			'href',
			'/boards/1'
		);
		expect(screen.getByRole('link', { name: 'Sprint 2' })).toHaveAttribute('href', '/boards/2');
		expect(screen.queryByLabelText('Loading boards…')).not.toBeInTheDocument();
	});

	it('says so when there are no boards', async () => {
		serveBoards([]);

		renderPage();

		expect(await screen.findByText('No boards yet')).toBeInTheDocument();
		expect(screen.queryByRole('link')).not.toBeInTheDocument();
	});

	it('navigates to the board’s detail route when a board is clicked', async () => {
		serveBoards([{ id: 7, name: 'Roadmap' }]);
		const { user } = renderPage();

		await user.click(await screen.findByRole('link', { name: 'Roadmap' }));

		expect(screen.getByText('Board route 7')).toBeInTheDocument();
	});

	it('shows the server error, then recovers on Retry', async () => {
		let calls = 0;
		server.use(
			http.get(apiUrl('/api/boards/'), () => {
				calls += 1;
				return calls === 1
					? new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' })
					: HttpResponse.json({ data: [{ id: 1, name: 'Sprint 1' }] });
			})
		);
		const { user } = renderPage();

		const alert = await screen.findByRole('alert');
		expect(alert).toHaveTextContent("Couldn't load boards");
		expect(alert).toHaveTextContent('HTTP error: 500 Internal Server Error');

		await user.click(screen.getByRole('button', { name: 'Retry' }));

		expect(await screen.findByRole('link', { name: 'Sprint 1' })).toBeInTheDocument();
		await waitFor(() => expect(screen.queryByRole('alert')).not.toBeInTheDocument());
	});
});
