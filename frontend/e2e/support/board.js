/**
 * @file board.js
 * @description Helpers for the browser-level board tests: a stubbed API, ways
 * to read the rendered board, and the real pointer gestures a drag is made of.
 */
import { expect } from '@playwright/test';

/* api.js's fallback and .env.development's value. Stubbed, so nothing listens here. */
const API = 'http://localhost:5000';

const CORS_HEADERS = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type',
};

/*
 * Card 3 deliberately shares its numeric id with list 3: dnd-kit keeps one
 * registry for both, which is why ids are prefixed (see ListColumn.jsx). An
 * unprefixed collision would leave that list unable to move.
 */
const BOARD = { id: 7, name: 'Roadmap' };
const LISTS = [
	{ id: 3, name: 'To Do', boardId: 7, position: 0 },
	{ id: 4, name: 'Doing', boardId: 7, position: 1 },
	{ id: 5, name: 'Done', boardId: 7, position: 2 },
];
const CARDS = [
	{ id: 11, title: 'Card A', priority: 'Medium', listId: 3, position: '00001000' },
	{ id: 12, title: 'Card B', priority: 'High', listId: 3, position: '00002000' },
	{ id: 3, title: 'Card C', priority: 'Low', listId: 3, position: '00003000' },
	{ id: 14, title: 'Card D', priority: 'Medium', listId: 4, position: '00001000' },
];

/**
 * Stub the API and open the board, waiting until its cards have rendered.
 *
 * @param {import('@playwright/test').Page} page
 * @param {Object} [options]
 * @param {number} [options.failWrites] - Status to answer every PATCH with,
 *   to exercise a drag's rollback. Writes succeed when it's omitted.
 * @returns {Promise<Array<{ path: string, body: any }>>} The PATCH requests
 *   received, appended to as they arrive.
 */
export async function openBoard(page, { failWrites } = {}) {
	const writes = [];

	await page.route(`${API}/api/**`, async (route) => {
		const request = route.request();
		const url = new URL(request.url());
		const json = (data, status = 200) =>
			route.fulfill({ status, json: { success: status < 400, data }, headers: CORS_HEADERS });

		if (request.method() === 'OPTIONS') {
			return route.fulfill({ status: 204, headers: CORS_HEADERS });
		}
		if (request.method() === 'PATCH') {
			writes.push({ path: url.pathname, body: request.postDataJSON() });
			return failWrites
				? route.fulfill({
						status: failWrites,
						json: { success: false, message: 'Server said no' },
						headers: CORS_HEADERS,
					})
				: json(null);
		}
		if (url.pathname === '/api/boards/7') return json(BOARD);
		if (url.pathname === '/api/lists') return json(LISTS);
		if (url.pathname === '/api/cards') return json(CARDS);
		return route.fulfill({ status: 404, json: { success: false }, headers: CORS_HEADERS });
	});

	await page.goto('/boards/7');
	await expect(cardItem(page, 'Card A')).toBeVisible();
	return writes;
}

/** A list column, found by the list name that labels it. */
export function column(page, name) {
	return page.locator(`section[aria-label="${name}"]`);
}

/** A card on the board. Drag previews render outside the columns' lists. */
export function cardItem(page, title) {
	return page.locator('section [data-card-item]').filter({ hasText: title });
}

/** Column names, left to right. */
export function listOrder(page) {
	return page.locator('section[aria-label]').evaluateAll((els) => els.map((el) => el.ariaLabel));
}

/** One column's card titles, top to bottom. */
export function cardOrder(page, listName) {
	return column(page, listName)
		.locator('[data-card-item] .MuiListItemText-primary')
		.allTextContents();
}

/** The centre of an element, in page coordinates. */
async function centreOf(locator) {
	const box = await locator.boundingBox();
	return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/*
 * Move in steps with a pause on arrival: dnd-kit resolves collisions once per
 * animation frame, so a single jump to the target can end the drag before it
 * has registered a hover.
 */
async function moveInSteps(page, { x, y }) {
	await page.mouse.move(x, y, { steps: 15 });
	await page.waitForTimeout(100);
	await page.mouse.move(x + 1, y + 1);
	await page.waitForTimeout(100);
}

/**
 * Press a key during a keyboard drag, then let it settle. dnd-kit finishes a
 * keyboard step asynchronously (it sets the drop target, then moves the drag to
 * it), and a key pressed before that lands acts on the previous target.
 */
export async function dragKey(page, key) {
	await page.keyboard.press(key);
	await page.waitForTimeout(300);
}

/**
 * Press a list column by its header and move it onto `target`, leaving the
 * mouse button held. A column drags as soon as the pointer moves 5px.
 */
export async function liftListOver(page, listName, target) {
	const start = await centreOf(
		column(page, listName).getByRole('button', { name: /^Rename list/ })
	);
	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await moveInSteps(page, await centreOf(target));
}

/**
 * Double-press a card and move it onto `target`, leaving the mouse button
 * held. A card drags only when pressed again within 200ms of a click (see
 * CardItem.jsx), so the first click must not be followed by any waiting.
 *
 * @param {'top'|'bottom'|'centre'} [edge] - Where on the target to hover. A
 *   sortable target's edge decides which side of it the card lands on.
 */
export async function liftCardOver(page, title, target, edge = 'centre') {
	const card = cardItem(page, title);
	const start = await centreOf(card.locator('.MuiListItemText-primary'));
	const box = await target.boundingBox();
	const offset = { top: 0.2, centre: 0.5, bottom: 0.8 }[edge];

	await page.mouse.move(start.x, start.y);
	await page.mouse.down();
	await page.mouse.up();
	await page.mouse.down();
	await moveInSteps(page, { x: box.x + box.width / 2, y: box.y + box.height * offset });
}
