/**
 * @fileoverview Conversions between the server's ISO timestamps and the
 * `YYYY-MM-DDTHH:mm` strings an `<input type="datetime-local">` reads and
 * writes, in the browser's local time zone.
 */

/**
 * Format an ISO timestamp as a local `datetime-local` value, to the minute.
 *
 *   toDateTimeLocal('2026-10-05T09:07:45Z') → "2026-10-05T16:07" (in UTC+7)
 *
 * @param {string} iso - An ISO-8601 timestamp.
 * @returns {string} The local date and time, or '' for a missing/invalid input.
 */
export function toDateTimeLocal(iso) {
	const date = new Date(iso ?? '');
	if (Number.isNaN(date.getTime())) return '';
	const pad = (n) => String(n).padStart(2, '0');
	return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/**
 * Parse a `datetime-local` value (local time, no offset) into an ISO UTC string.
 *
 * @param {string} value - e.g. "2026-10-05T16:07".
 * @returns {string|null} The ISO timestamp, or null if `value` isn't a valid
 *   `datetime-local` value.
 */
export function fromDateTimeLocal(value) {
	if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value ?? '')) return null;
	const date = new Date(value);
	return Number.isNaN(date.getTime()) ? null : date.toISOString();
}
