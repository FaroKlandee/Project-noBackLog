/**
 * @fileoverview Vitest setup — runs before every test file (see `test.setupFiles`
 * in vite.config.js).
 *
 * Testing Library normally unmounts rendered components/hooks after each test
 * on its own, but it only registers that hook when `afterEach` is a global.
 * This project runs Vitest with `globals: false`, so the cleanup is wired up
 * explicitly here — without it, every `renderHook` root from earlier tests
 * would stay mounted and keep reacting to state changes in later ones.
 */

import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

afterEach(() => {
	cleanup();
});
