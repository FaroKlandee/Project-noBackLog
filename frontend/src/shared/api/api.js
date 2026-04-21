/**
 * @fileoverview Shared HTTP API client for the nobacklog frontend.
 *
 * This module provides a thin, reusable wrapper around the native `fetch` API.
 * It centralises every concern that applies to every outgoing HTTP request:
 *   - The backend base URL so it never has to be repeated in feature code.
 *   - A per-request timeout enforced via `AbortController` so the UI never
 *     hangs indefinitely waiting for an unresponsive server.
 *   - Consistent `Content-Type` headers for JSON communication.
 *   - Automatic serialisation of request bodies to JSON.
 *   - Uniform error handling: non-2xx HTTP responses and network/abort errors
 *     are all converted into thrown `Error` instances so callers can use a
 *     single `catch` branch.
 *
 * The exported `api` object exposes one method per supported HTTP verb
 * (`get`, `post`, `put`, `delete`).  Feature-level service modules (e.g.
 * `boardService.js`, `listService.js`) import this object and call those
 * methods — they never reach for `fetch` directly.
 */

/**
 * Root URL of the backend REST API.
 *
 * All request paths passed to {@link request} are appended to this string,
 * so they should begin with a leading slash (e.g. `/api/boards/`).
 *
 * During local development the .NET backend runs on port 5000.
 * In a production build this value would typically be replaced by an
 * environment variable injected at build time (e.g. via Vite's
 * `import.meta.env.VITE_API_BASE_URL`).
 *
 * @constant {string}
 */
const BASE_URL = 'http://localhost:5000';

/**
 * Maximum number of milliseconds to wait for the server to respond before
 * the request is automatically cancelled.
 *
 * If the server does not respond within this window the `AbortController`
 * fires, `fetch` rejects with an `AbortError`, and {@link request} converts
 * that into a human-readable timeout error.  This prevents the UI from
 * showing a permanent loading spinner when the backend is unreachable.
 *
 * @constant {number}
 */
const TIMEOUT_MS = 5000;

/**
 * Core HTTP request helper — the single function that all public API methods
 * delegate to.
 *
 * ### Request lifecycle
 * 1. An `AbortController` is created and a `setTimeout` is armed for
 *    {@link TIMEOUT_MS} milliseconds.  If the timeout fires it calls
 *    `controller.abort()`, which causes the in-flight `fetch` to reject with
 *    an `AbortError`.
 * 2. A `fetch` options object is assembled.  The caller-supplied `method` and
 *    an `AbortSignal` from the controller are always included.  When `data` is
 *    provided it is serialised to a JSON string and attached as the request
 *    body.
 * 3. `fetch` is awaited.  On success the timeout is cleared immediately so it
 *    cannot fire after the response is already received.
 * 4. If the HTTP response status is outside the 2xx range `response.ok` will
 *    be `false`; in that case an `Error` is thrown containing the numeric
 *    status code and status text (e.g. `"HTTP error: 404 Not Found"`).
 * 5. The parsed JSON body of a successful response is returned to the caller.
 * 6. Any error (network failure, abort, non-2xx status) is caught, the
 *    timeout is cleared, and the error is re-thrown — either as a friendly
 *    "timed out" message for `AbortError`s or as-is for everything else.
 *
 * @async
 * @param {string} method - HTTP verb in uppercase (e.g. `'GET'`, `'POST'`).
 * @param {string} path   - API path relative to {@link BASE_URL}
 *                          (e.g. `'/api/boards/'`).
 * @param {Object|null} [data=null] - Optional request payload.  When
 *   provided it is JSON-serialised and sent as the request body.  Should be
 *   `null` (or omitted) for requests that carry no body (GET, DELETE).
 * @returns {Promise<any>} Resolves with the parsed JSON response body.
 * @throws {Error} If the request times out, the network is unreachable, or
 *   the server returns a non-2xx HTTP status code.
 */
