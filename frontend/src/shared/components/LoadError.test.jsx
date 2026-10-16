/**
 * @fileoverview Tests for the shared `LoadError` banner.
 *
 * Elements are found the way a user (or a screen reader) finds them — by role
 * and accessible name — rather than by MUI class names, so the tests survive
 * styling changes and fail if the banner stops being announced as an alert.
 */

import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../test/render';
import LoadError from './LoadError';

describe('LoadError', () => {
	it('announces the title and the underlying message as an alert', () => {
		renderWithTheme(
			<LoadError title="Couldn't load lists" message="HTTP error: 500 Internal Server Error" />
		);

		const alert = screen.getByRole('alert');
		expect(alert).toHaveTextContent("Couldn't load lists");
		expect(alert).toHaveTextContent('HTTP error: 500 Internal Server Error');
	});

	it('shows only the title when there is no message', () => {
		renderWithTheme(<LoadError title="Couldn't load lists" />);

		expect(screen.getByRole('alert')).toHaveTextContent(/^Couldn't load lists$/);
	});

	it('calls onRetry once when Retry is clicked', async () => {
		const onRetry = vi.fn();
		const { user } = renderWithTheme(<LoadError title="Couldn't load cards" onRetry={onRetry} />);

		await user.click(screen.getByRole('button', { name: 'Retry' }));

		expect(onRetry).toHaveBeenCalledOnce();
	});

	/*
	 * `queryByRole` returns null instead of throwing, which is what makes an
	 * absence assertion possible — `getByRole` would fail the test on its own.
	 */
	it('offers no Retry button when there is nothing to retry', () => {
		renderWithTheme(<LoadError title="Couldn't load cards" />);

		expect(screen.queryByRole('button', { name: 'Retry' })).not.toBeInTheDocument();
	});
});
