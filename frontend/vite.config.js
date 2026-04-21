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
 * `defineConfig` is a helper from Vite that provides IntelliSense/type-checking
 * for the config object without needing a TypeScript setup. It is a pure
 * identity function at runtime — it just returns the object passed to it —
 * but editors and IDEs use it to infer the correct config shape.
 */
import { defineConfig } from 'vite'

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
})