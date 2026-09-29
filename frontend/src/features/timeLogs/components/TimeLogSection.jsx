/**
 * @file TimeLogSection.jsx
 * @description The "Time tracking" section of the card detail dialog.
 *
 * Start stamps a start time on the server; Finish stamps the end time, and the
 * server-computed duration is shown as soon as the request resolves. While a
 * timer runs, a live elapsed counter ticks locally from the server's start
 * time — the dialog can be closed and reopened without affecting it, since the
 * timer lives on the server.
 *
 * Rules (enforced server-side, mirrored here for the UI):
 *   - At most one running timer per card.
 *   - At most `maxEntries` entries per card (running included; default 5).
 *     At the limit, Start is disabled until an entry is deleted.
 *   - At most `maxRunning` timers running at once across ALL cards (default 2).
 *     At the limit, Start is disabled and the caption names the cards whose
 *     timers are running.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ CardEditDialog (features/cards)
 *          └─ TimeLogSection  ← YOU ARE HERE
 */

import { useEffect, useState } from 'react';

import { Alert, Box, Button, IconButton, Stack, Tooltip, Typography } from '@mui/material';

import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import StopIcon from '@mui/icons-material/Stop';
import TimerOutlinedIcon from '@mui/icons-material/TimerOutlined';

import FieldLabel from '../../../shared/components/FieldLabel';
import { useCardTimeLogs } from '../hooks/useCardTimeLogs';
import { formatClock, formatDuration, formatTime } from '../utils/formatDuration';

/**
 * Live elapsed time since `startTime`, re-rendering once a second.
 */
function ElapsedCounter({ startTime }) {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		const id = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(id);
	}, []);

	return formatDuration(now - new Date(startTime).getTime());
}

/**
 * @component
 * @param {Object} props
 * @param {number} props.cardId - The card whose time is being tracked.
 * @returns {JSX.Element} The rendered section.
 */
export default function TimeLogSection({ cardId }) {
	const {
		logs,
		maxEntries,
		maxRunning,
		runningElsewhere,
		isLoading,
		error,
		running,
		atLimit,
		globalAtLimit,
		totalMs,
		start,
		finish,
		remove,
	} = useCardTimeLogs(cardId);

	/* busyId — 'start' or the id of the entry with a request in flight. */
	const [busyId, setBusyId] = useState(null);
	const [actionError, setActionError] = useState(null);

	/* Clear a stale action error when a different card opens. */
	// biome-ignore lint/correctness/useExhaustiveDependencies: reset keyed on cardId by design.
	useEffect(() => {
		setActionError(null);
		setBusyId(null);
	}, [cardId]);

	async function run(key, action) {
		setBusyId(key);
		setActionError(null);
		try {
			await action();
		} catch (err) {
			setActionError(err.message);
		} finally {
			setBusyId(null);
		}
	}

	const isBusy = busyId != null;

	return (
		<Box>
			<Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
				<FieldLabel icon={<TimerOutlinedIcon sx={{ fontSize: '1rem' }} />}>
					Time tracking
				</FieldLabel>
				{maxEntries != null && (
					<Typography variant="caption" sx={{ color: 'text.secondary' }}>
						{logs.length}/{maxEntries} entries · Total{' '}
						<Box component="span" sx={{ color: 'text.primary', fontWeight: 700 }}>
							{formatDuration(totalMs)}
						</Box>
					</Typography>
				)}
			</Stack>

			<Box
				sx={(theme) => ({
					mt: 0.5,
					p: 1.5,
					bgcolor: theme.palette.background.surface,
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: '8px',
				})}
			>
				{isLoading ? (
					<Typography variant="body2" sx={{ color: 'text.secondary' }}>
						Loading time logs…
					</Typography>
				) : error ? (
					<Alert severity="error">{error}</Alert>
				) : (
					<Stack spacing={1}>
						{logs.length === 0 && (
							<Typography variant="body2" sx={{ color: 'text.secondary' }}>
								No time logged yet.
							</Typography>
						)}

						{logs.map((log) => {
							const isRunning = log.endTime == null;
							return (
								<Stack
									key={log.id}
									direction="row"
									alignItems="center"
									spacing={1.5}
									sx={{ minHeight: 36 }}
								>
									<Typography variant="body2" sx={{ color: 'text.secondary', flexGrow: 1 }}>
										{formatClock(log.startTime)}
										{isRunning ? ' – running' : ` – ${formatTime(log.endTime)}`}
									</Typography>
									<Typography
										variant="body2"
										sx={{
											fontWeight: 700,
											fontVariantNumeric: 'tabular-nums',
											color: isRunning ? 'secondary.main' : 'text.primary',
										}}
									>
										{isRunning ? (
											<ElapsedCounter startTime={log.startTime} />
										) : (
											formatDuration(log.duration)
										)}
									</Typography>
									{isRunning && (
										<Button
											size="small"
											variant="contained"
											color="error"
											startIcon={<StopIcon />}
											disabled={isBusy}
											onClick={() => run(log.id, () => finish(log.id))}
										>
											{busyId === log.id ? 'Finishing…' : 'Finish'}
										</Button>
									)}
									<Tooltip title="Delete entry">
										<span>
											<IconButton
												size="small"
												aria-label="Delete time entry"
												disabled={isBusy}
												onClick={() => run(log.id, () => remove(log.id))}
												sx={{ color: 'text.secondary' }}
											>
												<DeleteOutlineIcon fontSize="small" />
											</IconButton>
										</span>
									</Tooltip>
								</Stack>
							);
						})}

						{!running && (
							<Stack direction="row" alignItems="center" spacing={1.5} sx={{ pt: 0.5 }}>
								<Button
									size="small"
									variant="contained"
									startIcon={<PlayArrowIcon />}
									disabled={isBusy || atLimit || globalAtLimit}
									onClick={() => run('start', start)}
								>
									{busyId === 'start' ? 'Starting…' : 'Start'}
								</Button>
								{atLimit ? (
									<Typography variant="caption" sx={{ color: 'text.secondary' }}>
										Entry limit reached ({logs.length}/{maxEntries}). Delete an entry to log again.
									</Typography>
								) : (
									globalAtLimit && (
										<Typography variant="caption" sx={{ color: 'text.secondary' }}>
											{maxRunning}/{maxRunning} timers already running (
											{runningElsewhere.map((timer) => timer.cardTitle).join(', ')}). Finish one to
											start another.
										</Typography>
									)
								)}
							</Stack>
						)}
					</Stack>
				)}

				{actionError && (
					<Alert severity="error" sx={{ mt: 1 }} onClose={() => setActionError(null)}>
						{actionError}
					</Alert>
				)}
			</Box>
		</Box>
	);
}
