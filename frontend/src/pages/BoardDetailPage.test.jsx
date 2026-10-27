/**
 * @fileoverview Tests for `BoardDetailPage`, against an MSW stand-in for the
 * backend (see src/test/server.js).
 *
 * The page is rendered at `/boards/7` inside a memory router, with the real
 * hooks, columns, cards and edit dialog. Only two things are replaced:
 *
 *   - `DragDropProvider` / `DragOverlay` are wrapped so the test can reach the
 *     handlers the page passes them. jsdom has no layout (every element is
 *     0×0), so dnd-kit can never resolve a real pointer drag here. Instead the
 *     tests call `onDragStart` / `onDragOver` / `onDragEnd` with synthetic
 *     events shaped like dnd-kit's, and assert on what the user would see and
 *     on the request the drop sends. The real provider still renders, so the
 *     columns' and cards' `useSortable` registrations run as in the app.
 *   - `TimeLogSection` is stubbed, as in the CardEditDialog tests: it has its
 *     own MSW-backed tests, and the dialog would otherwise fetch three
 *     time-log endpoints just to open.
 *
 * Synthetic events: a list drag's `source.index` is the projected index
 * dnd-kit tracks during the drag, which `move()` reads to reorder an array.
 * A card drag's source carries a minimal `manager`, because `move()` reads
 * the pointer position off it before resolving a move between keyed buckets
 * (with no `shape` on the target, the card lands before the target card).
 */

import { act, screen, waitFor, within } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../test/apiUrl';
import { renderWithTheme } from '../test/render';
import { server } from '../test/server';
import BoardDetailPage from './BoardDetailPage';

/* Latest props the page gave the provider, and the overlay's render function. */
const dnd = vi.hoisted(() => ({ handlers: null, renderOverlay: null }));

vi.mock('@dnd-kit/react', async (importOriginal) => {
	const actual = await importOriginal();
	return {
		...actual,
		DragDropProvider: (props) => {
			dnd.handlers = props;
			return <actual.DragDropProvider {...props} />;
		},
		DragOverlay: ({ children }) => {
			dnd.renderOverlay = children;
			return null;
		},
	};
});

vi.mock('../features/timeLogs', () => ({
	TimeLogSection: ({ cardId }) => <p>Time tracking for card {cardId}</p>,
}));

/** Build a card; only the fields the page and its children read are meaningful. */
function makeCard(id, listId, position, overrides = {}) {
	return { id, title: `Card ${id}`, priority: 'Medium', listId, position, ...overrides };
}

/** A non-2xx response with a status text, so `api.js` builds a full message. */
function serverError(status = 500, statusText = 'Internal Server Error') {
	return new HttpResponse(null, { status, statusText });
}

const LISTS = [
	{ id: 3, name: 'To Do', boardId: 7 },
	{ id: 4, name: 'Doing', boardId: 7 },
];

/**
 * Serve board 7 with its lists and cards. Each of `board`, `lists`, `cards`
 * may be an MSW resolver instead of data, to fail or count that request.
 */
function serveBoard({ board = { id: 7, name: 'Roadmap' }, lists = LISTS, cards = [] } = {}) {
	const respond = (value) =>
		typeof value === 'function' ? value : () => HttpResponse.json({ data: value });
	server.use(
		http.get(apiUrl('/api/boards/7'), respond(board)),
		http.get(apiUrl('/api/lists'), respond(lists)),
		http.get(apiUrl('/api/cards'), respond(cards))
	);
}

/**
 * Render the page at `url` (default `/boards/7`). The router comes back with
 * the render result, so tests can read the URL the page leaves behind.
 */
function renderPage(url = '/boards/7') {
	const router = createMemoryRouter([{ path: '/boards/:boardId', element: <BoardDetailPage /> }], {
		initialEntries: [url],
	});
	return { router, ...renderWithTheme(<RouterProvider router={router} />) };
}

/** Render the page and wait until the lists and cards have loaded. */
async function renderLoaded(data, url) {
	serveBoard(data);
	const view = renderPage(url);
	await screen.findByLabelText('To Do', { selector: 'section' });
	await waitFor(() => expect(screen.queryByLabelText('Loading cards…')).not.toBeInTheDocument());
	return view;
}

/*
 * A column is a <section> named by its list name. It's found by that name
 * rather than by role: dnd-kit gives every draggable `role="button"` (with
 * `aria-roledescription="draggable"`), so a column isn't a `region`, and a
 * card isn't a `listitem`.
 */
function column(name) {
	return screen.getByLabelText(name, { selector: 'section' });
}

