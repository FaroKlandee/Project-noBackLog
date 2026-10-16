/**
 * @fileoverview Tests for `CardEditDialog`.
 *
 * `onSave` is a `vi.fn()` the parent would wire to `submitUpdateCard`; each
 * test resolves or rejects it to drive the success or failure path. A
 * `deferred()` promise holds a save open to observe the in-flight state.
 *
 * `TimeLogSection` is stubbed: the dialog's only contract with it is "render
 * it with the card's id", and the section has its own MSW-backed tests.
 *
 * The time-estimate and description fields have no accessible name (their
 * `FieldLabel` isn't a <label>), so they're found by placeholder — the next
 * best query after role/label. See the README's accessibility follow-up.
 */

import { screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderWithTheme } from '../../../test/render';
import CardEditDialog from './CardEditDialog';

vi.mock('../../timeLogs', () => ({
	TimeLogSection: ({ cardId }) => <p>Time tracking for card {cardId}</p>,
}));

const card = {
	id: 1,
	listId: 3,
	title: 'Fix login',
	description: 'Old notes',
	priority: 'High',
	timeEstimate: '2h',
};

/** A promise whose settlement the test controls, to hold a save in flight. */
function deferred() {
	let resolve;
	let reject;
	const promise = new Promise((res, rej) => {
		resolve = res;
		reject = rej;
	});
	return { promise, resolve, reject };
}

/** Render the dialog open on `card`; `onSave` resolves unless overridden. */
function renderDialog({ onSave = vi.fn().mockResolvedValue(undefined), cardProp = card } = {}) {
	const onClose = vi.fn();
	const view = renderWithTheme(
		<CardEditDialog open card={cardProp} onClose={onClose} onSave={onSave} />
	);
	return { ...view, onSave, onClose };
}

/** Click the title heading to enter edit mode and return the (auto-focused) input. */
async function startTitleEdit(user) {
	await user.click(screen.getByText('Fix login'));
	return screen.getByDisplayValue('Fix login');
}

