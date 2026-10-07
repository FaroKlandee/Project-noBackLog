/**
 * @fileoverview The MSW server that stands in for the backend in tests.
 *
 * MSW intercepts `fetch` at the network boundary, so the real `api.js` and the
 * feature service modules run unchanged — tests exercise the actual URLs, HTTP
 * verbs, request bodies, and `api.js`'s error conversion, not stubs of them.
 *
 * Started with no handlers, chosen over a shared set of default endpoints,
 * because each test then declares exactly the requests it expects with
 * `server.use(...)` and reads as a spec of the hook's network contract. Any
 * request a test didn't declare fails it (`onUnhandledRequest: 'error'` in
 * setup.js). Handlers added with `server.use` are reset after every test.
 */

import { setupServer } from 'msw/node';

export const server = setupServer();
