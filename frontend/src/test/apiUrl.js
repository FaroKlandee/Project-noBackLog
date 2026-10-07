/**
 * @fileoverview Builds absolute backend URLs for MSW handlers.
 *
 * Resolves the base URL exactly the way `api.js` does, so a handler always
 * matches the URL the code under test requests. Vitest runs in mode `test`,
 * which doesn't load `.env.development`, so this is normally the
 * `http://localhost:5000` fallback.
 *
 * @param {string} path - API path with a leading slash, e.g. '/api/lists'.
 * @returns {string} The absolute URL, e.g. 'http://localhost:5000/api/lists'.
 */
export function apiUrl(path) {
	return `${import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000'}${path}`;
}
