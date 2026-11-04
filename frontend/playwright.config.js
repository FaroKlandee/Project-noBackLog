/**
 * @file playwright.config.js
 * @description Playwright configuration for the browser-level tests in e2e/.
 *
 * These cover what jsdom can't: dnd-kit needs real layout and real pointer and
 * keyboard events to resolve a drag, so the Vitest suite has to drive its
 * handlers with synthetic events instead.
 *
 * The API is stubbed per test (see e2e/support/board.js), so no backend or
 * Postgres is needed. The dev server gets its own port so it never collides
 * with, or reuses, one you already have running on Vite's default.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
import { defineConfig, devices } from '@playwright/test';

const PORT = 5199;

export default defineConfig({
	testDir: './e2e',
	/* Fails the run if a stray `test.only` reaches CI. */
	forbidOnly: Boolean(process.env.CI),
	/*
	 * One retry on CI only: a card drag starts with a double press inside a
	 * 200ms window (see CardItem.jsx), which a stalled runner can miss.
	 */
	retries: process.env.CI ? 1 : 0,
	reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
	use: {
		baseURL: `http://localhost:${PORT}`,
		trace: 'on-first-retry',
	},
	projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
	webServer: {
		command: `pnpm dev --port ${PORT} --strictPort`,
		url: `http://localhost:${PORT}`,
		reuseExistingServer: false,
	},
});