describe('CardEditDialog', () => {
	describe('title', () => {
		it('commits a trimmed title on Enter and shows it as the heading', async () => {
			const { user, onSave } = renderDialog();
			const input = await startTitleEdit(user);

			await user.clear(input);
			await user.type(input, '  Fix login redirect  {Enter}');

			expect(onSave).toHaveBeenCalledExactlyOnceWith({ title: 'Fix login redirect' });
			expect(screen.getByText('Fix login redirect')).toBeInTheDocument();
			expect(screen.queryByDisplayValue('Fix login redirect')).not.toBeInTheDocument();
		});

		it('commits on blur', async () => {
			const { user, onSave } = renderDialog();
			const input = await startTitleEdit(user);

			await user.clear(input);
			await user.type(input, 'Fix login redirect');
			await user.tab();

			expect(onSave).toHaveBeenCalledExactlyOnceWith({ title: 'Fix login redirect' });
		});

		it.each([
			['blank', '   '],
			['unchanged', 'Fix login'],
		])('sends nothing for a %s title and keeps the original', async (_case, draft) => {
			const { user, onSave } = renderDialog();
			const input = await startTitleEdit(user);

			await user.clear(input);
			await user.type(input, `${draft}{Enter}`);

			expect(onSave).not.toHaveBeenCalled();
			expect(screen.getByText('Fix login')).toBeInTheDocument();
		});

		/*
		 * The title input lives inside a MUI Dialog, whose Modal closes on
		 * Escape. The handler stops propagation so Escape cancels only the edit.
		 */
		it('cancels the edit on Escape without saving or closing the dialog', async () => {
			const { user, onSave, onClose } = renderDialog();
			const input = await startTitleEdit(user);

			await user.clear(input);
			await user.type(input, 'Something else{Escape}');

			expect(onSave).not.toHaveBeenCalled();
			expect(onClose).not.toHaveBeenCalled();
			expect(screen.getByText('Fix login')).toBeInTheDocument();
			expect(screen.getByRole('dialog')).toBeInTheDocument();
		});

		it('shows the new title optimistically while saving, then reverts it with the error on failure', async () => {
			const save = deferred();
			const { user } = renderDialog({ onSave: vi.fn(() => save.promise) });
			const input = await startTitleEdit(user);

			await user.clear(input);
			await user.type(input, 'Fix login redirect{Enter}');

			expect(screen.getByText('Fix login redirect')).toBeInTheDocument();
			expect(screen.getByText('Saving…')).toBeInTheDocument();

			save.reject(new Error('HTTP error: 500 Internal Server Error'));

			expect(await screen.findByRole('alert')).toHaveTextContent(
				'HTTP error: 500 Internal Server Error'
			);
			expect(screen.getByText('Fix login')).toBeInTheDocument();
			expect(screen.queryByText('Fix login redirect')).not.toBeInTheDocument();
			expect(screen.queryByText('Saving…')).not.toBeInTheDocument();
		});
	});

	describe('priority', () => {
		/** Open the MUI Select (a combobox) and pick an option from its listbox. */
		async function choosePriority(user, option) {
			await user.click(screen.getByRole('combobox', { name: 'Priority' }));
			await user.click(screen.getByRole('option', { name: option }));
		}

		it('commits a new priority as soon as it is chosen', async () => {
			const { user, onSave } = renderDialog();

			await choosePriority(user, 'Low');

			expect(onSave).toHaveBeenCalledExactlyOnceWith({ priority: 'Low' });
			expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('Low');
		});

		it('reverts to the previous priority and shows the error when the save fails', async () => {
			const { user } = renderDialog({
				onSave: vi.fn().mockRejectedValue(new Error('HTTP error: 409 Conflict')),
			});

			await choosePriority(user, 'Low');

			expect(await screen.findByRole('alert')).toHaveTextContent('HTTP error: 409 Conflict');
			expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('High');
		});
	});

	/*
	 * Time estimate and description share the same draft → Save/Discard
	 * behaviour, so one parameterized suite covers both.
	 */
	describe.each([
		['time estimate', 'timeEstimate', 'e.g. 1 day, 4h', '2h', '2h, maybe 3h'],
		[
			'description',
			'description',
			'Add a detailed description, acceptance criteria, or notes…',
			'Old notes',
			'Old notes plus repro steps',
		],
	])('%s', (_name, field, placeholder, saved, edited) => {
		const getField = () => screen.getByPlaceholderText(placeholder);
		const saveButton = () => screen.queryByRole('button', { name: /^(Save|Saving…)$/ });

		it('shows Save/Discard only once the draft differs from the saved value', async () => {
			const { user } = renderDialog();
			expect(getField()).toHaveValue(saved);
			expect(saveButton()).not.toBeInTheDocument();

			await user.clear(getField());
			await user.type(getField(), edited);
			expect(saveButton()).toBeInTheDocument();

			/* Typing it back to the saved value hides them again. */
			await user.clear(getField());
			await user.type(getField(), saved);
			expect(saveButton()).not.toBeInTheDocument();
		});

		it('Discard restores the saved value', async () => {
			const { user } = renderDialog();

			await user.clear(getField());
			await user.type(getField(), edited);
			await user.click(screen.getByRole('button', { name: 'Discard' }));

			expect(getField()).toHaveValue(saved);
			expect(saveButton()).not.toBeInTheDocument();
		});

		it('saves only this field, disabling both buttons while the save is in flight', async () => {
			const save = deferred();
			const onSave = vi.fn(() => save.promise);
			const { user, rerender, onClose } = renderDialog({ onSave });

			await user.clear(getField());
			await user.type(getField(), edited);
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(onSave).toHaveBeenCalledExactlyOnceWith({ [field]: edited });
			expect(screen.getByRole('button', { name: 'Saving…' })).toBeDisabled();
			expect(screen.getByRole('button', { name: 'Discard' })).toBeDisabled();

			/* The parent merges the saved card back in, so the draft is no longer dirty. */
			save.resolve();
			rerender(
				<CardEditDialog
					open
					card={{ ...card, [field]: edited }}
					onClose={onClose}
					onSave={onSave}
				/>
			);

			await waitFor(() => expect(saveButton()).not.toBeInTheDocument());
			expect(getField()).toHaveValue(edited);
		});

		it('keeps the draft and shows the error when the save fails', async () => {
			const { user } = renderDialog({
				onSave: vi.fn().mockRejectedValue(new Error('HTTP error: 500 Internal Server Error')),
			});

			await user.clear(getField());
			await user.type(getField(), edited);
			await user.click(screen.getByRole('button', { name: 'Save' }));

			expect(await screen.findByRole('alert')).toHaveTextContent(
				'HTTP error: 500 Internal Server Error'
			);
			expect(getField()).toHaveValue(edited);
			expect(screen.getByRole('button', { name: 'Save' })).toBeEnabled();
		});
	});

	describe('switching cards', () => {
		const descriptionField = () =>
			screen.getByPlaceholderText('Add a detailed description, acceptance criteria, or notes…');

		/*
		 * The parent re-derives `card` every render (e.g. after a drag), so a
		 * new object for the *same* card must not wipe an edit in progress.
		 */
		it('keeps an in-progress draft when the same card re-renders', async () => {
			const { user, rerender, onClose, onSave } = renderDialog();
			await user.clear(descriptionField());
			await user.type(descriptionField(), 'Half-typed');

			rerender(
				<CardEditDialog open card={{ ...card, listId: 4 }} onClose={onClose} onSave={onSave} />
			);

			expect(descriptionField()).toHaveValue('Half-typed');
		});

		it('re-seeds every field when a different card opens', async () => {
			const { user, rerender, onClose, onSave } = renderDialog();
			await user.clear(descriptionField());
			await user.type(descriptionField(), 'Half-typed');

			const other = {
				id: 2,
				listId: 3,
				title: 'Write docs',
				description: '',
				priority: 'Low',
				timeEstimate: '',
			};
			rerender(<CardEditDialog open card={other} onClose={onClose} onSave={onSave} />);

			expect(screen.getByText('Write docs')).toBeInTheDocument();
			expect(descriptionField()).toHaveValue('');
			expect(screen.getByRole('combobox', { name: 'Priority' })).toHaveTextContent('Low');
			expect(screen.getByText('Time tracking for card 2')).toBeInTheDocument();
		});
	});

	describe('closing', () => {
		it('closes from the close button', async () => {
			const { user, onClose } = renderDialog();

			await user.click(screen.getByRole('button', { name: 'Close' }));

			expect(onClose).toHaveBeenCalledOnce();
		});

		/* Contrast with the title test: outside the title input, Escape does close. */
		it('closes on Escape when no title edit is in progress', async () => {
			const { user, onClose } = renderDialog();

			await user.keyboard('{Escape}');

			expect(onClose).toHaveBeenCalledOnce();
		});

		it('renders time tracking for the open card', () => {
			renderDialog();

			expect(screen.getByText('Time tracking for card 1')).toBeInTheDocument();
		});
	});
});
