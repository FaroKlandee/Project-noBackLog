/**
 * @fileoverview Tests for `ListColumn`.
 *
 * Every mutation is a prop the board wires to useLists/useBoardCards, so the
 * tests pass `vi.fn()`s and need no network. The column renders inside a real
 * `DragDropProvider`, because its `useSortable`/`useDroppable` calls need one;
 * dragging itself is covered by the BoardDetailPage tests.
 *
 * The column is a <section> named by its list name. Its controls are found by
 * role and name; the list title is plain text that becomes a field on click.
 */

import { DragDropProvider } from '@dnd-kit/react';
import { screen, waitFor, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../../test/render';
import ListColumn from './ListColumn';

const list = { id: 3, name: 'To Do' };
const cards = [
	{ id: 1, listId: 3, title: 'Fix login', priority: 'High', position: '00001000' },
	{ id: 2, listId: 3, title: 'Write docs', priority: 'Low', position: '00002000' },
];

/** A promise whose settlement the test controls, to hold a request in flight. */
function deferred() {
	let resolve;
	let reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Render the column with `vi.fn()` handlers; any prop can be overridden. */
function renderColumn(props = {}) {
	const handlers = {
		deleteExistingList: vi.fn().mockResolvedValue(undefined),
		renameList: vi.fn().mockResolvedValue(undefined),
		onCreateCard: vi.fn().mockResolvedValue(undefined),
		onDeleteCard: vi.fn().mockResolvedValue(undefined),
		onEditCard: vi.fn(),
		onDismissMutationError: vi.fn(),
		onDismissListError: vi.fn(),
	};
	const view = renderWithTheme(
		<DragDropProvider>
			<ListColumn list={list} index={0} cards={cards} {...handlers} {...props} />
		</DragDropProvider>
	);
	return { ...view, ...handlers, ...props };
}

describe('ListColumn', () => {
	it('shows the list name, a card count and its cards', () => {
		renderColumn();

		const column = screen.getByLabelText('To Do', { selector: 'section' });
		expect(within(column).getByText('2')).toBeInTheDocument();
		expect(within(column).getByText('Fix login')).toBeInTheDocument();
		expect(within(column).getByText('Write docs')).toBeInTheDocument();
	});

	/*
	 * Creating a card ranks it after the list's last card, which isn't known
	 * until the cards have loaded — so the count and Add card stay hidden.
	 */
	it.each([
		['loading', { cardsLoading: true }],
		['failed', { cardsError: 'HTTP error: 500 Internal Server Error' }],
	])('hides the count and Add card while the cards are %s', (_state, props) => {
		renderColumn(props);

		expect(screen.queryByText('2')).not.toBeInTheDocument();
		expect(screen.queryByRole('button', { name: 'Add card' })).not.toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'List options' })).toBeInTheDocument();
	});

	describe('renaming', () => {
		/** Click the title to swap in the (auto-focused, pre-selected) name field. */
		async function startRename(user) {
			await user.click(screen.getByText('To Do'));
			return screen.getByRole('textbox', { name: 'List name' });
		}

		it('renames on Enter with the trimmed name', async () => {
			const { user, renameList } = renderColumn();

			const input = await startRename(user);
			expect(input).toHaveValue('To Do');
			expect(input).toHaveFocus();
			await user.keyboard('  Backlog  {Enter}');

			expect(renameList).toHaveBeenCalledExactlyOnceWith(3, 'Backlog');
			expect(screen.queryByRole('textbox', { name: 'List name' })).not.toBeInTheDocument();
		});

		it('renames when the field loses focus', async () => {
			const { user, renameList } = renderColumn();

			await startRename(user);
			await user.keyboard('Backlog');
			await user.click(document.body);

			expect(renameList).toHaveBeenCalledExactlyOnceWith(3, 'Backlog');
		});

		it('discards the draft on Escape', async () => {
			const { user, renameList } = renderColumn();

			await startRename(user);
			await user.keyboard('Backlog{Escape}');

			expect(renameList).not.toHaveBeenCalled();
			expect(screen.getByText('To Do')).toBeInTheDocument();
		});

		it.each([
			['blank', '   '],
			['unchanged', 'To Do'],
		])('sends nothing for a %s name', async (_case, name) => {
			const { user, renameList } = renderColumn();

			const input = await startRename(user);
			await user.clear(input);
			await user.type(input, `${name}{Enter}`);

			expect(renameList).not.toHaveBeenCalled();
			expect(screen.getByText('To Do')).toBeInTheDocument();
		});

		/*
		 * renameList never touches `list.name` on failure, so once the rename
		 * settles the optimistic title falls back to the prop on its own.
		 */
		it('shows the new name while saving, and falls back to the old one if it fails', async () => {
			const save = deferred();
			const { user } = renderColumn({ renameList: vi.fn(() => save.promise) });

			await startRename(user);
			await user.keyboard('Backlog{Enter}');
			expect(screen.getByText('Backlog')).toBeInTheDocument();

			save.resolve();

			expect(await screen.findByText('To Do')).toBeInTheDocument();
			expect(screen.queryByText('Backlog')).not.toBeInTheDocument();
		});
	});

	it('deletes the list from its options menu', async () => {
		const { user, deleteExistingList } = renderColumn();

		await user.click(screen.getByRole('button', { name: 'List options' }));
		await user.click(screen.getByRole('menuitem', { name: 'Delete list' }));

		expect(deleteExistingList).toHaveBeenCalledExactlyOnceWith(3);
		await waitFor(() => expect(screen.queryByRole('menu')).not.toBeInTheDocument());
	});

	describe('adding a card', () => {
		/** Open the add-card form and return its (auto-focused) title field. */
		async function openForm(user) {
			await user.click(screen.getByRole('button', { name: 'Add card' }));
			return screen.getByRole('textbox', { name: 'Card title' });
		}

		it('creates a trimmed card at the default priority, then clears for the next one', async () => {
			const { user, onCreateCard } = renderColumn();

			const title = await openForm(user);
			expect(title).toHaveFocus();
			expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('Medium');
			await user.type(title, '  Ship it  ');
			await user.click(screen.getByRole('button', { name: 'Add (Shift+↵)' }));

			expect(onCreateCard).toHaveBeenCalledExactlyOnceWith(3, {
				title: 'Ship it',
				priority: 'Medium',
			});
			await waitFor(() => expect(title).toHaveValue(''));
			expect(title).toHaveFocus();
		});

		it('submits with Shift+Enter, and Enter alone moves on to the priority', async () => {
			const { user, onCreateCard } = renderColumn();

			const title = await openForm(user);
			await user.type(title, 'Ship it{Enter}');
			expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveFocus();
			expect(onCreateCard).not.toHaveBeenCalled();

			await user.keyboard('{Shift>}{Enter}{/Shift}');

			expect(onCreateCard).toHaveBeenCalledExactlyOnceWith(3, {
				title: 'Ship it',
				priority: 'Medium',
			});
		});

		/* L/M/H set the priority only from outside the title field, so typing them still works. */
		it('sets the priority with L/M/H outside the title field', async () => {
			const { user, onCreateCard } = renderColumn();

			const title = await openForm(user);
			await user.type(title, 'Hhh{Enter}');
			const priority = screen.getByRole('combobox', { name: 'Priority' });
			await user.keyboard('h');
			expect(priority).toHaveTextContent('High');
			await user.keyboard('l');
			expect(priority).toHaveTextContent('Low');
			await user.keyboard('{Shift>}{Enter}{/Shift}');

			expect(onCreateCard).toHaveBeenCalledExactlyOnceWith(3, { title: 'Hhh', priority: 'Low' });
		});

		it('picks a priority from the dropdown', async () => {
			const { user, onCreateCard } = renderColumn();

			const title = await openForm(user);
			await user.type(title, 'Ship it');
			await user.click(screen.getByRole('combobox', { name: 'Priority' }));
			await user.click(screen.getByRole('option', { name: 'High' }));
			await user.click(screen.getByRole('button', { name: 'Add (Shift+↵)' }));

			expect(onCreateCard).toHaveBeenCalledExactlyOnceWith(3, {
				title: 'Ship it',
				priority: 'High',
			});
		});

		it('ignores a blank title', async () => {
			const { user, onCreateCard } = renderColumn();

			const title = await openForm(user);
			await user.type(title, '   ');
			await user.click(screen.getByRole('button', { name: 'Add (Shift+↵)' }));

			expect(onCreateCard).not.toHaveBeenCalled();
		});

		it('disables the Add button while the card is being created', async () => {
			const create = deferred();
			const { user } = renderColumn({ onCreateCard: vi.fn(() => create.promise) });

			const title = await openForm(user);
			await user.type(title, 'Ship it{Shift>}{Enter}{/Shift}');
			expect(screen.getByRole('button', { name: '…' })).toBeDisabled();

			create.resolve();

			expect(await screen.findByRole('button', { name: 'Add (Shift+↵)' })).toBeEnabled();
		});

		it('closes and resets on Cancel', async () => {
			const { user } = renderColumn();

			const title = await openForm(user);
			await user.type(title, 'Ship it');
			await user.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(screen.queryByRole('textbox', { name: 'Card title' })).not.toBeInTheDocument();
			expect(await openForm(user)).toHaveValue('');
		});

		it('closes when focus leaves the form, but not for the priority dropdown', async () => {
			const { user } = renderColumn();

			const title = await openForm(user);
			await user.click(screen.getByRole('combobox', { name: 'Priority' }));
			await user.click(screen.getByRole('option', { name: 'Low' }));
			expect(title).toBeInTheDocument();

			await user.click(document.body);

			expect(screen.queryByRole('textbox', { name: 'Card title' })).not.toBeInTheDocument();
		});
	});

	describe('cards', () => {
		it('passes deletes and edits up tagged with this list’s id', async () => {
			const { user, onDeleteCard, onEditCard } = renderColumn();

			const [firstOptions] = screen.getAllByRole('button', { name: 'Card options' });
			await user.click(firstOptions);
			await user.click(screen.getByRole('menuitem', { name: 'Delete' }));
			expect(onDeleteCard).toHaveBeenCalledExactlyOnceWith(3, 1);

			await user.click(screen.getAllByRole('button', { name: 'Card options' })[1]);
			await user.click(screen.getByRole('menuitem', { name: 'Edit' }));
			expect(onEditCard).toHaveBeenCalledExactlyOnceWith(3, cards[1]);
		});
	});

	describe('error banners', () => {
		it.each([
			['list', 'listError', 'onDismissListError', "Couldn't rename"],
			['card', 'mutationError', 'onDismissMutationError', "Couldn't move the card"],
		])('shows the %s error and dismisses it', async (_kind, prop, dismiss, message) => {
			const view = renderColumn({ [prop]: message });

			expect(screen.getByRole('alert')).toHaveTextContent(message);
			await view.user.click(
				within(screen.getByRole('alert')).getByRole('button', { name: 'Close' })
			);

			expect(view[dismiss]).toHaveBeenCalledOnce();
		});
	});
});
