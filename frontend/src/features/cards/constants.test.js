/**
 * @fileoverview Tests for the priority chip's shared sx (constants.js).
 */

import { describe, expect, it } from 'vitest';
import theme from '../../app/theme';
import { PRIORITIES, priorityChipSx } from './constants';

describe('priorityChipSx', () => {
	it.each([
		['Low', 'low'],
		['Medium', 'medium'],
		['High', 'high'],
	])('colours a %s chip from palette.priority.%s', (priority, key) => {
		const sx = priorityChipSx(theme, priority);

		expect(sx.bgcolor).toBe(theme.palette.priority[key].bg);
		expect(sx.color).toBe(theme.palette.priority[key].text);
	});

	it('gives every priority a distinct colour pair', () => {
		const pairs = PRIORITIES.map((p) => {
			const { bgcolor, color } = priorityChipSx(theme, p);
			return `${bgcolor}/${color}`;
		});

		expect(new Set(pairs).size).toBe(PRIORITIES.length);
	});

	it('keeps the chip shape but no colours for an unknown priority', () => {
		const sx = priorityChipSx(theme, 'Urgent');

		expect(sx).toMatchObject({ height: 22, borderRadius: '999px' });
		expect(sx).not.toHaveProperty('bgcolor');
		expect(sx).not.toHaveProperty('color');
	});
});
