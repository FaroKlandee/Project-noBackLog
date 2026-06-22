/**
 * @fileoverview Shared HTTP API client for the nobacklog frontend.
 *
 * Provides a thin, reusable wrapper around the native `fetch` API that
 * centralises every cross-cutting HTTP concern:
 *   - Backend base URL resolution (env var with localhost fallback)
 *   - Per-request timeout via AbortController
 *   - Consistent `Content-Type: application/json` header
 *   - Automatic JSON serialisation of request bodies
 *   - Uniform error handling: non-2xx responses and network/abort errors are
 *     all converted to thrown `Error` instances
 *
 * The exported `api` object exposes one method per HTTP verb:
 *   api.get · api.post · api.put · api.delete · api.patch
 *
 * Feature-level service modules (boardService.js, listService.js, etc.)
 * import this object and call its methods — they never call `fetch` directly.
 */

/*
 * Configuration Constants
 * ───────────────────────────────────────────────────────────────────────────
 * BASE_URL   — Root URL of the backend REST API. Resolved from the
 *              VITE_API_BASE_URL environment variable at build time; falls back
 *              to http://localhost:5000 for local development. All request paths
 *              are appended to this string and must begin with a leading slash.
 *
 * TIMEOUT_MS — Maximum milliseconds to wait for a server response before the
 *              request is aborted. Prevents the UI from hanging on an
 *              unresponsive backend.
 */
const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000';
const TIMEOUT_MS = 5000;

/**
 * Core HTTP request helper — the single function all public API methods
 * delegate to.
 *
 * Request lifecycle:
 *   1. An AbortController is created and a timeout is armed for TIMEOUT_MS ms.
 *   2. Fetch options are assembled (method, signal, Content-Type header).
 *   3. When `data` is provided it is JSON-serialised and attached as the body.
 *   4. fetch() is awaited. On success the timeout is cleared immediately.
 *   5. Non-2xx responses throw an Error with the HTTP status and status text.
 *   6. The parsed JSON body of a successful response is returned to the caller.
 *   7. Any error (network failure, abort, non-2xx) is caught, the timeout is
 *      cleared, and the error is re-thrown — AbortErrors become a friendly
 *      "timed out" message; everything else is re-thrown unchanged.
 *
 * @async
 * @param {string}      method      - HTTP verb in uppercase (e.g. 'GET', 'POST').
 * @param {string}      path        - API path relative to BASE_URL (e.g. '/api/boards/').
 * @param {Object|null} [data=null] - Optional request payload. JSON-serialised
 *   and sent as the body for POST/PUT/PATCH. Omit or pass null for GET/DELETE.
 * @returns {Promise<any>} Resolves with the parsed JSON response body.
 * @throws {Error} On timeout, network failure, or non-2xx HTTP status.
 */
async function request(method, path, data = null) {
	/*
	 * AbortController + Timeout
	 * ─────────────────────────────────────────────────────────────────────
	 * Each call gets its own controller so cancellations are scoped to a
	 * single request. The timer fires controller.abort() after TIMEOUT_MS ms,
	 * which causes fetch() to reject with an AbortError.
	 */
	const controller = new AbortController();
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	/*
	 * Fetch Options
	 * ─────────────────────────────────────────────────────────────────────
	 * The signal wires up the AbortController so the timeout can cancel the
	 * in-flight request. Content-Type is set on every request; the body is
	 * only attached when the caller supplies a data payload.
	 */
	const options = {
		method,
		signal: controller.signal,
		headers: {
			'Content-Type': 'application/json',
		},
	};

	if (data) {
		options.body = JSON.stringify(data);
	}

	try {
		const response = await fetch(`${BASE_URL}${path}`, options);

		/*
		 * Cancel the scheduled abort — the response arrived before the deadline.
		 */
		clearTimeout(timeoutId);

		/*
		 * fetch() does not throw on 4xx/5xx responses — response.ok is false
		 * for any status outside 2xx. We throw manually so callers can use a
		 * single catch branch for all error conditions.
		 */
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		return response.json();
	} catch (error) {
		/*
		 * Always clear the timeout in the error path too — if fetch rejected
		 * immediately (DNS failure, etc.) we don't want a stale timer lingering.
		 */
		clearTimeout(timeoutId);

		/*
		 * Convert the cryptic AbortError into a human-readable timeout message
		 * so callers and end-users see "Request timed out" rather than
		 * "The operation was aborted".
		 */
		if (error.name === 'AbortError') {
			throw new Error(`Request timed out after ${TIMEOUT_MS}ms`);
		}

		/* Re-throw network errors, HTTP errors, and JSON parse failures unchanged. */
		throw error;
	}
}

/**
 * Public HTTP API client.
 *
 * Each property maps a semantic HTTP verb to the underlying `request` helper.
 * Feature service modules import this object and call these methods rather
 * than importing `request` directly, keeping call-site syntax clean.
 *
 * @namespace api
 * @property {Function} get    - Send a GET request (no body).
 * @property {Function} post   - Send a POST request with a JSON body.
 * @property {Function} put    - Send a PUT request with a JSON body.
 * @property {Function} delete - Send a DELETE request (no body).
 * @property {Function} patch  - Send a PATCH request with a JSON body.
 */
const api = {
	get:    (path)       => request('GET',    path),
	post:   (path, data) => request('POST',   path, data),
	put:    (path, data) => request('PUT',    path, data),
	delete: (path)       => request('DELETE', path),
	patch:  (path, data) => request('PATCH',  path, data),
};

export default api;
