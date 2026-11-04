/**
 * @fileoverview Tests for the datetime-local converters.
 *
 * Both work in the machine's local time zone, so expectations are built from
 * local `Date` parts rather than hard-coded UTC strings.
 */

import { describe, expect, it } from 'vitest';
import { fromDateTimeLocal, toDateTimeLocal } from './dateTimeLocal';

describe('toDateTimeLocal', () => {
	it('formats a timestamp as local date and time, zero-padded, to the minute', () => {
		const iso = new Date(2026, 0, 5, 7, 3, 45).toISOString();

		expect(toDateTimeLocal(iso)).toBe('2026-01-05T07:03');
	});

	it('returns an empty string for a missing or invalid timestamp', () => {
		expect(toDateTimeLocal(null)).toBe('');
		expect(toDateTimeLocal(undefined)).toBe('');
		expect(toDateTimeLocal('not a date')).toBe('');
	});
});

describe('fromDateTimeLocal', () => {
	it('reads the value as local time and returns it as an ISO UTC string', () => {
		expect(fromDateTimeLocal('2026-10-05T16:07')).toBe(new Date(2026, 9, 5, 16, 7).toISOString());
	});

	it('round-trips with toDateTimeLocal', () => {
		const value = '2026-12-31T23:59';

		expect(toDateTimeLocal(fromDateTimeLocal(value))).toBe(value);
	});

	it('returns null for an empty, partial or invalid value', () => {
		expect(fromDateTimeLocal('')).toBeNull();
		expect(fromDateTimeLocal(null)).toBeNull();
		expect(fromDateTimeLocal('2026-10-05')).toBeNull();
		expect(fromDateTimeLocal('2026-13-45T99:99')).toBeNull();
	});
});
