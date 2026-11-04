/**
 * @file board-drag.spec.js
 * @description Real pointer and keyboard drags on the board, in a real browser.
 *
 * BoardDetailPage.test.jsx covers what the drag handlers do with a given event.
 * These cover the part jsdom can't: that a gesture on the rendered board
 * activates a drag, collides with the right target, and ends in the expected
 * order and request.
 *
 * The Escape tests first check the drag has visibly moved something, so they
 * can't pass just because the drag never started.
 */
import { expect, test } from '@playwright/test';
import {
	cardItem,
	cardOrder,
	column,
	dragKey,
	liftCardOver,
	liftListOver,
	listOrder,
	openBoard,
} from './support/board';

const INITIAL_LISTS = ['To Do', 'Doing', 'Done'];
const INITIAL_TO_DO = ['Card A', 'Card B', 'Card C'];

test.describe('pointer drags', () => {
	test('reorders the lists', async ({ page }) => {
		const writes = await openBoard(page);

		await liftListOver(page, 'To Do', column(page, 'Doing'));
		await page.mouse.up();

		await expect.poll(() => listOrder(page)).toEqual(['Doing', 'To Do', 'Done']);
		await expect.poll(() => writes).toEqual([{ path: '/api/lists/reorder', body: [4, 3, 5] }]);

		/* The columns really moved on screen, not just in the DOM's order. */
		await expect
			.poll(async () => {
				const toDo = await column(page, 'To Do').boundingBox();
				const doing = await column(page, 'Doing').boundingBox();
				return doing.x < toDo.x;
			})
			.toBe(true);
	});

	test('reorders a card within its list', async ({ page }) => {
		const writes = await openBoard(page);

		await liftCardOver(page, 'Card A', cardItem(page, 'Card C'), 'bottom');
		await page.mouse.up();

		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(['Card B', 'Card C', 'Card A']);
		await expect
			.poll(() => writes)
			.toEqual([{ path: '/api/cards/11/reorder', body: { listId: 3, position: '00004000' } }]);
	});

	test('moves a card onto a card in another list', async ({ page }) => {
		const writes = await openBoard(page);

		await liftCardOver(page, 'Card B', cardItem(page, 'Card D'));
		await page.mouse.up();

		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(['Card A', 'Card C']);
		await expect.poll(() => cardOrder(page, 'Doing')).toContain('Card B');
		await expect.poll(() => writes.length).toBe(1);
		expect(writes[0].path).toBe('/api/cards/12/reorder');
		expect(writes[0].body.listId).toBe(4);
	});

	test('holds a cross-list hover until the drop', async ({ page }) => {
		await openBoard(page);

		await liftCardOver(page, 'Card B', cardItem(page, 'Card D'));

		expect(await cardOrder(page, 'To Do')).toContain('Card B');
		expect(await cardOrder(page, 'Doing')).toEqual(['Card D']);

		await page.mouse.up();
		await expect.poll(() => cardOrder(page, 'Doing')).toContain('Card B');
		expect(await cardOrder(page, 'To Do')).not.toContain('Card B');
	});

	test('drops a card anywhere in an empty column', async ({ page }) => {
		const writes = await openBoard(page);

		await liftCardOver(page, 'Card A', column(page, 'Done'), 'bottom');
		await page.mouse.up();

		await expect.poll(() => cardOrder(page, 'Done')).toEqual(['Card A']);
		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(['Card B', 'Card C']);
		await expect
			.poll(() => writes)
			.toEqual([{ path: '/api/cards/11/reorder', body: { listId: 5, position: '00001000' } }]);
	});

	test('Escape cancels a list drag and saves nothing', async ({ page }) => {
		const writes = await openBoard(page);

		await liftListOver(page, 'To Do', column(page, 'Doing'));
		await expect.poll(() => listOrder(page)).toEqual(['Doing', 'To Do', 'Done']);

		await page.keyboard.press('Escape');
		await page.mouse.up();

		await expect.poll(() => listOrder(page)).toEqual(INITIAL_LISTS);
		expect(writes).toEqual([]);
	});

	test('Escape cancels a card drag and saves nothing', async ({ page }) => {
		const writes = await openBoard(page);

		await liftCardOver(page, 'Card A', cardItem(page, 'Card C'), 'bottom');
		await expect.poll(() => cardOrder(page, 'To Do')).not.toEqual(INITIAL_TO_DO);

		await page.keyboard.press('Escape');
		await page.mouse.up();

		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(INITIAL_TO_DO);
		expect(writes).toEqual([]);
	});

	test('rolls a list drag back when the save fails', async ({ page }) => {
		const writes = await openBoard(page, { failWrites: 500 });

		await liftListOver(page, 'To Do', column(page, 'Doing'));
		await page.mouse.up();

		await expect.poll(() => writes.length).toBe(1);
		await expect.poll(() => listOrder(page)).toEqual(INITIAL_LISTS);
		await expect(page.getByText(/Server said no/)).toBeVisible();
	});

	test('rolls a card drag back when the save fails', async ({ page }) => {
		const writes = await openBoard(page, { failWrites: 500 });

		await liftCardOver(page, 'Card B', cardItem(page, 'Card D'));
		await page.mouse.up();

		await expect.poll(() => writes.length).toBe(1);
		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(INITIAL_TO_DO);
		await expect(page.getByText(/Server said no/)).toBeVisible();
	});

	test('a single click on a card opens it instead of dragging', async ({ page }) => {
		const writes = await openBoard(page);

		await cardItem(page, 'Card A').locator('.MuiListItemText-primary').click();

		await expect(page.getByRole('dialog')).toBeVisible();
		await expect(page).toHaveURL(/[?&]card=11\b/);
		expect(writes).toEqual([]);
	});

	test('a press and move on a card without a first click does nothing', async ({ page }) => {
		const writes = await openBoard(page);

		const title = await cardItem(page, 'Card A').locator('.MuiListItemText-primary').boundingBox();
		const target = await column(page, 'Done').boundingBox();
		await page.mouse.move(title.x + 5, title.y + 5);
		await page.mouse.down();
		await page.mouse.move(target.x + target.width / 2, target.y + 200, { steps: 10 });
		await page.mouse.up();

		expect(await listOrder(page)).toEqual(INITIAL_LISTS);
		expect(await cardOrder(page, 'To Do')).toEqual(INITIAL_TO_DO);
		expect(writes).toEqual([]);
	});
});

