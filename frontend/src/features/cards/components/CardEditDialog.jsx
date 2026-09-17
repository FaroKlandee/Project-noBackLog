/**
 * @file CardEditDialog.jsx
 * @description Modal dialog for editing a card's title, description, and priority.
 *
 * Opened from CardItem's context menu ("Edit") or a click on a card's body
 * (both wired in CardItem.jsx and threaded up through Cards.jsx and
 * ListColumn.jsx). The board-level owner, BoardDetailPage, holds the open/closed
 * state and derives the live `card` object every render, so a background drag
 * or another tab's edit is always reflected while the dialog is open — this
 * component only owns the in-progress draft.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ CardEditDialog  ← YOU ARE HERE
 */

/*
 * React
 * ───────────────────────────────────────────────────────────────────────────
 * useEffect — re-seeds the draft from `card` whenever a *different* card opens.
 * useState  — local draft state (title, description, priority, isSaving, error).
 */
import { useEffect, useState } from 'react';

/*
 * MUI components
 */
import {
	Alert,
	Button,
	Dialog,
	DialogActions,
	DialogContent,
	DialogTitle,
	FormControl,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
} from '@mui/material';

/*
 * Cards feature
 * ───────────────────────────────────────────────────────────────────────────
 * PRIORITIES — the three valid priority strings, for the Select's options.
 */
import { PRIORITIES } from '../constants';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;

/**
 * CardEditDialog component.
 *
 * A controlled modal form for editing an existing card. Validates locally
 * (non-empty, non-whitespace title within length; description within length),
 * and does nothing but close if the draft is unchanged from `card`. Save is
 * pessimistic: the dialog shows "Saving…", awaits `onSave`, and closes only on
 * success — a rejection is caught here and shown inline so the user's edits
 * survive a failed request.
 *
 * @component
 * @param {Object}        props
 * @param {boolean}        props.open    - Whether the dialog is visible.
 * @param {Object|null}    props.card    - The live card being edited, or null
 *   when no card is open. Shape: `{ id, title, description, priority, listId }`.
 * @param {Function}       props.onClose - Called to close the dialog without saving.
 * @param {Function}       props.onSave  - `async ({ title, description, priority }) => void`.
 *   Must throw on failure — the dialog stays open and shows the error inline.
 * @returns {JSX.Element} The rendered dialog.
 */
export default function CardEditDialog({ open, card, onClose, onSave }) {
	/*
	 * Draft State
	 * ─────────────────────────────────────────────────────────────────────
	 * Seeded from `card` below, then edited locally until Save/Cancel.
	 */
	const [title, setTitle] = useState('');
	const [description, setDescription] = useState('');
	const [priority, setPriority] = useState('Medium');
	const [isSaving, setIsSaving] = useState(false);
	const [error, setError] = useState(null);

	/*
	 * Re-seed the draft whenever a *different* card opens. Keyed on `card?.id`
	 * rather than the `card` object itself — the Dialog keeps its children
	 * mounted while closing (for its exit transition), and a board-level
	 * background merge (e.g. a drag moving this same card) would otherwise
	 * produce a new `card` object and stomp the user's in-progress edits.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on card?.id, not card, by design — see comment above.
	useEffect(() => {
		if (!open || !card) return;
		setTitle(card.title ?? '');
		setDescription(card.description ?? '');
		setPriority(card.priority ?? 'Medium');
		setError(null);
	}, [open, card?.id]);

	const trimmedTitle = title.trim();
	const isTitleValid = trimmedTitle !== '' && trimmedTitle.length <= TITLE_MAX_LENGTH;
	const isDescriptionValid = description.length <= DESCRIPTION_MAX_LENGTH;
	const isValid = isTitleValid && isDescriptionValid;

	/**
	 * Save the draft, or just close if nothing actually changed.
	 */
	async function handleSave() {
		if (!card) return;

		const unchanged =
			trimmedTitle === (card.title ?? '') &&
			description === (card.description ?? '') &&
			priority === (card.priority ?? 'Medium');

		if (unchanged) {
			onClose();
			return;
		}

		setIsSaving(true);
		setError(null);
		try {
			await onSave({ title: trimmedTitle, description, priority });
		} catch (err) {
			setError(err.message);
		} finally {
			setIsSaving(false);
		}
	}

	return (
		<Dialog
			open={open}
			onClose={isSaving ? undefined : onClose}
			fullWidth
			maxWidth="sm"
		>
			<DialogTitle>Edit card</DialogTitle>
			<DialogContent>
				<Stack spacing={2} sx={{ mt: 1 }}>
					{error && <Alert severity="error">{error}</Alert>}

					<TextField
						autoFocus
						label="Title"
						value={title}
						onChange={(e) => setTitle(e.target.value)}
						error={!isTitleValid}
						helperText={`${title.length}/${TITLE_MAX_LENGTH}`}
						fullWidth
						size="small"
						slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }}
					/>

					<TextField
						label="Description"
						value={description}
						onChange={(e) => setDescription(e.target.value)}
						error={!isDescriptionValid}
						helperText={`${description.length}/${DESCRIPTION_MAX_LENGTH}`}
						fullWidth
						multiline
						minRows={3}
						size="small"
						slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH } }}
					/>

					<FormControl size="small" fullWidth>
						<InputLabel id="card-edit-priority-label">Priority</InputLabel>
						<Select
							labelId="card-edit-priority-label"
							label="Priority"
							value={priority}
							onChange={(e) => setPriority(e.target.value)}
						>
							{PRIORITIES.map((p) => (
								<MenuItem key={p} value={p}>{p}</MenuItem>
							))}
						</Select>
					</FormControl>
				</Stack>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose} disabled={isSaving}>
					Cancel
				</Button>
				<Button onClick={handleSave} disabled={!isValid || isSaving} variant="contained">
					{isSaving ? 'Saving…' : 'Save'}
				</Button>
			</DialogActions>
		</Dialog>
	);
}
