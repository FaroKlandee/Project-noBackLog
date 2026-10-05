/**
 * @fileoverview Unit tests for `formatDuration` (formatDuration.js).
 *
 * Boundary values sit on both sides of every unit rollover (second → minute →
 * hour), where the label changes shape. `formatClock`/`formatTime` are not
 * tested: they are thin wrappers over `Intl` whose output depends on the
 * machine's locale and time zone.
 */

import { describe, expect, it } from 'vitest';
import { formatDuration } from './formatDuration';

describe('formatDuration', () => {
	it.each([
		// clamped to 0 — guards clock skew in the live elapsed counter
		['zero', 0, '0s'],
		['just below zero', -1, '0s'],
		['a negative duration', -5_000, '0s'],
		['NaN', Number.NaN, '0s'],
		['Infinity', Number.POSITIVE_INFINITY, '0s'],
		// sub-second remainders are truncated, never rounded up
		['just under one second', 999, '0s'],
		// seconds → minutes rollover
		['just under one minute', 59_999, '59s'],
		['exactly one minute', 60_000, '1m 00s'],
		// minutes → hours rollover
		['just under one hour', 3_599_999, '59m 59s'],
		['exactly one hour', 3_600_000, '1h 00m 00s'],
		// zero-padding of the smaller units (the JSDoc examples)
		['minutes with padded seconds', 243_000, '4m 03s'],
		['hours with padded minutes and seconds', 3_912_000, '1h 05m 12s'],
		// hours are not capped or rolled into days
		['more than a day', 90_000_000, '25h 00m 00s'],
	])('%s: %d ms → %s', (_case, ms, expected) => {
		expect(formatDuration(ms)).toBe(expected);
	});
});