test.describe('keyboard drags', () => {
	test('reorders the lists', async ({ page }) => {
		const writes = await openBoard(page);

		await column(page, 'To Do').focus();
		await dragKey(page, 'Space');
		await dragKey(page, 'ArrowRight');
		await expect.poll(() => listOrder(page)).toEqual(['Doing', 'To Do', 'Done']);
		await dragKey(page, 'Space');

		await expect.poll(() => writes).toEqual([{ path: '/api/lists/reorder', body: [4, 3, 5] }]);
		expect(await listOrder(page)).toEqual(['Doing', 'To Do', 'Done']);
	});

	test('reorders a card within its list', async ({ page }) => {
		const writes = await openBoard(page);

		await cardItem(page, 'Card A').focus();
		await dragKey(page, 'Space');
		await dragKey(page, 'ArrowDown');
		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(['Card B', 'Card A', 'Card C']);
		await dragKey(page, 'Space');

		await expect
			.poll(() => writes)
			.toEqual([{ path: '/api/cards/11/reorder', body: { listId: 3, position: '00002500' } }]);
	});

	test('moves a card to the next list, above its first card', async ({ page }) => {
		const writes = await openBoard(page);

		await cardItem(page, 'Card A').focus();
		await dragKey(page, 'Space');
		await dragKey(page, 'ArrowRight');
		await dragKey(page, 'Space');

		await expect.poll(() => cardOrder(page, 'Doing')).toEqual(['Card A', 'Card D']);
		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(['Card B', 'Card C']);
		await expect
			.poll(() => writes)
			.toEqual([{ path: '/api/cards/11/reorder', body: { listId: 4, position: '00000500' } }]);
	});

	test('moves a card across two lists into an empty one', async ({ page }) => {
		const writes = await openBoard(page);

		await cardItem(page, 'Card A').focus();
		await dragKey(page, 'Space');
		await dragKey(page, 'ArrowRight');
		await dragKey(page, 'ArrowRight');
		await dragKey(page, 'Space');

		await expect.poll(() => cardOrder(page, 'Done')).toEqual(['Card A']);
		await expect
			.poll(() => writes)
			.toEqual([{ path: '/api/cards/11/reorder', body: { listId: 5, position: '00001000' } }]);
	});

	test('Escape cancels a list drag and saves nothing', async ({ page }) => {
		const writes = await openBoard(page);

		await column(page, 'To Do').focus();
		await dragKey(page, 'Space');
		await dragKey(page, 'ArrowRight');
		await expect.poll(() => listOrder(page)).toEqual(['Doing', 'To Do', 'Done']);
		await dragKey(page, 'Escape');

		await expect.poll(() => listOrder(page)).toEqual(INITIAL_LISTS);
		expect(writes).toEqual([]);
	});

	test('Escape cancels a card drag and saves nothing', async ({ page }) => {
		const writes = await openBoard(page);

		await cardItem(page, 'Card A').focus();
		await dragKey(page, 'Space');
		await dragKey(page, 'ArrowDown');
		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(['Card B', 'Card A', 'Card C']);
		await dragKey(page, 'Escape');

		await expect.poll(() => cardOrder(page, 'To Do')).toEqual(INITIAL_TO_DO);
		expect(writes).toEqual([]);
	});
});
