/**
 * @file rank.js
 * @description Generates a card's `position` rank — the value the backend
 * orders cards by (see `CardService.GetAllCardsAsync`, which does a plain
 * `OrderBy(c => c.Position)` string sort).
 *
 * ── Encoding ────────────────────────────────────────────────────────────────
 *
 * Ranks are fixed-width, zero-padded decimal strings (e.g. "00001000").
 * Fixed width is what makes a plain string sort equivalent to a numeric sort
 * — "00000500" < "00001000" byte-wise exactly when 500 < 1000 numerically.
 * A variable-width scheme (plain `String(n)`) would break that equivalence,
 * since "9" > "10" as strings despite 9 < 10 numerically.
 *
 * Chosen over a general fractional-index/LexoRank string algorithm (arbitrary-
 * precision, variable-length keys that never run out of room) because this
 * board's ranks only ever need to support append-after-last (create) and
 * insert-between-two-neighbors (drag), and a fixed-width integer midpoint
 * covers both without the edge cases a variable-length string algorithm has
 * to guard against (trailing-zero trimming, unbounded key growth, etc.).
 *
 * ── Gap sizing ──────────────────────────────────────────────────────────────
 *
 * New ranks are spaced `RANK_GAP` apart so that many drag-and-drop inserts can
 * each bisect the remaining gap before two neighboring ranks become adjacent
 * integers with no midpoint left. At `RANK_GAP = 1000`, that's ~9 successive
 * inserts into the same gap before exhaustion — ample for a Kanban card's
 * expected reorder frequency. Rebalancing the whole list's ranks, needed once
 * a gap is fully exhausted, is not implemented; `generateRank` degrades to
 * returning a duplicate/adjacent rank instead of throwing (see below).
 */

const RANK_WIDTH = 8;
const RANK_GAP = 1000;

/**
 * Parse a stored position string back into its integer value.
 *
 * Falls back to 0 for anything that isn't a plain non-negative integer
 * string. The backend requires every card to carry a real rank from creation
 * onward (see CardsController.Create's Position check), so this only matters
 * for stale rows predating that guarantee.
 *
 * @param {string|null|undefined} position
 * @returns {number}
 */
function decodeRank(position) {
	if (typeof position !== 'string' || !/^\d+$/.test(position)) return 0;
	return Number(position);
}

/**
 * Format an integer rank back into the fixed-width, zero-padded string the
 * backend stores and sorts on.
 *
 * @param {number} value
 * @returns {string}
 */
function encodeRank(value) {
	return String(Math.max(0, Math.round(value))).padStart(RANK_WIDTH, '0');
}

/**
 * Generate a rank that sorts strictly between `prevPosition` and
 * `nextPosition`.
 *
 * Either bound may be omitted:
 *   - `nextPosition` omitted    — rank goes after `prevPosition` (append to
 *                                 the end of a list; also covers the very
 *                                 first card, where `prevPosition` is also
 *                                 omitted).
 *   - `prevPosition` omitted    — rank goes before `nextPosition` (insert at
 *                                 the top of a list).
 *   - both omitted              — first rank ever assigned in a list.
 *
 * @param {string|null|undefined} prevPosition - Position of the card that
 *   should sort immediately before the new rank, or nullish if there isn't one.
 * @param {string|null|undefined} nextPosition - Position of the card that
 *   should sort immediately after the new rank, or nullish if there isn't one.
 * @returns {string} A fixed-width position string sorting between the two.
 */
export function generateRank(prevPosition, nextPosition) {
	const prev = prevPosition != null ? decodeRank(prevPosition) : 0;

	if (nextPosition == null) {
		return encodeRank((prevPosition != null ? prev : 0) + RANK_GAP);
	}

	const next = decodeRank(nextPosition);
	const midpoint = Math.floor((prev + next) / 2);

	/*
	 * No integer room left between two neighbors one apart (e.g. prev=500,
	 * next=501) — the gap is exhausted. Rebalancing the list is out of scope
	 * (see file header); fall back to sorting immediately after `prev` even
	 * though that may collide with an existing rank.
	 */
	return encodeRank(midpoint > prev ? midpoint : prev + 1);
}