/** Column names, left to right. */
function columnOrder() {
	return [...document.querySelectorAll('section[aria-label]')].map((section) =>
		section.getAttribute('aria-label')
	);
}

/** Titles of the `Card <id>` cards in a column, top to bottom. */
function cardTitles(name) {
	return within(column(name))
		.queryAllByText(/^Card \d+$/)
		.map((title) => title.textContent);
}

/** A card drag's source descriptor, with the manager `move()` reads. */
function cardSource(cardId) {
	return {
		id: `card-${cardId}`,
		type: 'card',
		manager: { dragOperation: { position: { current: { x: 0, y: 0 } } } },
	};
}

/** Run a drag handler the page gave the provider, flushing its state updates. */
function fire(name, event) {
	act(() => dnd.handlers[name](event));
}

describe('BoardDetailPage', () => {
	describe('loading', () => {
		it('shows the board name, its columns, and each column’s cards in order', async () => {
			const requestedBoardIds = [];
			serveBoard({
				lists: ({ request }) => {
					requestedBoardIds.push(new URL(request.url).searchParams.get('boardId'));
					return HttpResponse.json({ data: LISTS });
				},
				cards: [makeCard(1, 3, '00001000'), makeCard(5, 4, '00001000'), makeCard(2, 3, '00002000')],
			});

			renderPage();

			expect(screen.getByLabelText('Loading board…')).toBeInTheDocument();
			expect(screen.getByLabelText('Loading lists…')).toBeInTheDocument();
			expect(await screen.findByText('Roadmap')).toBeInTheDocument();
			await waitFor(() => expect(cardTitles('To Do')).toEqual(['Card 1', 'Card 2']));
			expect(cardTitles('Doing')).toEqual(['Card 5']);
			expect(requestedBoardIds).toEqual(['7']);
		});

		it('keeps the columns usable when only the board name fails, and retries it', async () => {
			let calls = 0;
			const { user } = await renderLoaded({
				board: () => {
					calls += 1;
					return calls === 1
						? serverError()
						: HttpResponse.json({ data: { id: 7, name: 'Roadmap' } });
				},
			});

			const alert = await screen.findByRole('alert');
			expect(alert).toHaveTextContent("Couldn't load this board");
			expect(column('Doing')).toBeInTheDocument();

			await user.click(within(alert).getByRole('button', { name: 'Retry' }));

			expect(await screen.findByText('Roadmap')).toBeInTheDocument();
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});

		it('shows a lists error with Retry in place of the columns', async () => {
			let calls = 0;
			serveBoard({
				lists: () => {
					calls += 1;
					return calls === 1 ? serverError() : HttpResponse.json({ data: LISTS });
				},
			});
			const { user } = renderPage();

			const alert = await screen.findByRole('alert');
			expect(alert).toHaveTextContent("Couldn't load lists");
			expect(columnOrder()).toEqual([]);

			await user.click(within(alert).getByRole('button', { name: 'Retry' }));

			expect(await screen.findByLabelText('To Do', { selector: 'section' })).toBeInTheDocument();
		});

		/*
		 * One banner for the whole board, since the single board-wide request
		 * isn't scoped to a column; each column only says its cards are
		 * unavailable, and hides its add-card button.
		 */
		it('shows one cards banner above the columns, then fills them on Retry', async () => {
			let calls = 0;
			serveBoard({
				cards: () => {
					calls += 1;
					return calls === 1
						? serverError()
						: HttpResponse.json({ data: [makeCard(1, 3, '00001000')] });
				},
			});
			const { user } = renderPage();

			const alert = await screen.findByRole('alert');
			expect(alert).toHaveTextContent("Couldn't load cards");
			expect(within(column('To Do')).getByText('Cards unavailable')).toBeInTheDocument();
			expect(within(column('Doing')).getByText('Cards unavailable')).toBeInTheDocument();
			expect(
				within(column('To Do')).queryByRole('button', { name: 'Add card' })
			).not.toBeInTheDocument();

			await user.click(within(alert).getByRole('button', { name: 'Retry' }));

			await waitFor(() => expect(cardTitles('To Do')).toEqual(['Card 1']));
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
			expect(within(column('Doing')).getByText('No cards yet')).toBeInTheDocument();
		});
		/* Until the lists are on screen, their placeholders already cover the area. */
		it('holds the cards banner back while the lists are still loading', async () => {
			let releaseLists;
			const listsHeld = new Promise((resolve) => {
				releaseLists = resolve;
			});
			const cardsFailed = new Promise((resolve) => {
				serveBoard({
					lists: async () => {
						await listsHeld;
						return HttpResponse.json({ data: LISTS });
					},
					cards: () => {
						resolve();
						return serverError();
					},
				});
			});
			renderPage();

			await cardsFailed;
			await screen.findByText('Roadmap');
			expect(screen.getByLabelText('Loading lists…')).toBeInTheDocument();
			expect(screen.queryByRole('alert')).not.toBeInTheDocument();

			releaseLists();

			expect(await screen.findByRole('alert')).toHaveTextContent("Couldn't load cards");
		});
	});

	describe('editing a card', () => {
		it('opens the dialog for a clicked card and saves with its priority merged in', async () => {
			const { user } = await renderLoaded({
				cards: [makeCard(1, 3, '00001000', { title: 'Fix login', priority: 'High' })],
			});
			let body;
			server.use(
				http.put(apiUrl('/api/cards/1'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: makeCard(1, 3, '00001000', { ...body }) });
				})
			);

			await user.click(within(column('To Do')).getByText('Fix login'));
			const dialog = await screen.findByRole('dialog', { name: 'Fix login' });
			await user.click(within(dialog).getByRole('button', { name: 'Fix login' }));
			const input = within(dialog).getByRole('textbox', { name: 'Card title' });
			await user.clear(input);
			await user.type(input, 'Fix logout{Enter}');

			/*
			 * Priority is a full replace on the backend, so a title-only save
			 * must still carry the card's current priority.
			 */
			await waitFor(() => expect(body).toEqual({ priority: 'High', title: 'Fix logout' }));
			expect(await within(column('To Do')).findByText('Fix logout')).toBeInTheDocument();
		});

		it('closes the dialog from its close button', async () => {
			const { user } = await renderLoaded({ cards: [makeCard(1, 3, '00001000')] });

			await user.click(within(column('To Do')).getByText('Card 1'));
			const dialog = await screen.findByRole('dialog', { name: 'Card 1' });
			await user.click(within(dialog).getByRole('button', { name: 'Close' }));

			await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
		});
	});

	describe('card link (?card=<id>)', () => {
		it('puts the open card in the URL, and takes it out again on close', async () => {
			const { user, router } = await renderLoaded({ cards: [makeCard(1, 3, '00001000')] });

			await user.click(within(column('To Do')).getByText('Card 1'));
			const dialog = await screen.findByRole('dialog', { name: 'Card 1' });

			expect(router.state.location.search).toBe('?card=1');

			await user.click(within(dialog).getByRole('button', { name: 'Close' }));

			await waitFor(() => expect(router.state.location.search).toBe(''));
		});

		/*
		 * Replacing the entry, not pushing one, so Back leaves the board
		 * instead of stepping through every card opened on it.
		 */
		it('replaces the history entry rather than adding one', async () => {
			const { user, router } = await renderLoaded({ cards: [makeCard(1, 3, '00001000')] });

			await user.click(within(column('To Do')).getByText('Card 1'));
			await screen.findByRole('dialog', { name: 'Card 1' });

			expect(router.state.historyAction).toBe('REPLACE');
		});

		it('opens the linked card once the cards load, as after a refresh', async () => {
			const { router } = await renderLoaded(
				{ cards: [makeCard(1, 3, '00001000'), makeCard(2, 4, '00001000')] },
				'/boards/7?card=2'
			);

			expect(await screen.findByRole('dialog', { name: 'Card 2' })).toBeInTheDocument();
			expect(router.state.location.search).toBe('?card=2');
		});

		it('drops a link to a card that isn’t on this board', async () => {
			const { router } = await renderLoaded(
				{ cards: [makeCard(1, 3, '00001000')] },
				'/boards/7?card=99'
			);

			await waitFor(() => expect(router.state.location.search).toBe(''));
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('drops a malformed card id', async () => {
			const { router } = await renderLoaded(
				{ cards: [makeCard(1, 3, '00001000')] },
				'/boards/7?card=abc'
			);

			await waitFor(() => expect(router.state.location.search).toBe(''));
			expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
		});

		it('keeps the link through a failed card load, and opens it on Retry', async () => {
			let failing = true;
			serveBoard({
				cards: () =>
					failing ? serverError() : HttpResponse.json({ data: [makeCard(1, 3, '00001000')] }),
			});
			const { user, router } = renderPage('/boards/7?card=1');

			const retry = await screen.findByRole('button', { name: 'Retry' });
			expect(router.state.location.search).toBe('?card=1');

			failing = false;
			await user.click(retry);

			expect(await screen.findByRole('dialog', { name: 'Card 1' })).toBeInTheDocument();
		});
	});

	describe('dragging a list', () => {
		const THREE_LISTS = [...LISTS, { id: 5, name: 'Done', boardId: 7 }];

		/** Hover list 3 over list 4, so it's projected into index 1, the way dnd-kit reports it. */
		function dragFirstListOverSecond() {
			fire('onDragStart');
			fire('onDragOver', {
				operation: { source: { id: 'list-3', type: 'list', index: 1 }, target: { id: 'list-4' } },
			});
		}

		it('reorders the columns live while hovering, then persists the order on drop', async () => {
			await renderLoaded({ lists: THREE_LISTS });
			let body;
			server.use(
				http.patch(apiUrl('/api/lists/reorder'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ success: true });
				})
			);

			dragFirstListOverSecond();
			expect(columnOrder()).toEqual(['Doing', 'To Do', 'Done']);

			fire('onDragEnd', {
				canceled: false,
				operation: { source: { id: 'list-3', type: 'list' }, target: { id: 'list-4' } },
			});

			await waitFor(() => expect(body).toEqual([4, 3, 5]));
			expect(columnOrder()).toEqual(['Doing', 'To Do', 'Done']);
		});

		it('puts the columns back and explains why when the server rejects the order', async () => {
			await renderLoaded({ lists: THREE_LISTS });
			server.use(http.patch(apiUrl('/api/lists/reorder'), () => serverError()));

			dragFirstListOverSecond();
			fire('onDragEnd', {
				canceled: false,
				operation: { source: { id: 'list-3', type: 'list' }, target: { id: 'list-4' } },
			});

			await waitFor(() => expect(columnOrder()).toEqual(['To Do', 'Doing', 'Done']));
			expect(within(column('To Do')).getByRole('alert')).toHaveTextContent(
				"Couldn't save the new list order: HTTP error: 500 Internal Server Error"
			);
		});

		/* No reorder handler is declared, so any request would fail the test. */
		it('restores the pre-drag order without saving when the drag is cancelled', async () => {
			await renderLoaded({ lists: THREE_LISTS });

			dragFirstListOverSecond();
			fire('onDragEnd', {
				canceled: true,
				operation: { source: { id: 'list-3', type: 'list' }, target: null },
			});

			expect(columnOrder()).toEqual(['To Do', 'Doing', 'Done']);
		});

		it('saves nothing when the list is dropped outside any column', async () => {
			await renderLoaded({ lists: THREE_LISTS });

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: { id: 'list-3', type: 'list' }, target: null },
			});

			expect(columnOrder()).toEqual(['To Do', 'Doing', 'Done']);
		});
	});

	describe('dragging a card', () => {
		/** Capture `PATCH /api/cards/:id/reorder` bodies, keyed by card id. */
		function captureReorders() {
			const bodies = {};
			server.use(
				http.patch(apiUrl('/api/cards/:id/reorder'), async ({ request, params }) => {
					bodies[params.id] = await request.json();
					return HttpResponse.json({ data: { id: Number(params.id), ...bodies[params.id] } });
				})
			);
			return bodies;
		}

		it('reorders within a list and ranks the card between its new neighbours', async () => {
			await renderLoaded({
				cards: [makeCard(1, 3, '00001000'), makeCard(2, 3, '00002000'), makeCard(3, 3, '00003000')],
			});
			const bodies = captureReorders();

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(3), target: { id: 'card-2' } },
			});

			expect(cardTitles('To Do')).toEqual(['Card 1', 'Card 3', 'Card 2']);
			await waitFor(() => expect(bodies[3]).toEqual({ listId: 3, position: '00001500' }));
		});

		it('moves a card onto a card in another list, landing before it', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000'), makeCard(5, 4, '00001000')] });
			const bodies = captureReorders();

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(1), target: { id: 'card-5' } },
			});

			expect(cardTitles('To Do')).toEqual([]);
			expect(cardTitles('Doing')).toEqual(['Card 1', 'Card 5']);
			await waitFor(() => expect(bodies[1]).toEqual({ listId: 4, position: '00000500' }));
		});

		/*
		 * An empty column has no card to collide with; the drop lands on the
		 * column's own droppable (`list-<id>-cards`), which carries its listId.
		 */
		it('moves a card into an empty list through the column’s drop zone', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000')] });
			const bodies = captureReorders();

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(1), target: { id: 'list-4-cards', data: { listId: 4 } } },
			});

			expect(within(column('To Do')).getByText('No cards yet')).toBeInTheDocument();
			expect(cardTitles('Doing')).toEqual(['Card 1']);
			await waitFor(() => expect(bodies[1]).toEqual({ listId: 4, position: '00001000' }));
		});

		/* The drop zone also covers the space below a column's last card. */
		it('appends a card dropped below another list’s last card', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000'), makeCard(5, 4, '00001000')] });
			const bodies = captureReorders();

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(1), target: { id: 'list-4-cards', data: { listId: 4 } } },
			});

			expect(cardTitles('Doing')).toEqual(['Card 5', 'Card 1']);
			await waitFor(() => expect(bodies[1]).toEqual({ listId: 4, position: '00002000' }));
		});

		it('rolls a rejected move back and shows the error in the destination column', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000'), makeCard(5, 4, '00001000')] });
			server.use(http.patch(apiUrl('/api/cards/1/reorder'), () => serverError(409, 'Conflict')));

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(1), target: { id: 'card-5' } },
			});

			await waitFor(() => expect(cardTitles('To Do')).toEqual(['Card 1']));
			expect(cardTitles('Doing')).toEqual(['Card 5']);
			expect(within(column('Doing')).getByRole('alert')).toHaveTextContent(
				"Couldn't move the card: HTTP error: 409 Conflict"
			);
		});

		/*
		 * No room between ranks 1000 and 1001: instead of a reorder, the whole
		 * destination list is re-spaced in its new order, which also moves the
		 * card there. No reorder handler is declared, so one would fail the test.
		 */
		it('rebalances the destination list when the gap between neighbours is exhausted', async () => {
			await renderLoaded({
				cards: [makeCard(1, 3, '00001000'), makeCard(2, 3, '00001001'), makeCard(9, 4, '00001000')],
			});
			let body;
			server.use(
				http.patch(apiUrl('/api/lists/3/cards/rebalance'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({
						data: body.map((id, i) => makeCard(id, 3, String((i + 1) * 1000).padStart(8, '0'))),
					});
				})
			);

			fire('onDragStart');
			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(9), target: { id: 'card-2' } },
			});

			await waitFor(() => expect(body).toEqual([1, 9, 2]));
			expect(cardTitles('To Do')).toEqual(['Card 1', 'Card 9', 'Card 2']);
			expect(within(column('Doing')).getByText('No cards yet')).toBeInTheDocument();
		});

		it('keeps a same-list hover live, and puts it back when the drag is cancelled', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000'), makeCard(2, 3, '00002000')] });

			fire('onDragStart');
			fire('onDragOver', { operation: { source: cardSource(2), target: { id: 'card-1' } } });
			expect(cardTitles('To Do')).toEqual(['Card 2', 'Card 1']);

			fire('onDragEnd', { canceled: true, operation: { source: cardSource(2), target: null } });

			expect(cardTitles('To Do')).toEqual(['Card 1', 'Card 2']);
		});

		/*
		 * Applying a cross-list hover live remounts the card in another column
		 * mid-drag, which left a ghost card behind; the move waits for the drop.
		 */
		it('leaves a card in its own list while it hovers over another, then moves it on drop', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000'), makeCard(5, 4, '00001000')] });
			const bodies = captureReorders();

			fire('onDragStart');
			fire('onDragOver', { operation: { source: cardSource(1), target: { id: 'card-5' } } });

			expect(cardTitles('To Do')).toEqual(['Card 1']);
			expect(cardTitles('Doing')).toEqual(['Card 5']);

			fire('onDragEnd', {
				canceled: false,
				operation: { source: cardSource(1), target: { id: 'card-5' } },
			});

			expect(cardTitles('Doing')).toEqual(['Card 1', 'Card 5']);
			await waitFor(() => expect(bodies[1]).toEqual({ listId: 4, position: '00000500' }));
		});
	});

	describe('drag overlay', () => {
		it('previews the dragged card, or the dragged list with its cards', async () => {
			await renderLoaded({ cards: [makeCard(1, 3, '00001000', { title: 'Fix login' })] });

			const cardPreview = renderWithTheme(dnd.renderOverlay({ id: 'card-1', type: 'card' }));
			expect(within(cardPreview.container).getByText('Fix login')).toBeInTheDocument();
			cardPreview.unmount();

			const listPreview = renderWithTheme(dnd.renderOverlay({ id: 'list-3', type: 'list' }));
			expect(within(listPreview.container).getByText('To Do')).toBeInTheDocument();
			expect(within(listPreview.container).getByText('Fix login')).toBeInTheDocument();

			expect(dnd.renderOverlay(null)).toBeNull();
			expect(dnd.renderOverlay({ id: 'card-99', type: 'card' })).toBeNull();
		});
	});
});