async function request(method, path, data = null) {
	// Create an AbortController so we can cancel the fetch if it takes too long.
	// Each call gets its own controller instance to avoid cross-request interference.
	const controller = new AbortController();

	// Schedule the abort to fire after TIMEOUT_MS milliseconds.
	// The returned timeoutId is used later to cancel the timer if the request
	// finishes before the deadline.
	const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

	// Build the fetch options object shared by all HTTP methods.
	// `signal` wires up the AbortController so the timeout can cancel the fetch.
	const options = {
		method,
		signal: controller.signal,
		headers: {
			// Tell the server we are sending (and expecting) JSON.
			'Content-Type': 'application/json',
		},
	};

	// Only attach a body when the caller supplied data.
	// GET and DELETE requests must not include a body; POST and PUT always will.
	if (data) {
		options.body = JSON.stringify(data);
	}

	try {
		// Perform the HTTP request.  This will reject if the network is
		// unavailable or if controller.abort() fires before a response arrives.
		const response = await fetch(`${BASE_URL}${path}`, options);

		// Request completed before the timeout — cancel the scheduled abort
		// so it does not fire spuriously after the response is already handled.
		clearTimeout(timeoutId);

		// `response.ok` is true only for 2xx status codes.
		// Fetch itself does NOT throw on 4xx/5xx, so we must check manually.
		if (!response.ok) {
			throw new Error(`HTTP error: ${response.status} ${response.statusText}`);
		}

		// Deserialise and return the JSON body.
		// Feature-level service functions receive this value directly.
		return response.json();
	} catch (error) {
		// Always clear the timeout in the error path too — if the fetch rejected
		// immediately (e.g. DNS failure) we don't want a stale timer lingering.
		clearTimeout(timeoutId);

		// Convert the cryptic AbortError into a friendlier message so callers
		// and end-users see "Request timed out" rather than "The operation was aborted".
		if (error.name === 'AbortError') {
			throw new Error(`Request timed out after ${TIMEOUT_MS}ms`);
		}

		// Re-throw everything else (network errors, the HTTP error we threw
		// above, JSON parse failures, etc.) unchanged so callers can inspect them.
		throw error;
	}
}

/**
 * Public API client object.
 *
 * Each property is a one-liner that maps a semantic HTTP verb to the
 * underlying {@link request} helper.  Feature services import this object
 * and call these methods rather than importing `request` directly, which
 * keeps the calling syntax clean and consistent across the codebase.
 *
 * @example
 * // Fetch all boards from the backend:
 * const data = await api.get('/api/boards/');
 *
 * @example
 * // Create a new board:
 * const created = await api.post('/api/boards/', { name: 'Sprint 1' });
 *
 * @namespace api
 */
const api = {
	/**
	 * Send an HTTP GET request.
	 * Used for reading/fetching resources — no request body is sent.
	 *
	 * @memberof api
	 * @param {string} path - API path relative to {@link BASE_URL}.
	 * @returns {Promise<any>} Parsed JSON response body.
	 */
	get: (path) => request('GET', path),

	/**
	 * Send an HTTP POST request with a JSON body.
	 * Used for creating new resources on the server.
	 *
	 * @memberof api
	 * @param {string} path   - API path relative to {@link BASE_URL}.
	 * @param {Object} data   - Payload to JSON-serialise and send as the body.
	 * @returns {Promise<any>} Parsed JSON response body (typically the created resource).
	 */
	post: (path, data) => request('POST', path, data),

	/**
	 * Send an HTTP PUT request with a JSON body.
	 * Used for fully replacing / updating an existing resource on the server.
	 *
	 * @memberof api
	 * @param {string} path   - API path relative to {@link BASE_URL}.
	 * @param {Object} data   - Payload to JSON-serialise and send as the body.
	 * @returns {Promise<any>} Parsed JSON response body (typically the updated resource).
	 */
	put: (path, data) => request('PUT', path, data),

	/**
	 * Send an HTTP DELETE request.
	 * Used for removing a resource from the server — no request body is sent.
	 *
	 * @memberof api
	 * @param {string} path - API path relative to {@link BASE_URL}.
	 * @returns {Promise<any>} Parsed JSON response body (typically empty or a confirmation).
	 */
	delete: (path) => request('DELETE', path),
};

/**
 * Default export — the fully configured API client.
 *
 * Feature-level service modules (e.g. `boardService.js`, `listService.js`)
 * import this as their sole dependency on the network layer, keeping all
 * HTTP concerns in one place and making the client easy to mock in tests.
 *
 * @default
 */
export default api;