/**
 * @file vite.config.js
 * @description Vite build tool configuration for the nobacklog frontend.
 *
 * Vite is the development server and bundler for this React project.
 * This config file is automatically picked up by Vite when running any
 * `vite` CLI command (e.g. `vite dev`, `vite build`, `vite preview`).
 *
 * @see https://vite.dev/config/
 */

/**
 * `defineConfig` is a helper that provides IntelliSense/type-checking for the
 * config object without needing a TypeScript setup. It is a pure identity
 * function at runtime — it just returns the object passed to it — but editors
 * and IDEs use it to infer the correct config shape.
 *
 * Imported from `vitest/config` rather than `vite`, because Vitest's version is
 * a superset that also types the `test` key below. Vite itself ignores `test`,
 * so `vite dev` / `vite build` behave exactly as before.
 */
import { defineConfig } from 'vitest/config'

/**
 * `@vitejs/plugin-react` enables full React support inside Vite:
 *  - Transforms JSX syntax into valid JavaScript via Babel.
 *  - Enables React Fast Refresh (HMR) during development so component state
 *    is preserved across hot-reloads when only a component's rendering logic
 *    changes.
 *  - Automatically injects the React runtime in JSX files, so explicit
 *    `import React from 'react'` statements are not required in every file.
 */
import react from '@vitejs/plugin-react'

/**
 * The default export is the resolved Vite configuration object.
 *
 * `defineConfig` accepts either a plain config object or an async factory
 * function; here we use the plain object form since no environment-specific
 * or async logic is needed.
 */
export default defineConfig({
	/**
	 * `plugins` is an array of Vite/Rollup plugin instances that extend the
	 * default build pipeline. Plugins are applied in the order they are listed.
	 *
	 * Currently active plugins:
	 *  - `react()` — see import comment above. Called as a factory function
	 *    because it accepts an optional options object (e.g. Babel config
	 *    overrides). No custom options are needed here, so it is invoked with
	 *    no arguments.
	 */
	plugins: [
		react(),
	],

	/**
	 * `test` configures Vitest (`pnpm test`). Living in this file rather than a
	 * separate vitest.config.js, so tests are transformed by the same plugins
	 * as the app.
	 *
	 *  - `environment: 'jsdom'` — gives each test file a simulated browser DOM,
	 *    which `renderHook` needs to mount a React root.
	 *  - `setupFiles` — runs before every test file; see src/test/setup.js.
	 *  - `coverage` — used by `pnpm test:coverage`. Measures all of `src/`, not
	 *    just files some test imports, so untested components show up as 0%
	 *    rather than being silently left out. Report only, no thresholds yet.
	 *
	 * `globals` is left at its default (false): tests import `describe`/`it`/
	 * `expect` explicitly, matching the codebase's explicit-import style.
	 */
	test: {
		environment: 'jsdom',
		setupFiles: ['./src/test/setup.js'],
		coverage: {
			provider: 'v8',
			include: ['src/**/*.{js,jsx}'],
			exclude: ['src/test/**', 'src/**/*.test.{js,jsx}'],
			/* skipFull: false — list 100%-covered files too, rather than omitting them. */
			reporter: ['text-summary', ['text', { skipFull: false }], 'html'],
		},
	},
})