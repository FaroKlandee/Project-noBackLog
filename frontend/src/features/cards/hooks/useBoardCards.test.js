/**
 * @fileoverview Tests for the `useBoardCards` hook, against an MSW stand-in for
 * the backend (see src/test/server.js).
 *
 * Beyond the load/error/reload transitions shared with useLists, this covers
 * what is specific to the board-wide card record: grouping by list, rank
 * generation on create (including the rebalance-first path when an append
 * would overflow), the deliberately different error contract of
 * `submitUpdateCard`, and the rollback of a drag the server rejects.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiUrl } from '../../../test/apiUrl';
import { server } from '../../../test/server';
import { useBoardCards } from './useBoardCards';

/** Build a card; only the fields the hook reads are meaningful. */
function makeCard(id, listId, position, overrides = {}) {
	return { id, title: `Card ${id}`, priority: 'Medium', listId, position, ...overrides };
}

/** A non-2xx response with a status text, so `api.js` builds a full message. */
function serverError(status = 500, statusText = 'Internal Server Error') {
	return new HttpResponse(null, { status, statusText });
}

/** Render the hook for board 7, serving `cards`, and wait for the load to settle. */
async function renderLoaded(cards) {
	server.use(http.get(apiUrl('/api/cards'), () => HttpResponse.json({ data: cards })));
	const hook = renderHook(() => useBoardCards(7));
	await waitFor(() => expect(hook.result.current.loading).toBe(false));
	return hook;
}

