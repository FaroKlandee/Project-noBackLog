/**
 * @fileoverview Tests for the `useCardTimeLogs` hook, against an MSW stand-in
 * for the backend (see src/test/server.js).
 *
 * The hook loads three things in parallel (the card's logs, the server's caps,
 * and every timer running app-wide) and derives the Start button's state from
 * them, so the derived values are tested at each cap's boundary. Mutations are
 * pessimistic and rethrow, unlike useLists/useBoardCards, and each one
 * best-effort refreshes the app-wide running list afterward.
 */

import { act, renderHook, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { apiUrl } from '../../../test/apiUrl';
import { server } from '../../../test/server';
import { useCardTimeLogs } from './useCardTimeLogs';

const CARD_ID = 5;

/** A finished entry on this card. */
function finishedLog(id, duration) {
	return {
		id,
		cardId: CARD_ID,
		startTime: '2026-10-05T09:00:00Z',
		endTime: '2026-10-05T10:00:00Z',
		duration,
	};
}

/**
 * A running entry (no `endTime`) on this card. `duration` is 0, not null: the
 * backend's `TimeLog.Duration` is a non-nullable long that is only computed on
 * finish.
 */
function runningLog(id) {
	return { id, cardId: CARD_ID, startTime: '2026-10-05T11:00:00Z', endTime: null, duration: 0 };
}

/** An app-wide running timer, as `GET /api/timelogs/running` reports it. */
function timer(id, cardId) {
	return { id, cardId, cardTitle: `Card ${cardId}`, startTime: '2026-10-05T11:00:00Z' };
}

/** A non-2xx response with a status text, so `api.js` builds a full message. */
function serverError(status = 500, statusText = 'Internal Server Error') {
	return new HttpResponse(null, { status, statusText });
}

/**
 * Declare the three load endpoints. `running` may be an array, or a function
 * returning a Response for each call (to vary refreshes). Returns a counter of
 * `/running` calls, so tests can tell whether a mutation refreshed it.
 */
function serveCard({ logs = [], maxEntries = 10, maxRunning = 3, running = [] } = {}) {
	const runningCalls = { count: 0 };
	server.use(
		http.get(apiUrl('/api/timelogs'), () => HttpResponse.json({ data: logs })),
		http.get(apiUrl('/api/timelogs/settings'), () =>
			HttpResponse.json({ data: { maxEntriesPerCard: maxEntries, maxRunningTimers: maxRunning } })
		),
		http.get(apiUrl('/api/timelogs/running'), () => {
			runningCalls.count += 1;
			return typeof running === 'function'
				? running(runningCalls.count)
				: HttpResponse.json({ data: running });
		})
	);
	return runningCalls;
}

/*
 * Waits on `maxEntries` rather than `isLoading`: the hook starts with
 * isLoading false and only flips it on inside its effect, so waiting for
 * "not loading" could pass before the fetch has even begun.
 */
async function renderLoaded(cardId = CARD_ID) {
	const hook = renderHook(() => useCardTimeLogs(cardId));
	await waitFor(() => expect(hook.result.current.maxEntries).not.toBeNull());
	await waitFor(() => expect(hook.result.current.isLoading).toBe(false));
	return hook;
}

describe('useCardTimeLogs', () => {
	describe('loading', () => {
		it('makes no requests when no card is open', async () => {
			let requests = 0;
			const countRequest = () => {
				requests += 1;
			};
			server.events.on('request:start', countRequest);

			try {
				const { result } = renderHook(() => useCardTimeLogs(null));
				await act(() => new Promise((resolve) => setTimeout(resolve, 50)));

				expect(requests).toBe(0);
				expect(result.current.isLoading).toBe(false);
				expect(result.current.logs).toEqual([]);
				expect(result.current.error).toBeNull();
			} finally {
				server.events.removeListener('request:start', countRequest);
			}
		});

		it('loads the card’s logs, the caps, and the app-wide running timers', async () => {
			const logs = [finishedLog(1, 60_000)];
			serveCard({ logs, maxEntries: 4, maxRunning: 2, running: [timer(8, 9)] });

			const { result } = await renderLoaded();

			expect(result.current.logs).toEqual(logs);
			expect(result.current.maxEntries).toBe(4);
			expect(result.current.maxRunning).toBe(2);
			expect(result.current.runningElsewhere).toEqual([timer(8, 9)]);
			expect(result.current.error).toBeNull();
		});

		/* The three requests run in parallel; any one failing fails the load. */
		it.each(['/api/timelogs', '/api/timelogs/settings', '/api/timelogs/running'])(
			'reports the error when %s fails',
			async (failingPath) => {
				serveCard({ logs: [finishedLog(1, 60_000)] });
				server.use(http.get(apiUrl(failingPath), () => serverError()));

				const { result } = renderHook(() => useCardTimeLogs(CARD_ID));

				await waitFor(() =>
					expect(result.current.error).toBe('HTTP error: 500 Internal Server Error')
				);
				expect(result.current.isLoading).toBe(false);
				expect(result.current.logs).toEqual([]);
			}
		);
	});

	describe('derived state', () => {
		it('finds the running entry and totals only the finished ones', async () => {
			serveCard({ logs: [finishedLog(1, 60_000), finishedLog(2, 30_000), runningLog(3)] });

			const { result } = await renderLoaded();

			expect(result.current.running).toEqual(runningLog(3));
			expect(result.current.totalMs).toBe(90_000);
		});

		it('reports no running entry when every entry is finished', async () => {
			serveCard({ logs: [finishedLog(1, 60_000)] });

			const { result } = await renderLoaded();

			expect(result.current.running).toBeNull();
		});

		/* Boundary: the cap is reached at exactly maxEntries, running entry included. */
		it.each([
			[2, 3, false],
			[3, 3, true],
			[4, 3, true],
		])('with %i entries and a cap of %i, atLimit is %s', async (entries, cap, expected) => {
			const logs = Array.from({ length: entries }, (_, i) => finishedLog(i + 1, 1_000));
			logs[entries - 1] = runningLog(entries);
			serveCard({ logs, maxEntries: cap });

			const { result } = await renderLoaded();

			expect(result.current.atLimit).toBe(expected);
		});

		/* Boundary: the global cap counts this card's own running timer too. */
		it.each([
			[1, 2, false],
			[2, 2, true],
		])(
			'with %i timers running app-wide and a cap of %i, globalAtLimit is %s',
			async (count, cap, expected) => {
				const running = Array.from({ length: count }, (_, i) =>
					timer(100 + i, i === 0 ? CARD_ID : 9)
				);
				serveCard({ maxRunning: cap, running });

				const { result } = await renderLoaded();

				expect(result.current.globalAtLimit).toBe(expected);
			}
		);

		it('lists only the timers running on other cards as runningElsewhere', async () => {
			serveCard({ running: [timer(3, CARD_ID), timer(8, 9), timer(9, 12)] });

			const { result } = await renderLoaded();

			expect(result.current.runningElsewhere).toEqual([timer(8, 9), timer(9, 12)]);
		});
	});

	describe('mutations', () => {
		it('start: posts the card id, appends the new entry, and refreshes the running timers', async () => {
			const runningCalls = serveCard({
				logs: [finishedLog(1, 60_000)],
				maxRunning: 2,
				running: (call) =>
					HttpResponse.json({
						data: call === 1 ? [timer(8, 9)] : [timer(8, 9), timer(3, CARD_ID)],
					}),
			});
			const { result } = await renderLoaded();
			let body;
			server.use(
				http.post(apiUrl('/api/timelogs/start'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: runningLog(3) }, { status: 201 });
				})
			);

			await act(() => result.current.start());

			expect(body).toEqual({ cardId: CARD_ID });
			expect(result.current.logs).toEqual([finishedLog(1, 60_000), runningLog(3)]);
			expect(result.current.running).toEqual(runningLog(3));
			expect(runningCalls.count).toBe(2);
			expect(result.current.globalAtLimit).toBe(true);
		});

		it('start: rethrows a rejection and leaves the entries and running timers untouched', async () => {
			const runningCalls = serveCard({ logs: [finishedLog(1, 60_000)] });
			const { result } = await renderLoaded();
			server.use(http.post(apiUrl('/api/timelogs/start'), () => serverError(409, 'Conflict')));

			await act(async () => {
				await expect(result.current.start()).rejects.toThrow('HTTP error: 409 Conflict');
			});

			expect(result.current.logs).toEqual([finishedLog(1, 60_000)]);
			expect(runningCalls.count).toBe(1);
		});

		it('finish: replaces the running entry with the server’s finished copy', async () => {
			const runningCalls = serveCard({ logs: [finishedLog(1, 60_000), runningLog(3)] });
			const { result } = await renderLoaded();
			const finished = { ...runningLog(3), endTime: '2026-10-05T11:30:00Z', duration: 1_800_000 };
			server.use(
				http.post(apiUrl('/api/timelogs/3/finish'), () => HttpResponse.json({ data: finished }))
			);

			await act(() => result.current.finish(3));

			expect(result.current.logs).toEqual([finishedLog(1, 60_000), finished]);
			expect(result.current.running).toBeNull();
			expect(result.current.totalMs).toBe(1_860_000);
			expect(runningCalls.count).toBe(2);
		});

		it('remove: drops the entry from the list and the total', async () => {
			const runningCalls = serveCard({ logs: [finishedLog(1, 60_000), finishedLog(2, 30_000)] });
			const { result } = await renderLoaded();
			server.use(
				http.delete(apiUrl('/api/timelogs/1'), () => HttpResponse.json({ success: true }))
			);

			await act(() => result.current.remove(1));

			expect(result.current.logs).toEqual([finishedLog(2, 30_000)]);
			expect(result.current.totalMs).toBe(30_000);
			expect(runningCalls.count).toBe(2);
		});

		/*
		 * The refresh only feeds the Start button's hint, and the server
		 * enforces the cap anyway, so its failure must not fail the mutation.
		 */
		it('still succeeds when the follow-up running-timers refresh fails', async () => {
			serveCard({
				running: (call) =>
					call === 1 ? HttpResponse.json({ data: [timer(8, 9)] }) : serverError(),
			});
			const { result } = await renderLoaded();
			server.use(
				http.post(apiUrl('/api/timelogs/start'), () =>
					HttpResponse.json({ data: runningLog(3) }, { status: 201 })
				)
			);

			await act(() => result.current.start());

			expect(result.current.logs).toEqual([runningLog(3)]);
			expect(result.current.runningElsewhere).toEqual([timer(8, 9)]);
			expect(result.current.error).toBeNull();
		});
	});
});
