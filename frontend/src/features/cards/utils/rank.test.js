/**
 * @fileoverview Unit tests for `generateRank` (rank.js).
 *
 * Cases are designed by equivalence partitioning — one representative per
 * kind of placement (empty list, append, insert at top, insert between) — plus
 * boundary values at each partition's edge, where a rank either just fits or
 * the list must be rebalanced (`null`).
 */

import { describe, expect, it } from 'vitest';
import { generateRank } from './rank';

describe('generateRank', () => {
	it.each([
		// partition, prev, next, expected
		['first card in an empty list', undefined, undefined, '00001000'],
		['append after the last card', '00001000', undefined, '00002000'],
		['append landing exactly on RANK_MAX', '99998999', undefined, '99999999'],
		['append that would overflow RANK_MAX', '99999000', undefined, null],
		['insert at the top of a list', undefined, '00001000', '00000500'],
		['insert at the top with no room left', undefined, '00000001', null],
		['insert between two neighbours', '00000500', '00000502', '00000501'],
		['insert between adjacent neighbours', '00000500', '00000501', null],
		['malformed stored rank decodes to 0', 'a1', undefined, '00001000'],
		['null bounds are treated like omitted ones', null, null, '00001000'],
	])('%s: (%s, %s) → %s', (_partition, prev, next, expected) => {
		expect(generateRank(prev, next)).toBe(expected);
	});

	it('always returns a fixed-width, 8-digit string', () => {
		for (const [prev, next] of [
			[undefined, undefined],
			['00000001', undefined],
			[undefined, '00000004'],
			['00000002', '00000010'],
		]) {
			expect(generateRank(prev, next)).toMatch(/^\d{8}$/);
		}
	});

	/*
	 * The whole encoding exists so that the backend's plain *string* sort
	 * orders cards correctly. This drives the worst case — every new card
	 * dropped directly below the same card, halving the same gap each time —
	 * and checks that invariant at every step, then that exhaustion arrives
	 * after the ~9 inserts rank.js documents for RANK_GAP = 1000.
	 */
	it('bisects one gap with string-sortable ranks until it is exhausted', () => {
		const prev = '00001000';
		let next = '00002000';
		let inserts = 0;

		for (;;) {
			const rank = generateRank(prev, next);
			if (rank === null) break;

			expect(prev < rank && rank < next).toBe(true);
			next = rank;
			inserts += 1;
		}

		expect(inserts).toBe(9);
		expect(next).toBe('00001001');
	});
});