describe('useBoardCards', () => {
	describe('initial fetch', () => {
		/*
		 * The API orders the whole board by position, so lists interleave in the
		 * response. Grouping must keep each list's cards in response order, and
		 * a list with no cards gets no key at all (consumers read `?? []`).
		 */
		it('groups an interleaved board response into ordered, sparse per-list buckets', async () => {
			const a = makeCard(1, 3, '00001000');
			const x = makeCard(2, 4, '00001000');
			const b = makeCard(3, 3, '00002000');
			let requestedBoardId;
			server.use(
				http.get(apiUrl('/api/cards'), ({ request }) => {
					requestedBoardId = new URL(request.url).searchParams.get('boardId');
					return HttpResponse.json({ data: [a, x, b] });
				})
			);

			const { result } = renderHook(() => useBoardCards(7));

			expect(result.current.loading).toBe(true);
			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(requestedBoardId).toBe('7');
			expect(result.current.cardsByList).toEqual({ 3: [a, b], 4: [x] });
		});

		it('makes no request and stops loading when there is no board id', async () => {
			/* Any request would fail the test: no handler is declared. */
			const { result } = renderHook(() => useBoardCards(null));

			await waitFor(() => expect(result.current.loading).toBe(false));
			expect(result.current.cardsByList).toEqual({});
			expect(result.current.fetchError).toBeNull();
		});

		it('exposes the server error, then recovers on reload', async () => {
			const card = makeCard(1, 3, '00001000');
			let calls = 0;
			server.use(
				http.get(apiUrl('/api/cards'), () => {
					calls += 1;
					return calls === 1 ? serverError() : HttpResponse.json({ data: [card] });
				})
			);

			const { result } = renderHook(() => useBoardCards(7));
			await waitFor(() =>
				expect(result.current.fetchError).toBe('HTTP error: 500 Internal Server Error')
			);

			act(() => result.current.reload());

			await waitFor(() => expect(result.current.cardsByList).toEqual({ 3: [card] }));
			expect(result.current.fetchError).toBeNull();
		});
	});

	describe('submitCreateCard', () => {
		it('ranks the new card after the list’s last card and appends it', async () => {
			const first = makeCard(1, 3, '00001000');
			const second = makeCard(2, 3, '00002000');
			const { result } = await renderLoaded([first, second]);
			let body;
			server.use(
				http.post(apiUrl('/api/cards/'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: makeCard(9, 3, body.position, body) }, { status: 201 });
				})
			);

			await act(() => result.current.submitCreateCard(3, { title: 'New', priority: 'High' }));

			expect(body).toEqual({ title: 'New', priority: 'High', listId: 3, position: '00003000' });
			expect(result.current.cardsByList[3].map((card) => card.id)).toEqual([1, 2, 9]);
		});

		it('gives the first card in an empty list the first rank', async () => {
			const { result } = await renderLoaded([]);
			let body;
			server.use(
				http.post(apiUrl('/api/cards/'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: makeCard(9, 4, body.position) }, { status: 201 });
				})
			);

			await act(() => result.current.submitCreateCard(4, { title: 'New', priority: 'Low' }));

			expect(body.position).toBe('00001000');
			expect(result.current.cardsByList[4].map((card) => card.id)).toEqual([9]);
		});

		/*
		 * The last card sits so close to RANK_MAX that appending would overflow,
		 * so the list must be rebalanced *before* the card is created, and the
		 * new card ranked after the re-spaced last card.
		 */
		it('rebalances the list first when appending would overflow the rank width', async () => {
			const first = makeCard(1, 3, '50000000');
			const last = makeCard(2, 3, '99999500');
			const { result } = await renderLoaded([first, last]);
			const requests = [];
			server.use(
				http.patch(apiUrl('/api/lists/3/cards/rebalance'), async ({ request }) => {
					requests.push({ call: 'rebalance', body: await request.json() });
					return HttpResponse.json({
						data: [
							{ ...first, position: '00001000' },
							{ ...last, position: '00002000' },
						],
					});
				}),
				http.post(apiUrl('/api/cards/'), async ({ request }) => {
					const body = await request.json();
					requests.push({ call: 'create', body });
					return HttpResponse.json({ data: makeCard(9, 3, body.position) }, { status: 201 });
				})
			);

			await act(() => result.current.submitCreateCard(3, { title: 'New', priority: 'Medium' }));

			expect(requests).toEqual([
				{ call: 'rebalance', body: [1, 2] },
				{
					call: 'create',
					body: { title: 'New', priority: 'Medium', listId: 3, position: '00003000' },
				},
			]);
			expect(result.current.cardsByList[3].map((card) => [card.id, card.position])).toEqual([
				[1, '00001000'],
				[2, '00002000'],
				[9, '00003000'],
			]);
		});

		it('adds nothing and reports the error scoped to the list when the server rejects it', async () => {
			const card = makeCard(1, 3, '00001000');
			const { result } = await renderLoaded([card]);
			server.use(http.post(apiUrl('/api/cards/'), () => serverError(400, 'Bad Request')));

			await act(() => result.current.submitCreateCard(3, { title: 'New', priority: 'High' }));

			expect(result.current.cardsByList[3]).toEqual([card]);
			expect(result.current.mutationError).toEqual({
				listId: 3,
				message: 'HTTP error: 400 Bad Request',
			});
		});
	});

	describe('submitUpdateCard', () => {
		it('merges the server’s copy of the card into its list and returns it', async () => {
			const card = makeCard(1, 3, '00001000');
			const other = makeCard(2, 3, '00002000');
			const { result } = await renderLoaded([card, other]);
			/* The hook's own copy — `other` itself was serialized through the fake server. */
			const otherBefore = result.current.cardsByList[3][1];
			const updated = { ...card, title: 'Renamed', description: 'Details' };
			let body;
			server.use(
				http.put(apiUrl('/api/cards/1'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: updated });
				})
			);

			let returned;
			await act(async () => {
				returned = await result.current.submitUpdateCard(3, 1, {
					title: 'Renamed',
					description: 'Details',
					priority: 'Medium',
				});
			});

			expect(body).toEqual({ title: 'Renamed', description: 'Details', priority: 'Medium' });
			expect(returned).toEqual(updated);
			expect(result.current.cardsByList[3]).toEqual([updated, other]);
			/* Untouched cards keep their identity, so React can skip re-rendering them. */
			expect(result.current.cardsByList[3][1]).toBe(otherBefore);
		});

		/*
		 * Unlike create/delete, a failed update must reach the caller (so
		 * CardEditDialog can show it inline and stay open) rather than being
		 * stored as the board-level mutation error.
		 */
		it('rejects with the server error instead of storing it, leaving the card unchanged', async () => {
			const card = makeCard(1, 3, '00001000');
			const { result } = await renderLoaded([card]);
			server.use(http.put(apiUrl('/api/cards/1'), () => serverError(404, 'Not Found')));

			await act(async () => {
				await expect(
					result.current.submitUpdateCard(3, 1, { title: 'Renamed', priority: 'Medium' })
				).rejects.toThrow('HTTP error: 404 Not Found');
			});

			expect(result.current.mutationError).toBeNull();
			expect(result.current.cardsByList[3]).toEqual([card]);
		});
	});

	describe('submitDeleteCard', () => {
		it('removes the card once the server confirms', async () => {
			const keep = makeCard(1, 3, '00001000');
			const drop = makeCard(2, 3, '00002000');
			const { result } = await renderLoaded([keep, drop]);
			server.use(http.delete(apiUrl('/api/cards/2'), () => HttpResponse.json({ success: true })));

			await act(() => result.current.submitDeleteCard(3, 2));

			expect(result.current.cardsByList[3]).toEqual([keep]);
		});

		it('keeps the card and reports the error scoped to the list when rejected', async () => {
			const card = makeCard(1, 3, '00001000');
			const { result } = await renderLoaded([card]);
			server.use(http.delete(apiUrl('/api/cards/1'), () => serverError()));

			await act(() => result.current.submitDeleteCard(3, 1));

			expect(result.current.cardsByList[3]).toEqual([card]);
			expect(result.current.mutationError).toEqual({
				listId: 3,
				message: 'HTTP error: 500 Internal Server Error',
			});
		});
	});

	/*
	 * The drop handler in BoardDetailPage applies the move locally with
	 * `updateCardOrder`, then persists it with `persistCardPosition` (or
	 * `rebalanceList` when the gap is exhausted), passing the pre-drag record
	 * to restore on failure. These tests drive that same sequence.
	 */
	describe('drag-and-drop move', () => {
		const a = makeCard(1, 3, '00001000');
		const b = makeCard(2, 3, '00002000');
		const x = makeCard(3, 4, '00001000');

		it('keeps a cross-list move once the server confirms the new placement', async () => {
			const { result } = await renderLoaded([a, b, x]);
			const previous = result.current.cardsByList;
			const moved = { ...b, listId: 4, position: '00002000' };
			let body;
			server.use(
				http.patch(apiUrl('/api/cards/2/reorder'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: moved });
				})
			);

			act(() => result.current.updateCardOrder({ 3: [a], 4: [x, moved] }));
			await act(() => result.current.persistCardPosition(2, 4, '00002000', previous));

			expect(body).toEqual({ listId: 4, position: '00002000' });
			expect(result.current.cardsByList).toEqual({ 3: [a], 4: [x, moved] });
			expect(result.current.mutationError).toBeNull();
		});

		it('rolls the whole board back to its pre-drag state when the move is rejected', async () => {
			const { result } = await renderLoaded([a, b, x]);
			const previous = result.current.cardsByList;
			server.use(http.patch(apiUrl('/api/cards/2/reorder'), () => serverError()));

			act(() =>
				result.current.updateCardOrder({
					3: [a],
					4: [x, { ...b, listId: 4, position: '00002000' }],
				})
			);
			await act(() => result.current.persistCardPosition(2, 4, '00002000', previous));

			expect(result.current.cardsByList).toEqual({ 3: [a, b], 4: [x] });
			expect(result.current.mutationError).toEqual({
				listId: 4,
				message: "Couldn't move the card: HTTP error: 500 Internal Server Error",
			});
		});

		/*
		 * `b` is dropped between two list-4 cards one rank apart, so no rank
		 * fits and the drop handler rebalances list 4 instead. The server's new
		 * ranks are merged in without reordering the already-placed bucket.
		 */
		it('applies the server’s new ranks after a rebalance, keeping the dropped order', async () => {
			const y = makeCard(4, 4, '00001001');
			const { result } = await renderLoaded([a, b, x, y]);
			const previous = result.current.cardsByList;
			let body;
			server.use(
				http.patch(apiUrl('/api/lists/4/cards/rebalance'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({
						data: [
							{ ...x, position: '00001000' },
							{ ...b, listId: 4, position: '00002000' },
							{ ...y, position: '00003000' },
						],
					});
				})
			);

			act(() => result.current.updateCardOrder({ 3: [a], 4: [x, { ...b, listId: 4 }, y] }));
			await act(() => result.current.rebalanceList(4, [3, 2, 4], previous));

			expect(body).toEqual([3, 2, 4]);
			expect(
				result.current.cardsByList[4].map((card) => [card.id, card.listId, card.position])
			).toEqual([
				[3, 4, '00001000'],
				[2, 4, '00002000'],
				[4, 4, '00003000'],
			]);
		});

		/*
		 * BoardDetailPage already stamps the new listId on a dropped card, so
		 * this guards the hook's own documented contract rather than today's
		 * caller: a card the rebalance moved in takes the rebalanced list's id
		 * even if the caller left its old one.
		 */
		it('stamps the rebalanced list’s id onto a moved-in card the caller left stale', async () => {
			const { result } = await renderLoaded([a, b, x]);
			const previous = result.current.cardsByList;
			server.use(
				http.patch(apiUrl('/api/lists/4/cards/rebalance'), () =>
					HttpResponse.json({
						data: [
							{ ...b, listId: 4, position: '00001000' },
							{ ...x, position: '00002000' },
						],
					})
				)
			);

			act(() => result.current.updateCardOrder({ 3: [a], 4: [b, x] }));
			await act(() => result.current.rebalanceList(4, [2, 3], previous));

			expect(result.current.cardsByList[4].map((card) => card.listId)).toEqual([4, 4]);
		});

		it('rolls back to the pre-drag state when the rebalance is rejected', async () => {
			const { result } = await renderLoaded([a, b, x]);
			const previous = result.current.cardsByList;
			server.use(
				http.patch(apiUrl('/api/lists/4/cards/rebalance'), () => serverError(409, 'Conflict'))
			);

			act(() => result.current.updateCardOrder({ 3: [a], 4: [{ ...b, listId: 4 }, x] }));
			await act(() => result.current.rebalanceList(4, [2, 3], previous));

			expect(result.current.cardsByList).toEqual({ 3: [a, b], 4: [x] });
			expect(result.current.mutationError).toEqual({
				listId: 4,
				message: "Couldn't move the card: HTTP error: 409 Conflict",
			});
		});
	});
});
