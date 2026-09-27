/**
 * @file CardEditDialog.jsx
 * @description Modal dialog for editing a card's title, description, priority,
 * and time estimate, and for tracking time against it.
 *
 * Opened from CardItem's context menu ("Edit") or a click on a card's body
 * (both wired in CardItem.jsx and threaded up through Cards.jsx and
 * ListColumn.jsx). The board-level owner, BoardDetailPage, holds the open/closed
 * state and derives the live `card` object every render, so a background drag
 * or another tab's edit is always reflected while the dialog is open — this
 * component only owns the in-progress drafts.
 *
 * Unlike a typical form dialog, there is no single Save/Cancel footer — each
 * field commits independently, Trello-style:
 *   - Title    — click-to-edit heading; Enter/blur commits, Escape discards.
 *   - Priority — commits immediately on selection.
 *   - Description / Time Estimate — free-text fields where a Save button
 *     reveals itself once the draft differs from the saved value, so a
 *     stray blur mid-thought can't silently commit a half-typed edit.
 *   - Time tracking — delegated to TimeLogSection (features/timeLogs), which
 *     owns its own Start/Finish/Delete requests against /api/timelogs.
 * The dialog only closes via the header's close button.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ CardEditDialog  ← YOU ARE HERE
 *          └─ TimeLogSection (features/timeLogs)
 */

import { useEffect, useState } from 'react';

import {
	Alert,
	Box,
	Button,
	Dialog,
	FormControl,
	IconButton,
	InputLabel,
	MenuItem,
	Select,
	Stack,
	TextField,
	Typography,
} from '@mui/material';

import AccessTimeIcon from '@mui/icons-material/AccessTime';
import CloseIcon from '@mui/icons-material/Close';
import SubjectIcon from '@mui/icons-material/Subject';

import FieldLabel from '../../../shared/components/FieldLabel';
import { TimeLogSection } from '../../timeLogs';
import { PRIORITIES } from '../constants';

const TITLE_MAX_LENGTH = 100;
const DESCRIPTION_MAX_LENGTH = 2000;
const TIME_ESTIMATE_MAX_LENGTH = 50;

/*
 * Shared dark-surface styling for the free-text inputs (description, time
 * estimate) so they read as inset panels rather than standard outlined
 * MUI fields — no floating label chrome, just a bordered surface under an
 * overline label rendered separately above each field.
 */
const surfaceFieldSx = (theme) => ({
	bgcolor: theme.palette.background.surface,
	borderRadius: '8px',
	'& .MuiOutlinedInput-root': {
		bgcolor: theme.palette.background.surface,
		borderRadius: '8px',
		color: theme.palette.text.primary,
		'& fieldset': { borderColor: theme.palette.divider },
		'&:hover fieldset': { borderColor: theme.palette.border.hover },
		'&.Mui-focused fieldset': { borderColor: theme.palette.border.active },
	},
});

/**
 * CardEditDialog component.
 *
 * @component
 * @param {Object}        props
 * @param {boolean}        props.open    - Whether the dialog is visible.
 * @param {Object|null}    props.card    - The live card being edited, or null
 *   when no card is open. Shape: `{ id, title, description, priority, timeEstimate, listId }`.
 * @param {Function}       props.onClose - Called to close the dialog.
 * @param {Function}       props.onSave  - `async (partialFields) => void`, called
 *   with only the field(s) that changed, e.g. `{ title }` or `{ description }`.
 *   Must throw on failure — the dialog stays open and shows the error inline,
 *   next to the field that failed to save.
 * @returns {JSX.Element} The rendered dialog.
 */
