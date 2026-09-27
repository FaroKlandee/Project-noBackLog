/**
 * @fileoverview Display formatters for time-log durations and timestamps.
 */

/**
 * Format a duration in milliseconds as a compact label.
 *
 *   formatDuration(12_000)     → "12s"
 *   formatDuration(243_000)    → "4m 03s"
 *   formatDuration(3_912_000)  → "1h 05m 12s"
 *
 * Negative or non-finite input is clamped to 0 (guards client/server clock skew
 * in the live elapsed counter).
 *
 * @param {number} ms - Duration in milliseconds.
 * @returns {string} The formatted duration.
 */
export function formatDuration(ms) {
	const totalSeconds = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
	const hours = Math.floor(totalSeconds / 3600);
	const minutes = Math.floor((totalSeconds % 3600) / 60);
	const seconds = totalSeconds % 60;
	const pad = (n) => String(n).padStart(2, '0');

	if (hours > 0) return `${hours}h ${pad(minutes)}m ${pad(seconds)}s`;
	if (minutes > 0) return `${minutes}m ${pad(seconds)}s`;
	return `${seconds}s`;
}

/**
 * Format an ISO timestamp as a short local date + time, e.g. "Sep 27, 4:12 PM".
 *
 * @param {string} iso - An ISO-8601 timestamp (the server sends UTC with a `Z`).
 * @returns {string} The formatted local date and time.
 */
export function formatClock(iso) {
	return new Date(iso).toLocaleString(undefined, {
		month: 'short',
		day: 'numeric',
		hour: 'numeric',
		minute: '2-digit',
	});
}

/**
 * Format an ISO timestamp as a short local time only, e.g. "4:12 PM".
 *
 * @param {string} iso - An ISO-8601 timestamp.
 * @returns {string} The formatted local time.
 */
export function formatTime(iso) {
	return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
}
