/**
 * @fileoverview Render helper for component tests.
 *
 * Components style themselves through `sx` callbacks that read the app's
 * custom palette tokens (`background.surface`, `border.hover`,
 * `border.active`). MUI's default theme doesn't define those, so a component
 * rendered without the app theme crashes before any assertion runs. Every
 * component test renders through `renderWithTheme` instead of plain `render`.
 */

import { ThemeProvider } from '@mui/material';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import theme from '../app/theme';

/** Wraps a tree in the app theme; also passed to `rerender` via `wrapper`. */
function ThemeWrapper({ children }) {
	return <ThemeProvider theme={theme}>{children}</ThemeProvider>;
}

/**
 * Render `ui` inside the app's ThemeProvider, with a fresh user-event session.
 *
 * The theme goes in as Testing Library's `wrapper` option, rather than being
 * wrapped around `ui` here, so a later `rerender(<X newProps />)` keeps the
 * theme too.
 *
 * `userEvent.setup()` is called once per render, as the user-event docs
 * recommend, so each test drives its own simulated keyboard/pointer state.
 * `delay: null` skips the timer tick user-event otherwise waits between
 * keystrokes — the same events still fire, in the same order; it roughly
 * halved CardEditDialog's run time, where most tests type into fields.
 *
 * @param {JSX.Element} ui - The element under test.
 * @returns {import('@testing-library/react').RenderResult & {
 *   user: import('@testing-library/user-event').UserEvent
 * }} Testing Library's render result plus a `user` to drive interactions.
 */
export function renderWithTheme(ui) {
	return {
		user: userEvent.setup({ delay: null }),
		...render(ui, { wrapper: ThemeWrapper }),
	};
}