export default function CardEditDialog({ open, card, onClose, onSave }) {
	/*
	 * Title
	 * ─────────────────────────────────────────────────────────────────────
	 * title          — the saved value, shown as a heading; updated optimistically
	 *                  on commit (reverted if the save fails).
	 * isEditingTitle — toggles the heading between static text and an input.
	 * titleDraft     — controlled value for the input while editing.
	 */
	const [title, setTitle] = useState('');
	const [isEditingTitle, setIsEditingTitle] = useState(false);
	const [titleDraft, setTitleDraft] = useState('');
	const [titleSaving, setTitleSaving] = useState(false);
	const [titleError, setTitleError] = useState(null);

	/*
	 * Priority — commits immediately on change; reverted on failure.
	 */
	const [priority, setPriority] = useState('Medium');
	const [priorityError, setPriorityError] = useState(null);

	/*
	 * Description / Time Estimate — free-text drafts. Each shows an inline
	 * Save/Discard pair once its draft differs from `card`'s saved value.
	 */
	const [description, setDescription] = useState('');
	const [descriptionSaving, setDescriptionSaving] = useState(false);
	const [descriptionError, setDescriptionError] = useState(null);

	const [timeEstimate, setTimeEstimate] = useState('');
	const [timeEstimateSaving, setTimeEstimateSaving] = useState(false);
	const [timeEstimateError, setTimeEstimateError] = useState(null);

	/*
	 * Re-seed every draft whenever a *different* card opens. Keyed on
	 * `card?.id` rather than the `card` object itself — see the file header.
	 */
	// biome-ignore lint/correctness/useExhaustiveDependencies: keyed on card?.id, not card, by design — see file header.
	useEffect(() => {
		if (!open || !card) return;
		setTitle(card.title ?? '');
		setIsEditingTitle(false);
		setTitleError(null);
		setPriority(card.priority ?? 'Medium');
		setPriorityError(null);
		setDescription(card.description ?? '');
		setDescriptionError(null);
		setTimeEstimate(card.timeEstimate ?? '');
		setTimeEstimateError(null);
	}, [open, card?.id]);

	const isDescriptionDirty = description !== (card?.description ?? '');
	const isTimeEstimateDirty = timeEstimate !== (card?.timeEstimate ?? '');

	/**
	 * Enter title edit mode, seeding the draft from the current title.
	 */
	function handleTitleClick() {
		setTitleDraft(title);
		setTitleError(null);
		setIsEditingTitle(true);
	}

	/**
	 * Commit the title edit. A blank or unchanged draft is silently discarded
	 * rather than sent to the server (mirrors ListColumn's title rename).
	 */
	async function commitTitle() {
		const trimmed = titleDraft.trim();
		setIsEditingTitle(false);
		if (trimmed === '' || trimmed === title) return;

		const previous = title;
		setTitle(trimmed);
		setTitleSaving(true);
		setTitleError(null);
		try {
			await onSave({ title: trimmed });
		} catch (err) {
			setTitle(previous);
			setTitleError(err.message);
		} finally {
			setTitleSaving(false);
		}
	}

	/*
	 * Both branches stop propagation, not just preventDefault: this input sits
	 * inside a MUI Dialog, and Dialog's own Modal listens for Escape on an
	 * ancestor to close itself. preventDefault alone doesn't stop the bubble,
	 * so an unguarded Escape here would cancel the title edit AND close the
	 * whole dialog in the same keystroke.
	 */
	function handleTitleKeyDown(e) {
		if (e.key === 'Enter') {
			e.preventDefault();
			e.stopPropagation();
			commitTitle();
		}
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			setIsEditingTitle(false);
		}
	}

	/**
	 * Commit a priority change immediately, reverting on failure.
	 */
	async function handlePriorityChange(e) {
		const value = e.target.value;
		const previous = priority;
		setPriority(value);
		setPriorityError(null);
		try {
			await onSave({ priority: value });
		} catch (err) {
			setPriority(previous);
			setPriorityError(err.message);
		}
	}

	async function handleSaveDescription() {
		setDescriptionSaving(true);
		setDescriptionError(null);
		try {
			await onSave({ description });
		} catch (err) {
			setDescriptionError(err.message);
		} finally {
			setDescriptionSaving(false);
		}
	}

	function handleDiscardDescription() {
		setDescription(card?.description ?? '');
		setDescriptionError(null);
	}

	async function handleSaveTimeEstimate() {
		setTimeEstimateSaving(true);
		setTimeEstimateError(null);
		try {
			await onSave({ timeEstimate });
		} catch (err) {
			setTimeEstimateError(err.message);
		} finally {
			setTimeEstimateSaving(false);
		}
	}

	function handleDiscardTimeEstimate() {
		setTimeEstimate(card?.timeEstimate ?? '');
		setTimeEstimateError(null);
	}

	return (
		<Dialog
			open={open}
			onClose={onClose}
			maxWidth={false}
			slotProps={{
				paper: {
					sx: {
						width: 1080,
						maxWidth: '92vw',
						background: 'linear-gradient(to bottom right, #1e293b, #0f172a)',
						border: '1px solid rgba(168, 85, 247, 0.25)',
						borderRadius: '16px',
						boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.6)',
						overflow: 'hidden',
					},
				},
			}}
		>
			{/* Header — click-to-edit title + close button. */}
			<Box sx={{ px: 4, pt: 3.5, pb: 2.5 }}>
				<Stack direction="row" alignItems="flex-start" spacing={2}>
					<Box sx={{ flexGrow: 1, minWidth: 0 }}>
						{isEditingTitle ? (
							<TextField
								autoFocus
								fullWidth
								value={titleDraft}
								onChange={(e) => setTitleDraft(e.target.value)}
								onKeyDown={handleTitleKeyDown}
								onBlur={commitTitle}
								onFocus={(e) => e.currentTarget.select()}
								size="small"
								slotProps={{ htmlInput: { maxLength: TITLE_MAX_LENGTH } }}
								sx={(theme) => ({
									'& .MuiOutlinedInput-root': {
										bgcolor: theme.palette.background.surface,
										fontSize: '1.75rem',
										fontWeight: 700,
									},
								})}
							/>
						) : (
							<Typography
								onClick={handleTitleClick}
								sx={{
									fontSize: '1.75rem',
									fontWeight: 700,
									color: 'text.primary',
									cursor: 'pointer',
									borderRadius: 1,
									px: 0.5,
									mx: -0.5,
									'&:hover': { bgcolor: 'action.hover' },
								}}
							>
								{title}
							</Typography>
						)}
						{(titleSaving || isEditingTitle) && (
							<Typography variant="caption" sx={{ color: 'text.secondary', pl: 0.5 }}>
								{titleSaving ? 'Saving…' : 'Enter to save, Esc to cancel'}
							</Typography>
						)}
						{titleError && (
							<Alert severity="error" sx={{ mt: 1 }} onClose={() => setTitleError(null)}>
								{titleError}
							</Alert>
						)}
					</Box>
					<IconButton onClick={onClose} size="small" sx={{ color: 'secondary.main', mt: -0.5 }}>
						<CloseIcon />
					</IconButton>
				</Stack>
			</Box>

			<Box sx={{ px: 4, pb: 4 }}>
				<Stack spacing={3}>
					{/* Priority — left as the existing dropdown control (unchanged). */}
					<FormControl size="small" fullWidth>
						<InputLabel id="card-edit-priority-label">Priority</InputLabel>
						<Select
							labelId="card-edit-priority-label"
							label="Priority"
							value={priority}
							onChange={handlePriorityChange}
						>
							{PRIORITIES.map((p) => (
								<MenuItem key={p} value={p}>{p}</MenuItem>
							))}
						</Select>
						{priorityError && (
							<Alert severity="error" sx={{ mt: 1 }} onClose={() => setPriorityError(null)}>
								{priorityError}
							</Alert>
						)}
					</FormControl>

					{/* Time estimate — free text (e.g. "1 day", "4h"); saves independently. */}
					<Box>
						<FieldLabel icon={<AccessTimeIcon sx={{ fontSize: '1rem' }} />}>
							Time estimate
						</FieldLabel>
						<TextField
							fullWidth
							size="small"
							placeholder="e.g. 1 day, 4h"
							value={timeEstimate}
							onChange={(e) => setTimeEstimate(e.target.value)}
							error={!!timeEstimateError}
							sx={surfaceFieldSx}
							slotProps={{ htmlInput: { maxLength: TIME_ESTIMATE_MAX_LENGTH } }}
						/>
						{isTimeEstimateDirty && (
							<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
								<Button
									size="small"
									variant="contained"
									onClick={handleSaveTimeEstimate}
									disabled={timeEstimateSaving}
								>
									{timeEstimateSaving ? 'Saving…' : 'Save'}
								</Button>
								<Button size="small" onClick={handleDiscardTimeEstimate} disabled={timeEstimateSaving}>
									Discard
								</Button>
							</Stack>
						)}
						{timeEstimateError && (
							<Alert severity="error" sx={{ mt: 1 }} onClose={() => setTimeEstimateError(null)}>
								{timeEstimateError}
							</Alert>
						)}
					</Box>

					{/* Time tracking — Start/Finish timers; entries capped server-side. */}
					{card && <TimeLogSection cardId={card.id} />}

					{/* Description — free text; saves independently. */}
					<Box>
						<FieldLabel icon={<SubjectIcon sx={{ fontSize: '1rem' }} />}>
							Description
						</FieldLabel>
						<TextField
							fullWidth
							multiline
							minRows={6}
							placeholder="Add a detailed description, acceptance criteria, or notes…"
							value={description}
							onChange={(e) => setDescription(e.target.value)}
							error={!!descriptionError}
							helperText={`${description.length}/${DESCRIPTION_MAX_LENGTH}`}
							sx={surfaceFieldSx}
							slotProps={{ htmlInput: { maxLength: DESCRIPTION_MAX_LENGTH } }}
						/>
						{isDescriptionDirty && (
							<Stack direction="row" spacing={1} sx={{ mt: 1 }}>
								<Button
									size="small"
									variant="contained"
									onClick={handleSaveDescription}
									disabled={descriptionSaving}
								>
									{descriptionSaving ? 'Saving…' : 'Save'}
								</Button>
								<Button size="small" onClick={handleDiscardDescription} disabled={descriptionSaving}>
									Discard
								</Button>
							</Stack>
						)}
						{descriptionError && (
							<Alert severity="error" sx={{ mt: 1 }} onClose={() => setDescriptionError(null)}>
								{descriptionError}
							</Alert>
						)}
					</Box>
				</Stack>
			</Box>
		</Dialog>
	);
}
