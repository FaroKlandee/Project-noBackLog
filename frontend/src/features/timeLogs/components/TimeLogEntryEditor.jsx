/**
 * @file TimeLogEntryEditor.jsx
 * @description Inline editor for correcting one time entry's start and finish
 * times by hand, shown in place of the entry's row in TimeLogSection.
 *
 * A finished entry gets Start and Finish fields; a running entry only Start,
 * since its end is stamped by the Finish button. Only fields the user actually
 * changed are sent: the inputs work to the minute, so re-sending an untouched
 * time would silently drop its seconds and shift the entry's duration.
 *
 * Checked here before saving (and enforced again server-side): both times are
 * filled in, Finish is after Start, and neither is in the future. Enter saves,
 * Escape cancels without closing the surrounding dialog.
 *
 * Hierarchy:
 *   CardEditDialog (features/cards)
 *     └─ TimeLogSection
 *          └─ TimeLogEntryEditor  ← YOU ARE HERE
 */

import { useState } from 'react';

import { Alert, Box, Button, Stack, TextField } from '@mui/material';

import { fromDateTimeLocal, toDateTimeLocal } from '../utils/dateTimeLocal';

/*
 * Allowance for the browser's clock running ahead of the server's, matching
 * the server's own tolerance (TimeLogService.ClockSkewTolerance).
 */
const CLOCK_SKEW_MS = 60_000;

/**
 * Work out what to send for the current drafts, or why it can't be sent.
 *
 * @returns {{ changes: Object, error: string|null }} `changes` holds only the
 *   edited fields as ISO strings; `error` is a message for the user, or null.
 */
function validate(log, startDraft, endDraft) {
	const isRunning = log.endTime == null;
	const changes = {};

	if (startDraft !== toDateTimeLocal(log.startTime)) {
		const parsed = fromDateTimeLocal(startDraft);
		if (!parsed) return { changes, error: 'Enter a start time.' };
		changes.startTime = parsed;
	}
	if (!isRunning && endDraft !== toDateTimeLocal(log.endTime)) {
		const parsed = fromDateTimeLocal(endDraft);
		if (!parsed) return { changes, error: 'Enter a finish time.' };
		changes.endTime = parsed;
	}

	const start = new Date(changes.startTime ?? log.startTime).getTime();
	const end = isRunning ? null : new Date(changes.endTime ?? log.endTime).getTime();
	const latest = Date.now() + CLOCK_SKEW_MS;

	if (start > latest || (end != null && end > latest)) {
		return { changes, error: 'Times can’t be in the future.' };
	}
	if (end != null && end <= start) {
		return { changes, error: 'Finish must be after start.' };
	}
	return { changes, error: null };
}

/**
 * TimeLogEntryEditor component.
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.log      - The entry being edited: `{ id, startTime, endTime }`.
 * @param {Function} props.onSave   - `async (fields) => void` with the changed
 *   `{ startTime?, endTime? }`. Must throw on failure — the editor stays open
 *   and shows the error.
 * @param {Function} props.onCancel - Called to close the editor, after a
 *   successful save too.
 * @returns {JSX.Element} The rendered editor.
 */
export default function TimeLogEntryEditor({ log, onSave, onCancel }) {
	const isRunning = log.endTime == null;
	const [startDraft, setStartDraft] = useState(() => toDateTimeLocal(log.startTime));
	const [endDraft, setEndDraft] = useState(() => toDateTimeLocal(log.endTime));
	const [saving, setSaving] = useState(false);
	const [saveError, setSaveError] = useState(null);

	const { changes, error: validationError } = validate(log, startDraft, endDraft);
	/* Not `changes` itself: a cleared field is an edit, but has nothing to send. */
	const isDirty =
		startDraft !== toDateTimeLocal(log.startTime) ||
		(!isRunning && endDraft !== toDateTimeLocal(log.endTime));
	const canSave = isDirty && !validationError && !saving;

	async function handleSubmit(e) {
		e.preventDefault();
		if (!canSave) return;
		setSaving(true);
		setSaveError(null);
		try {
			await onSave(changes);
			onCancel();
		} catch (err) {
			setSaveError(err.message);
			setSaving(false);
		}
	}

	/*
	 * Stop Escape here, as CardEditDialog's title input does: the dialog's
	 * Modal listens for it on an ancestor and would otherwise close as well.
	 */
	function handleKeyDown(e) {
		if (e.key === 'Escape') {
			e.preventDefault();
			e.stopPropagation();
			onCancel();
		}
	}

	return (
		<Box
			component="form"
			aria-label="Edit time entry"
			onSubmit={handleSubmit}
			onKeyDown={handleKeyDown}
			sx={{ py: 0.5 }}
		>
			<Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ sm: 'center' }}>
				<TextField
					autoFocus
					type="datetime-local"
					label="Start"
					size="small"
					value={startDraft}
					onChange={(e) => setStartDraft(e.target.value)}
					disabled={saving}
					slotProps={{ inputLabel: { shrink: true } }}
				/>
				{!isRunning && (
					<TextField
						type="datetime-local"
						label="Finish"
						size="small"
						value={endDraft}
						onChange={(e) => setEndDraft(e.target.value)}
						disabled={saving}
						slotProps={{ inputLabel: { shrink: true } }}
					/>
				)}
				<Stack direction="row" spacing={1}>
					<Button type="submit" size="small" variant="contained" disabled={!canSave}>
						{saving ? 'Saving…' : 'Save'}
					</Button>
					<Button size="small" onClick={onCancel} disabled={saving}>
						Cancel
					</Button>
				</Stack>
			</Stack>
			{isDirty && validationError && (
				<Alert severity="warning" sx={{ mt: 1 }}>
					{validationError}
				</Alert>
			)}
			{saveError && (
				<Alert severity="error" sx={{ mt: 1 }} onClose={() => setSaveError(null)}>
					{saveError}
				</Alert>
			)}
		</Box>
	);
}
