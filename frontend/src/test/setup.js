/**
 * @fileoverview Vitest setup — runs before every test file (see `test.setupFiles`
 * in vite.config.js).
 *
 * MSW server lifecycle (see server.js):
 *   - `listen` once per file, with `onUnhandledRequest: 'error'`, so a request
 *     no test declared fails loudly rather than reaching the real network.
 *   - `resetHandlers` after each test, so one test's `server.use(...)`
 *     endpoints can't leak into the next.
 *   - `close` once the file finishes, restoring the real `fetch`.
 *
 * Testing Library normally unmounts rendered components/hooks after each test
 * on its own, but it only registers that hook when `afterEach` is a global.
 * This project runs Vitest with `globals: false`, so the cleanup is wired up
 * explicitly here — without it, every `renderHook` root from earlier tests
 * would stay mounted and keep reacting to state changes in later ones.
 */

import { cleanup } from '@testing-library/react';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { server } from './server';

beforeAll(() => {
	server.listen({ onUnhandledRequest: 'error' });
});

afterEach(() => {
	cleanup();
	server.resetHandlers();
});

afterAll(() => {
	server.close();
});
