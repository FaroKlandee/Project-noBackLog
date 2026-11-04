/**
 * @fileoverview Tests for `Cards` and the `CardItem` rows it renders.
 *
 * Handlers are `vi.fn()`s. The cards render inside a real `DragDropProvider`,
 * because each CardItem's `useSortable` needs one; dragging itself is covered
 * by the BoardDetailPage tests.
 *
 * A card body click opens the editor only after `DOUBLE_PRESS_MS` (200 ms),
 * since a second press within that window starts a drag instead (see
 * CardItem.jsx). Tests wait for that with `waitFor` on real timers: faking
 * timers would also freeze dnd-kit's and MUI's own.
 */

import { DragDropProvider } from '@dnd-kit/react';
import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../../test/render';
import Cards from './Cards';

const cards = [
	{ id: 1, listId: 3, title: 'Fix login', priority: 'High' },
	{ id: 2, listId: 3, title: 'Write docs', priority: 'Low' },
];

/** Render the card list with `vi.fn()` handlers; any prop can be overridden. */
function renderCards(props = {}) {
	const handlers = { onDeleteCard: vi.fn(), onEditCard: vi.fn() };
	const view = renderWithTheme(
		<DragDropProvider>
			<Cards cards={cards} {...handlers} {...props} />
		</DragDropProvider>
	);
	return { ...view, ...handlers };
}

describe('Cards', () => {
	it('renders each card’s title and priority, in order', () => {
		renderCards();

		const titles = screen.getAllByText(/^(Fix login|Write docs)$/).map((el) => el.textContent);
		expect(titles).toEqual(['Fix login', 'Write docs']);
		expect(screen.getByText('High')).toBeInTheDocument();
		expect(screen.getByText('Low')).toBeInTheDocument();
	});

	it('shows placeholders while loading', () => {
		renderCards({ loading: true });

		expect(screen.getByLabelText('Loading cards…')).toBeInTheDocument();
		expect(screen.queryByText('Fix login')).not.toBeInTheDocument();
	});

	/* Not "No cards yet": the list may well have cards that couldn't be fetched. */
	it('says the cards are unavailable when they failed to load', () => {
		renderCards({ error: 'HTTP error: 500 Internal Server Error' });

		expect(screen.getByText('Cards unavailable')).toBeInTheDocument();
		expect(screen.queryByText('No cards yet')).not.toBeInTheDocument();
	});

	it('says so when the list has no cards', () => {
		renderCards({ cards: [] });

		expect(screen.getByText('No cards yet')).toBeInTheDocument();
	});
});

describe('CardItem', () => {
	describe('options menu', () => {
		it('edits the card from its menu', async () => {
			const { user, onEditCard } = renderCards();

			await user.click(screen.getAllByRole('button', { name: 'Card options' })[0]);
			await user.click(screen.getByRole('menuitem', { name: 'Edit' }));

			expect(onEditCard).toHaveBeenCalledExactlyOnceWith(cards[0]);
			await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
		});

		it('deletes the card from its menu', async () => {
			const { user, onDeleteCard } = renderCards();

			await user.click(screen.getAllByRole('button', { name: 'Card options' })[1]);
			await user.click(screen.getByRole('menuitem', { name: 'Delete' }));

			expect(onDeleteCard).toHaveBeenCalledExactlyOnceWith(2);
		});

		/* The button sits inside the clickable body; its click must not also open the card. */
		it('opening the menu doesn’t open the card', async () => {
			const { user, onEditCard } = renderCards();

			await user.click(screen.getAllByRole('button', { name: 'Card options' })[0]);
			await new Promise((resolve) => setTimeout(resolve, 300));

			expect(onEditCard).not.toHaveBeenCalled();
		});
	});

	describe('clicking the card', () => {
		it('opens the card once the double-press window has passed', async () => {
			const { user, onEditCard } = renderCards();

			await user.click(screen.getByText('Fix login'));
			expect(onEditCard).not.toHaveBeenCalled();

			await waitFor(() => expect(onEditCard).toHaveBeenCalledExactlyOnceWith(cards[0]));
		});

		/* The second press cancels the first click's pending open, so it opens once. */
		it('opens the card straight away, once, on a double click', async () => {
			const { user, onEditCard } = renderCards();

			await user.dblClick(screen.getByText('Fix login'));
			expect(onEditCard).toHaveBeenCalledExactlyOnceWith(cards[0]);

			await new Promise((resolve) => setTimeout(resolve, 300));
			expect(onEditCard).toHaveBeenCalledOnce();
		});

		/* A press that travels is the tail of a drag, not a click. */
		it('doesn’t open the card when the pointer moved between press and release', async () => {
			const { user, onEditCard } = renderCards();
			const title = screen.getByText('Fix login');

			await user.pointer([
				{ keys: '[MouseLeft>]', target: title, coords: { clientX: 0, clientY: 0 } },
				{ target: title, coords: { clientX: 40, clientY: 0 } },
				{ keys: '[/MouseLeft]', target: title, coords: { clientX: 40, clientY: 0 } },
			]);
			await new Promise((resolve) => setTimeout(resolve, 300));

			expect(onEditCard).not.toHaveBeenCalled();
		});

		it('doesn’t open a card that unmounts before the window passes', async () => {
			const { user, onEditCard, rerender } = renderCards();

			await user.click(screen.getByText('Fix login'));
			rerender(
				<DragDropProvider>
					<Cards cards={[]} onDeleteCard={vi.fn()} onEditCard={onEditCard} />
				</DragDropProvider>
			);
			await new Promise((resolve) => setTimeout(resolve, 300));

			expect(onEditCard).not.toHaveBeenCalled();
		});
	});
});
