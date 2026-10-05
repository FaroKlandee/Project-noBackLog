/**
 * @fileoverview Tests for the `useLists` hook, against an MSW stand-in for the
 * backend (see src/test/server.js).
 *
 * Covers the hook's state transitions (loading → loaded / error → reload) and,
 * for every mutation, both the success path and the server-rejects path —
 * including the rollback contract `persistListOrder` documents.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiUrl } from '../../../test/apiUrl';
import { server } from '../../../test/server';
import { useLists } from './useLists';

const todo = { id: 1, name: 'To Do', boardId: 7, position: 0 };
const doing = { id: 2, name: 'Doing', boardId: 7, position: 1 };
const done = { id: 3, name: 'Done', boardId: 7, position: 2 };

/** A non-2xx response with a status text, so `api.js` builds a full message. */
function serverError(status = 500, statusText = 'Internal Server Error') {
	return new HttpResponse(null, { status, statusText });
}

/** Declare `GET /api/lists?boardId=…` answering with the given lists. */
function serveLists(lists) {
	server.use(http.get(apiUrl('/api/lists'), () => HttpResponse.json({ data: lists })));
}

/** Render the hook for board 7 and wait until its initial fetch has settled. */
async function renderLoaded(lists = [todo, doing, done]) {
	serveLists(lists);
	const hook = renderHook(() => useLists(7));
	await waitFor(() => expect(hook.result.current.loading).toBe(false));
	return hook;
}

