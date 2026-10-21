/**
 * @fileoverview Tests for `TimeLogSection`, against an MSW stand-in for the
 * backend (see src/test/server.js).
 *
 * The section and `useCardTimeLogs` are one unit from the user's point of
 * view, so the hook runs for real here; these tests check what the user sees
 * and can do — load states, the Start button and its limit captions, Finish /
 * Delete, and the live elapsed counter.
 *
 * Clock strings (`formatClock`/`formatTime`) depend on the machine's locale
 * and time zone, so tests assert durations and captions, never those.
 *
 * The fixture builders and `serveCard` are copied from useCardTimeLogs.test.js
 * (kept as separate copies by choice) — keep the two in step if the API's
 * time-log shape changes.
 */

import { act, screen, waitFor } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import { describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../../test/apiUrl';
import { renderWithTheme } from '../../../test/render';
import { server } from '../../../test/server';
import TimeLogSection from './TimeLogSection';

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

/** A promise whose settlement the test controls, to hold a request in flight. */
function deferred() {
	let resolve;
	let reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Render the section for CARD_ID inside the app theme. */
function renderSection() {
	return renderWithTheme(<TimeLogSection cardId={CARD_ID} />);
}

describe('TimeLogSection', () => {
	describe('loading', () => {
		it('shows a loading message, then the entries with their durations', async () => {
			serveCard({ logs: [finishedLog(1, 60_000), finishedLog(2, 30_000)] });

			renderSection();

			expect(screen.getByText('Loading time logs…')).toBeInTheDocument();
			expect(await screen.findByText('1m 00s')).toBeInTheDocument();
			expect(screen.getByText('30s')).toBeInTheDocument();
			expect(screen.queryByText('Loading time logs…')).not.toBeInTheDocument();
		});

		it('says so when the card has no time logged', async () => {
			serveCard();

			renderSection();

			expect(await screen.findByText('No time logged yet.')).toBeInTheDocument();
		});

		it('shows the server error instead of the entries and offers no Start button', async () => {
			serveCard({ logs: [finishedLog(1, 60_000)] });
			server.use(http.get(apiUrl('/api/timelogs/settings'), () => serverError()));

			renderSection();

			expect(await screen.findByRole('alert')).toHaveTextContent(
				'HTTP error: 500 Internal Server Error'
			);
			expect(screen.queryByText('1m 00s')).not.toBeInTheDocument();
			expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
		});

		it('summarises the entry count against the cap and the total time', async () => {
			serveCard({ logs: [finishedLog(1, 60_000), finishedLog(2, 30_000)], maxEntries: 5 });

			renderSection();

			expect(await screen.findByText(/entries · Total/)).toHaveTextContent(
				'2/5 entries · Total 1m 30s'
			);
		});
	});

	describe('starting a timer', () => {
		it('posts the card id and swaps Start for the running entry’s Finish button', async () => {
			serveCard();
			let body;
			server.use(
				http.post(apiUrl('/api/timelogs/start'), async ({ request }) => {
					body = await request.json();
					return HttpResponse.json({ data: runningLog(3) }, { status: 201 });
				})
			);
			const { user } = renderSection();

			await user.click(await screen.findByRole('button', { name: 'Start' }));

			expect(await screen.findByRole('button', { name: 'Finish' })).toBeInTheDocument();
			expect(body).toEqual({ cardId: CARD_ID });
			expect(screen.queryByRole('button', { name: 'Start' })).not.toBeInTheDocument();
		});

		it('shows Starting… and stays disabled while the request is in flight', async () => {
			serveCard();
			const gate = deferred();
			server.use(
				http.post(apiUrl('/api/timelogs/start'), async () => {
					await gate.promise;
					return HttpResponse.json({ data: runningLog(3) }, { status: 201 });
				})
			);
			const { user } = renderSection();

			await user.click(await screen.findByRole('button', { name: 'Start' }));

			expect(screen.getByRole('button', { name: 'Starting…' })).toBeDisabled();

			gate.resolve();
			expect(await screen.findByRole('button', { name: 'Finish' })).toBeInTheDocument();
		});
	});

	/*
	 * Boundary pairs at each cap — the same values as the hook tests, checked
	 * here where the user meets them: the Start button and its caption.
	 */
	describe('caps', () => {
		it.each([
			[2, 3, false],
			[3, 3, true],
		])('with %i of %i entries, Start disabled is %s', async (entries, cap, atLimit) => {
			const logs = Array.from({ length: entries }, (_, i) => finishedLog(i + 1, 1_000));
			serveCard({ logs, maxEntries: cap });

			renderSection();

			const start = await screen.findByRole('button', { name: 'Start' });
			const caption = screen.queryByText(/Entry limit reached/);
			if (atLimit) {
				expect(start).toBeDisabled();
				expect(caption).toHaveTextContent(
					'Entry limit reached (3/3). Delete an entry to log again.'
				);
			} else {
				expect(start).toBeEnabled();
				expect(caption).not.toBeInTheDocument();
			}
		});

		/*
		 * The timers run on *other* cards: if this card had one running, Start
		 * (and so the caption) would be hidden entirely.
		 */
		it.each([
			[1, false, [timer(8, 9)]],
			[2, true, [timer(8, 9), timer(9, 12)]],
		])(
			'with %i timer(s) running on other cards and a cap of 2, Start disabled is %s',
			async (_count, atLimit, running) => {
				serveCard({ maxRunning: 2, running });

				renderSection();

				const start = await screen.findByRole('button', { name: 'Start' });
				const caption = screen.queryByText(/timers already running/);
				if (atLimit) {
					expect(start).toBeDisabled();
					expect(caption).toHaveTextContent(
						'2/2 timers already running (Card 9, Card 12). Finish one to start another.'
					);
				} else {
					expect(start).toBeEnabled();
					expect(caption).not.toBeInTheDocument();
				}
			}
		);
	});

	describe('finishing and deleting', () => {
		it('finish: shows the server’s duration for the entry and offers Start again', async () => {
			serveCard({ logs: [runningLog(3)] });
			const finished = { ...runningLog(3), endTime: '2026-10-05T11:30:00Z', duration: 1_800_000 };
			server.use(
				http.post(apiUrl('/api/timelogs/3/finish'), () => HttpResponse.json({ data: finished }))
			);
			const { user } = renderSection();

			await user.click(await screen.findByRole('button', { name: 'Finish' }));

			expect(await screen.findByRole('button', { name: 'Start' })).toBeEnabled();
			expect(screen.queryByRole('button', { name: 'Finish' })).not.toBeInTheDocument();
			/* Once in the entry's row, once as the header total. */
			expect(screen.getAllByText('30m 00s')).toHaveLength(2);
			expect(screen.getByText(/entries · Total/)).toHaveTextContent('1/10 entries · Total 30m 00s');
		});

		it('delete: removes the entry and updates the count and total', async () => {
			serveCard({ logs: [finishedLog(1, 60_000), finishedLog(2, 30_000)] });
			server.use(
				http.delete(apiUrl('/api/timelogs/1'), () => HttpResponse.json({ success: true }))
			);
			const { user } = renderSection();

			const [deleteFirst] = await screen.findAllByRole('button', { name: 'Delete time entry' });
			await user.click(deleteFirst);

			await waitFor(() => expect(screen.queryByText('1m 00s')).not.toBeInTheDocument());
			expect(screen.getAllByRole('button', { name: 'Delete time entry' })).toHaveLength(1);
			expect(screen.getByText(/entries · Total/)).toHaveTextContent('1/10 entries · Total 30s');
		});

		it('disables every action while one request is in flight', async () => {
			serveCard({ logs: [finishedLog(1, 60_000), runningLog(3)] });
			const gate = deferred();
			server.use(
				http.post(apiUrl('/api/timelogs/3/finish'), async () => {
					await gate.promise;
					return HttpResponse.json({
						data: { ...runningLog(3), endTime: '2026-10-05T11:30:00Z', duration: 1_800_000 },
					});
				})
			);
			const { user } = renderSection();

			await user.click(await screen.findByRole('button', { name: 'Finish' }));

			expect(screen.getByRole('button', { name: 'Finishing…' })).toBeDisabled();
			for (const button of screen.getAllByRole('button', { name: 'Delete time entry' })) {
				expect(button).toBeDisabled();
			}

			gate.resolve();

			expect(await screen.findByRole('button', { name: 'Start' })).toBeEnabled();
			for (const button of screen.getAllByRole('button', { name: 'Delete time entry' })) {
				expect(button).toBeEnabled();
			}
		});

		it('shows a failed action’s error until dismissed, and re-enables the actions', async () => {
			serveCard();
			server.use(http.post(apiUrl('/api/timelogs/start'), () => serverError(409, 'Conflict')));
			const { user } = renderSection();

			await user.click(await screen.findByRole('button', { name: 'Start' }));

			expect(await screen.findByRole('alert')).toHaveTextContent('HTTP error: 409 Conflict');
			expect(screen.getByRole('button', { name: 'Start' })).toBeEnabled();

			await user.click(screen.getByRole('button', { name: 'Close' }));

			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});

		it('shows the server’s reason when a limit rejects the start', async () => {
			serveCard();
			server.use(
				http.post(apiUrl('/api/timelogs/start'), () =>
					HttpResponse.json(
						{ success: false, message: 'At most 2 timers can run at once.' },
						{ status: 409, statusText: 'Conflict' }
					)
				)
			);
			const { user } = renderSection();

			await user.click(await screen.findByRole('button', { name: 'Start' }));

			expect(await screen.findByRole('alert')).toHaveTextContent(
				'At most 2 timers can run at once.'
			);
		});
	});

	/*
	 * Only `setInterval` (the counter's tick) and `Date` (what it measures
	 * against) are faked, and before render: an interval started under real
	 * timers keeps running on the real clock, so faking afterwards would have
	 * no effect. `setTimeout` stays real, which MSW, `api.js`'s timeout and
	 * `findBy…` polling all rely on.
	 */
	describe('live counter', () => {
		it('ticks the running entry’s elapsed time once a second', async () => {
			vi.useFakeTimers({ toFake: ['setInterval', 'Date'] });
			try {
				vi.setSystemTime(new Date(runningLog(3).startTime).getTime() + 5_000);
				serveCard({ logs: [runningLog(3)] });

				renderSection();

				expect(await screen.findByText('5s')).toBeInTheDocument();

				/*
				 * One-second steps: each tick re-reads Date.now(), so a single
				 * 2 s step would also pass for a counter that ticks every 2 s
				 * (and visibly skips seconds).
				 */
				act(() => vi.advanceTimersByTime(1_000));
				expect(screen.getByText('6s')).toBeInTheDocument();

				act(() => vi.advanceTimersByTime(1_000));
				expect(screen.getByText('7s')).toBeInTheDocument();
			} finally {
				vi.useRealTimers();
			}
		});
	});
});
