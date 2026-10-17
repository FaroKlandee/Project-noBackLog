/**
 * @file constants.js
 * @description Shared constants for the cards feature.
 */

/**
 * Card priority levels, ascending urgency. Mirrors the backend `Priority`
 * enum, which serialises to these exact strings via `JsonStringEnumConverter`
 * (backend-dotnet/Program.cs).
 */
export const PRIORITIES = ['Low', 'Medium', 'High'];

export const DEFAULT_PRIORITY = 'Medium';

/**
 * Theme palette key for each priority (`theme.palette.priority.<key>`).
 */
const PRIORITY_PALETTE_KEYS = { Low: 'low', Medium: 'medium', High: 'high' };

/**
 * The `sx` for a card's priority chip, shared by CardItem and CardPreview so
 * the drag overlay's clone always matches the card it stands in for.
 *
 * @param {import('@mui/material').Theme} theme    - The app theme.
 * @param {string}                        priority - One of PRIORITIES.
 * @returns {Object} The chip's sx object; an unknown priority gets the shape
 *   without colours.
 */
export function priorityChipSx(theme, priority) {
	const colors = theme.palette.priority[PRIORITY_PALETTE_KEYS[priority]];

	return {
		mt: 0.75,
		height: 22,
		fontSize: '0.7rem',
		fontWeight: 700,
		borderRadius: '999px',
		border: 'none',
		...(colors && { bgcolor: colors.bg, color: colors.text }),
	};
}