describe('useLists', () => {
	describe('initial fetch', () => {
		it('starts loading, then exposes the board’s lists', async () => {
			let requestedBoardId;
			server.use(
				http.get(apiUrl('/api/lists'), ({ request }) => {
					requestedBoardId = new URL(request.url).searchParams.get('boardId');
					return HttpResponse.json({ data: [todo, doing] });
				})
			);

			const { result } = renderHook(() => useLists(7));

			expect(result.current.loading).toBe(true);
			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current.lists).toEqual([todo, doing]);
			expect(result.current.fetchError).toBeNull();
			expect(requestedBoardId).toBe('7');
		});

		it('exposes the server error and no lists when the fetch fails', async () => {
			server.use(http.get(apiUrl('/api/lists'), () => serverError()));

			const { result } = renderHook(() => useLists(7));

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current.fetchError).toBe('HTTP error: 500 Internal Server Error');
			expect(result.current.lists).toEqual([]);
		});

		it('recovers on reload after a failed fetch', async () => {
			let calls = 0;
			server.use(
				http.get(apiUrl('/api/lists'), () => {
					calls += 1;
					return calls === 1 ? serverError() : HttpResponse.json({ data: [todo] });
				})
			);

			const { result } = renderHook(() => useLists(7));
			await waitFor(() => expect(result.current.fetchError).not.toBeNull());

			act(() => result.current.reload());

			await waitFor(() => expect(result.current.lists).toEqual([todo]));
			expect(result.current.fetchError).toBeNull();
			expect(calls).toBe(2);
		});

		/*
		 * Board 1's response is held until board 2's has already been applied,
		 * then released. Without the hook's `cancelled` flag, the late board-1
		 * response would overwrite board 2's lists.
		 */
		it('ignores a late response from a board the user has already left', async () => {
			const board1Lists = [{ ...todo, boardId: 1 }];
			const board2Lists = [{ ...doing, boardId: 2 }];
			let releaseBoard1;
			const board1Gate = new Promise((resolve) => {
				releaseBoard1 = resolve;
			});
			let board1Answered;
			const board1Done = new Promise((resolve) => {
				board1Answered = resolve;
			});

			server.use(
				http.get(apiUrl('/api/lists'), async ({ request }) => {
					if (new URL(request.url).searchParams.get('boardId') === '1') {
						await board1Gate;
						board1Answered();
						return HttpResponse.json({ data: board1Lists });
					}
					return HttpResponse.json({ data: board2Lists });
				})
			);

			const { result, rerender } = renderHook(({ boardId }) => useLists(boardId), {
				initialProps: { boardId: 1 },
			});
			rerender({ boardId: 2 });
			await waitFor(() => expect(result.current.lists).toEqual(board2Lists));

			/* Release board 1, then give its response time to reach the hook. */
			await act(async () => {
				releaseBoard1();
				await board1Done;
				await new Promise((resolve) => setTimeout(resolve, 50));
			});

			expect(result.current.lists).toEqual(board2Lists);
			expect(result.current.loading).toBe(false);
		});
	});

	describe('createNewList', () => {
		it('posts the name and board, appends the created list, and resolves true', async () => {
			const { result } = await renderLoaded([todo]);
			let body;
			server.use(
				http.post(apiUrl('/api/lists/'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: doing }, { status: 201 });
				})
			);

			let created;
			await act(async () => {
				created = await result.current.createNewList('Doing');
			});

			expect(created).toBe(true);
			expect(body).toEqual({ name: 'Doing', boardId: 7 });
			expect(result.current.lists).toEqual([todo, doing]);
			expect(result.current.mutationError).toBeNull();
		});

		it('resolves false and reports an error with no list id when the server rejects it', async () => {
			const { result } = await renderLoaded([todo]);
			server.use(http.post(apiUrl('/api/lists/'), () => serverError(400, 'Bad Request')));

			let created;
			await act(async () => {
				created = await result.current.createNewList('Doing');
			});

			expect(created).toBe(false);
			expect(result.current.lists).toEqual([todo]);
			expect(result.current.mutationError).toEqual({
				listId: null,
				message: 'HTTP error: 400 Bad Request',
			});
		});
	});

	describe('deleteExistingList', () => {
		it('removes the list once the server confirms', async () => {
			const { result } = await renderLoaded();
			server.use(http.delete(apiUrl('/api/lists/2'), () => HttpResponse.json({ success: true })));

			await act(() => result.current.deleteExistingList(2));

			expect(result.current.lists).toEqual([todo, done]);
		});

		it('keeps the list and reports the error scoped to it when the server rejects it', async () => {
			const { result } = await renderLoaded();
			server.use(http.delete(apiUrl('/api/lists/2'), () => serverError(404, 'Not Found')));

			await act(() => result.current.deleteExistingList(2));

			expect(result.current.lists).toEqual([todo, doing, done]);
			expect(result.current.mutationError).toEqual({
				listId: 2,
				message: 'HTTP error: 404 Not Found',
			});
		});
	});

	describe('renameList', () => {
		/*
		 * The PUT must carry only `name`: the backend treats a missing boardId /
		 * position as "unchanged", so a name-only payload can't move the list.
		 */
		it('sends only the new name and renames the list in place', async () => {
			const { result } = await renderLoaded();
			let body;
			server.use(
				http.put(apiUrl('/api/lists/2'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: { ...doing, name: 'In Progress' } });
				})
			);

			await act(() => result.current.renameList(2, 'In Progress'));

			expect(body).toEqual({ name: 'In Progress' });
			expect(result.current.lists.map((list) => list.name)).toEqual([
				'To Do',
				'In Progress',
				'Done',
			]);
		});

		it('keeps the old name and reports the error scoped to the list when rejected', async () => {
			const { result } = await renderLoaded();
			server.use(http.put(apiUrl('/api/lists/2'), () => serverError()));

			await act(() => result.current.renameList(2, 'In Progress'));

			expect(result.current.lists[1].name).toBe('Doing');
			expect(result.current.mutationError).toEqual({
				listId: 2,
				message: 'HTTP error: 500 Internal Server Error',
			});
		});
	});

	describe('updateListOrder + persistListOrder (drag-and-drop reorder)', () => {
		it('applies the new order immediately and keeps it once the server confirms', async () => {
			const { result } = await renderLoaded();
			const previous = result.current.lists;
			let body;
			server.use(
				http.patch(apiUrl('/api/lists/reorder'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ success: true });
				})
			);

			act(() => result.current.updateListOrder([done, todo, doing]));
			expect(result.current.lists).toEqual([done, todo, doing]);

			await act(() => result.current.persistListOrder([3, 1, 2], 3, previous));

			expect(body).toEqual([3, 1, 2]);
			expect(result.current.lists).toEqual([done, todo, doing]);
			expect(result.current.mutationError).toBeNull();
		});

		it('rolls back to the pre-drag order and reports the error on the dragged list', async () => {
			const { result } = await renderLoaded();
			const previous = result.current.lists;
			server.use(http.patch(apiUrl('/api/lists/reorder'), () => serverError()));

			act(() => result.current.updateListOrder([done, todo, doing]));
			await act(() => result.current.persistListOrder([3, 1, 2], 3, previous));

			expect(result.current.lists).toEqual([todo, doing, done]);
			expect(result.current.mutationError).toEqual({
				listId: 3,
				message: "Couldn't save the new list order: HTTP error: 500 Internal Server Error",
			});
		});
	});
});
