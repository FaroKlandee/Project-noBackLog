/**
 * @fileoverview Tests for `Lists`, the row of columns plus the add-list form.
 *
 * Lists is presentational: it slices the board's card record per column and
 * scopes the board-level mutation errors to the column (or form) they belong
 * to. Handlers are `vi.fn()`s; the real ListColumns render inside a
 * `DragDropProvider` because their `useSortable` calls need one.
 */

import { DragDropProvider } from '@dnd-kit/react';
import { screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../../test/render';
import Lists from './Lists';

const lists = [
	{ id: 3, name: 'To Do' },
	{ id: 4, name: 'Doing' },
];

/** Render the row with `vi.fn()` handlers; any prop can be overridden. */
function renderLists(props = {}) {
	const handlers = {
		createNewList: vi.fn().mockResolvedValue(true),
		deleteExistingList: vi.fn(),
		renameList: vi.fn(),
		onCreateCard: vi.fn(),
		onDeleteCard: vi.fn(),
		onEditCard: vi.fn(),
		onDismissCardMutationError: vi.fn(),
		onDismissListMutationError: vi.fn(),
	};
	const view = renderWithTheme(
		<DragDropProvider>
			<Lists lists={lists} {...handlers} {...props} />
		</DragDropProvider>
	);
	return { ...view, ...handlers, ...props };
}

/** A column, found by its list name (see the BoardDetailPage tests for why not by role). */
function column(name) {
	return screen.getByLabelText(name, { selector: 'section' });
}

describe('Lists', () => {
	it('says so when the board has no lists, and still offers to add one', () => {
		renderLists({ lists: [] });

		expect(screen.getByText('No lists for now...')).toBeInTheDocument();
		expect(screen.getByRole('button', { name: 'Add new list' })).toBeInTheDocument();
	});

	it('gives each column only its own cards, and an empty one for a list with none', () => {
		renderLists({
			cardsByList: { 3: [{ id: 1, listId: 3, title: 'Fix login', priority: 'High' }] },
		});

		expect(within(column('To Do')).getByText('Fix login')).toBeInTheDocument();
		expect(within(column('Doing')).queryByText('Fix login')).not.toBeInTheDocument();
		expect(within(column('Doing')).getByText('No cards yet')).toBeInTheDocument();
	});

	it('passes the board’s card loading state to every column', () => {
		renderLists({ cardsLoading: true });

		expect(within(column('To Do')).getByLabelText('Loading cards…')).toBeInTheDocument();
		expect(within(column('Doing')).getByLabelText('Loading cards…')).toBeInTheDocument();
	});

	describe('error scoping', () => {
		it('shows a card error only in the column it came from', () => {
			renderLists({ cardMutationError: { listId: 4, message: "Couldn't move the card" } });

			expect(within(column('Doing')).getByRole('alert')).toHaveTextContent(
				"Couldn't move the card"
			);
			expect(within(column('To Do')).queryByRole('alert')).not.toBeInTheDocument();
		});

		it('shows a list error only in that list’s column', () => {
			renderLists({ listMutationError: { listId: 3, message: 'HTTP error: 404 Not Found' } });

			expect(within(column('To Do')).getByRole('alert')).toHaveTextContent(
				'HTTP error: 404 Not Found'
			);
			expect(within(column('Doing')).queryByRole('alert')).not.toBeInTheDocument();
		});

		/* A list error without a listId is a failed create, so it belongs to the form. */
		it('keeps a failed create’s error out of the columns', () => {
			renderLists({ listMutationError: { listId: null, message: 'HTTP error: 400 Bad Request' } });

			expect(screen.queryByRole('alert')).not.toBeInTheDocument();
		});
	});

	describe('adding a list', () => {
		/** Open the add-list form and return its (auto-focused) name field. */
		async function openForm(user) {
			await user.click(screen.getByRole('button', { name: 'Add new list' }));
			return screen.getByRole('textbox', { name: 'List name' });
		}

		it('creates a trimmed list on Confirm, then closes the form', async () => {
			const { user, createNewList } = renderLists();

			const input = await openForm(user);
			expect(input).toHaveFocus();
			await user.type(input, '  Done  ');
			await user.click(screen.getByRole('button', { name: 'Confirm' }));

			expect(createNewList).toHaveBeenCalledExactlyOnceWith('Done');
			expect(screen.queryByRole('textbox', { name: 'List name' })).not.toBeInTheDocument();
			expect(screen.getByRole('button', { name: 'Add new list' })).toBeInTheDocument();
		});

		it('creates on Enter', async () => {
			const { user, createNewList } = renderLists();

			await user.type(await openForm(user), 'Done{Enter}');

			expect(createNewList).toHaveBeenCalledExactlyOnceWith('Done');
		});

		it('ignores a blank name', async () => {
			const { user, createNewList } = renderLists();

			await user.type(await openForm(user), '   {Enter}');

			expect(createNewList).not.toHaveBeenCalled();
			expect(screen.getByRole('textbox', { name: 'List name' })).toBeInTheDocument();
		});

		it('stays open with the typed name when the create fails, showing why', async () => {
			const { user, rerender, createNewList } = renderLists({
				createNewList: vi.fn().mockResolvedValue(false),
			});

			const input = await openForm(user);
			await user.type(input, 'Done{Enter}');
			expect(createNewList).toHaveBeenCalledOnce();

			/* useLists records the failure; the board passes it back down. */
			rerender(
				<DragDropProvider>
					<Lists
						lists={lists}
						createNewList={createNewList}
						listMutationError={{ listId: null, message: 'HTTP error: 400 Bad Request' }}
					/>
				</DragDropProvider>
			);

			expect(screen.getByRole('textbox', { name: 'List name' })).toHaveValue('Done');
			expect(screen.getByRole('alert')).toHaveTextContent('HTTP error: 400 Bad Request');
		});

		it('clears a leftover create error when the form is cancelled', async () => {
			const { user, onDismissListMutationError } = renderLists({
				listMutationError: { listId: null, message: 'HTTP error: 400 Bad Request' },
			});

			const input = await openForm(user);
			expect(screen.getByRole('alert')).toHaveTextContent('HTTP error: 400 Bad Request');
			await user.type(input, 'Done');
			await user.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(onDismissListMutationError).toHaveBeenCalledOnce();
			expect(screen.getByRole('button', { name: 'Add new list' })).toBeInTheDocument();
			expect(await openForm(user)).toHaveValue('');
		});

		/* A column's own error isn't the form's to clear. */
		it('leaves a column’s error alone when the form is cancelled', async () => {
			const { user, onDismissListMutationError } = renderLists({
				listMutationError: { listId: 3, message: 'HTTP error: 404 Not Found' },
			});

			await openForm(user);
			await user.click(screen.getByRole('button', { name: 'Cancel' }));

			expect(onDismissListMutationError).not.toHaveBeenCalled();
		});
	});
});
