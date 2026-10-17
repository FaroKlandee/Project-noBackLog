/**
 * @fileoverview Tests for the shared HTTP client's response and error handling.
 *
 * MSW serves each response, so the real `fetch` → `api.js` path runs: the
 * error-envelope parsing, the status-line fallback, and the timeout abort.
 */

import { delay, HttpResponse, http } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiUrl } from '../../test/apiUrl';
import { server } from '../../test/server';
import api from './api';

const PATH = '/api/things';

/** Serves `response` for GET /api/things. */
function serve(response) {
	server.use(http.get(apiUrl(PATH), () => response));
}

/** Runs `api.get` and returns the Error it rejects with. */
async function rejection() {
	try {
		await api.get(PATH);
	} catch (error) {
		return error;
	}
	throw new Error('Expected api.get to reject');
}

describe('api', () => {
	afterEach(() => {
		vi.useRealTimers();
	});

	describe('successful responses', () => {
		it('returns the parsed JSON body unchanged', async () => {
			serve(HttpResponse.json({ success: true, data: [{ id: 1 }] }));

			await expect(api.get(PATH)).resolves.toEqual({ success: true, data: [{ id: 1 }] });
		});

		it('sends the JSON-serialised body on writes', async () => {
			let received;
			server.use(
				http.post(apiUrl(PATH), async ({ request }) => {
					received = await request.json();
					return HttpResponse.json({ data: received }, { status: 201 });
				})
			);

			await api.post(PATH, { name: 'Todo' });

			expect(received).toEqual({ name: 'Todo' });
		});
	});

	describe('error responses', () => {
		it("uses the server's envelope message and sets status", async () => {
			serve(
				HttpResponse.json(
					{ success: false, message: 'At most 2 timers can run at once.' },
					{ status: 409, statusText: 'Conflict' }
				)
			);

			const error = await rejection();

			expect(error.message).toBe('At most 2 timers can run at once.');
			expect(error.status).toBe(409);
		});

		it('falls back to the status line for an empty body', async () => {
			serve(new HttpResponse(null, { status: 500, statusText: 'Internal Server Error' }));

			const error = await rejection();

			expect(error.message).toBe('HTTP error: 500 Internal Server Error');
			expect(error.status).toBe(500);
		});

		it('falls back to the status line for a non-JSON body', async () => {
			serve(new HttpResponse('<html>Bad Gateway</html>', { status: 502, statusText: 'Bad Gateway' }));

			const error = await rejection();

			expect(error.message).toBe('HTTP error: 502 Bad Gateway');
			expect(error.status).toBe(502);
		});

		it('falls back to the status line when the envelope message is blank', async () => {
			serve(
				HttpResponse.json(
					{ success: false, message: '   ' },
					{ status: 400, statusText: 'Bad Request' }
				)
			);

			const error = await rejection();

			expect(error.message).toBe('HTTP error: 400 Bad Request');
			expect(error.status).toBe(400);
		});
	});

	describe('timeout', () => {
		it('aborts after 5000ms with a readable message', async () => {
			server.use(
				http.get(apiUrl(PATH), async () => {
					await delay('infinite');
				})
			);
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

			const result = api.get(PATH).catch((error) => error);
			await vi.advanceTimersByTimeAsync(4999);
			await vi.advanceTimersByTimeAsync(1);
			const error = await result;

			expect(error.message).toBe('Request timed out after 5000ms');
		});

		it('does not abort a response that arrives just before the deadline', async () => {
			server.use(http.get(apiUrl(PATH), () => HttpResponse.json({ data: 'ok' })));
			vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });

			const result = api.get(PATH);
			await vi.advanceTimersByTimeAsync(4999);

			await expect(result).resolves.toEqual({ data: 'ok' });
		});
	});
});
