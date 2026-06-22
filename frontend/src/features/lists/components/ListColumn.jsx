/**
 * @file ListColumn.jsx
 * @description Container component for a single Kanban-style list column.
 *
 * Sits between Lists.jsx (row presenter) and Cards.jsx (card list presenter)
 * in the component hierarchy. Owns:
 *   - The useCards data-fetching lifecycle for this column's cards.
 *   - The useSortable drag-and-drop registration for column reordering.
 *   - The MoreVert options menu (currently: Delete list).
 *   - The inline add-card form with title input, priority selector, and
 *     keyboard shortcuts (Shift+Enter to submit; L/M/H to set priority).
 *
 * Renders one of three states:
 *   1. Loading — a CircularProgress spinner while cards are being fetched.
 *   2. Error   — an Alert banner if the card fetch fails.
 *   3. Happy path — the column header, card list, and optional add-card form.
 *
 * Hierarchy:
 *   Lists           (src/features/lists/components/Lists.jsx)
 *     └─ ListColumn              ← YOU ARE HERE
 *          └─ Cards  (src/features/cards/components/Cards.jsx)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * Cards, useCards — card presenter component and its data hook, imported from
 *                   the cards feature barrel so this file never reaches into
 *                   the cards feature's internal folder structure directly.
 */
import { Cards, useCards } from "../../cards";

/*
 * Icons
 */
import MoreVertIcon from "@mui/icons-material/MoreVert";
import DeleteIcon from "@mui/icons-material/Delete"
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

/*
 * React
 */
import { useState, useRef } from "react";

/*
 * @dnd-kit/react/sortable
 * ───────────────────────────────────────────────────────────────────────────
 * useSortable — makes this column both draggable and a drop target.
 *               Requires the item's unique `id` and its current `index` in
 *               the lists array. Returns a `ref` that must be attached to
 *               the column's root DOM element.
 */
import { useSortable } from "@dnd-kit/react/sortable";

/*
 * MUI components
 * ───────────────────────────────────────────────────────────────────────────
 * CircularProgress — spinner shown while cards are loading.
 * Alert            — error banner shown when the useCards fetch fails.
 * Typography       — column header text.
 * Box              — generic layout wrapper for the column surface.
 * IconButton       — trigger buttons for add-card and the options menu.
 * Menu, MenuItem   — floating options menu (Delete list).
 * Stack            — horizontal row layout for the column header.
 * TextField        — card title input inside the add-card form.
 * Select, FormControl — priority dropdown inside the add-card form.
 */
import { CircularProgress, Alert, Typography, Box, IconButton, Menu, MenuItem, Stack, TextField, Select, FormControl } from '@mui/material';

/**
 * ListColumn component.
 *
 * Container for a single Kanban list column. Fetches its own cards via
 * useCards, registers itself as a sortable drag-and-drop item, and renders
 * the column header, card list, and inline add-card form.
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.list                  - The list object for this column.
 * @param {number}   props.list.id               - Unique identifier; used as the
 *                                                 sortable key and for fetching cards.
 * @param {string}   props.list.name             - Display name in the column header.
 * @param {number}   props.index                 - Zero-based position in the lists array;
 *                                                 required by useSortable to compute
 *                                                 the correct drop target.
 * @param {Function} props.deleteExistingList    - Async callback invoked with this
 *                                                 list's ID when the user confirms deletion.
 * @returns {JSX.Element} A spinner, an error banner, or the rendered column.
 */
export default function ListColumn({ list, index, deleteExistingList }) {

	/*
	 * Options Menu State
	 * ─────────────────────────────────────────────────────────────────────
	 * anchorEl — the DOM element the MUI Menu anchors to (the MoreVert button).
	 *            null means the menu is closed; a DOM node means it is open.
	 * open     — derived boolean for the Menu's `open` prop.
	 */
	const [anchorEl, setAnchorEl] = useState(null);
	const open = anchorEl !== null;

	const handleClick = (event) => setAnchorEl(event.currentTarget); // open the menu
	const handleClose = () => setAnchorEl(null);                      // close the menu

	/*
	 * Drag-and-Drop Registration
	 * ─────────────────────────────────────────────────────────────────────
	 * useSortable registers this column as a sortable item. The returned `ref`
	 * must be attached to the column's root DOM element so dnd-kit can track
	 * its position and compute drop targets.
	 */
	const { ref } = useSortable({ id: list.id, index });

	/*
	 * Card Data
	 * ─────────────────────────────────────────────────────────────────────
	 * useCards fetches all cards for this list and exposes mutation helpers.
	 * Re-triggered automatically if list.id ever changes.
	 *   cards          — the fetched cards array.
	 *   loading        — true while the fetch is in-flight.
	 *   fetchError     — set if the GET /api/cards request fails.
	 *   mutationError  — set if a create/delete card mutation fails.
	 *   setMutationError — lets this component dismiss the mutation error banner.
	 *   submitCreateCard — async function to create a card via the API.
	 *   submitDeleteCard — async function to delete a card via the API.
	 */
	const { cards, loading, fetchError, mutationError, setMutationError, submitCreateCard, submitDeleteCard } = useCards(list.id);

	/*
	 * Add-Card Form State
	 * ─────────────────────────────────────────────────────────────────────
	 * isAddingCard   — toggles the inline add-card form visibility.
	 * newCardTitle   — controlled value for the card title text field.
	 * newCardPriority — controlled value for the priority dropdown.
	 * isSubmitting   — true while the createCard API call is in-flight;
	 *                  disables the submit button to prevent double-submission.
	 * titleRef       — ref to the title TextField so focus can be restored
	 *                  after a successful card creation.
	 */
	const [isAddingCard, setIsAddingCard] = useState(false);
	const [newCardTitle, setNewCardTitle] = useState('');
	const [newCardPriority, setNewCardPriority] = useState('Medium');
	const [isSubmitting, setIsSubmitting] = useState(false);
	const titleRef = useRef(null);

	/*
	 * Add-Card Form Handlers
	 * ─────────────────────────────────────────────────────────────────────
	 */

	/**
	 * Submit the new card to the API, reset the title field, and restore
	 * focus to the title input so the user can immediately add another card.
	 * Guards against empty titles. Sets isSubmitting to disable the button
	 * during the in-flight request.
	 *
	 * @async
	 */
	async function handleCreateCard() {
		if (newCardTitle.trim() === '') return;
		setIsSubmitting(true);
		try {
			await submitCreateCard({ title: newCardTitle, priority: newCardPriority });
			setNewCardTitle('');
			setNewCardPriority('Medium');
			titleRef.current?.focus();
		} finally {
			setIsSubmitting(false);
		}
	}

	/**
	 * Cancel the add-card form and reset all form state.
	 */
	function handleCancelCard() {
		setNewCardTitle('');
		setNewCardPriority('Medium');
		setIsAddingCard(false);
	}

	/**
	 * Handle keyboard shortcuts within the add-card form container.
	 *
	 * - Shift+Enter  — submit the form (works from anywhere in the form).
	 * - L / M / H    — set priority to Low / Medium / High when the title
	 *                  field is NOT focused (prevents interfering with typing).
	 *
	 * @param {React.KeyboardEvent} e - The keydown event bubbled from the form.
	 */
	function handleFormKeyDown(e) {
		if (e.key === 'Enter' && e.shiftKey) {
			e.preventDefault();
			handleCreateCard();
			return;
		}
		if (e.target === titleRef.current) return;
		if (e.key === 'l' || e.key === 'L') { e.preventDefault(); setNewCardPriority('Low'); }
		if (e.key === 'm' || e.key === 'M') { e.preventDefault(); setNewCardPriority('Medium'); }
		if (e.key === 'h' || e.key === 'H') { e.preventDefault(); setNewCardPriority('High'); }
	}

	/**
	 * Delegate card deletion to the useCards hook's submitDeleteCard function.
	 *
	 * @async
	 * @param {number} cardId - ID of the card to delete.
	 */
	async function handleDeleteCard(cardId) {
		await submitDeleteCard(cardId);
	}

	/**
	 * Delegate list deletion to the parent-supplied deleteExistingList callback.
	 *
	 * @async
	 * @param {number} listId - ID of the list to delete.
	 */
	async function handleDeleteList(listId) {
		await deleteExistingList(listId);
	}

	/*
	 * Traffic Light — Loading
	 * ─────────────────────────────────────────────────────────────────────
	 * Show a spinner while the card fetch is in-flight.
	 */
	if (loading) {
		return <CircularProgress aria-label={`Loading cards for ${list.name}…`} />;
	}

	/*
	 * Traffic Light — Error
	 * ─────────────────────────────────────────────────────────────────────
	 * Surface an error banner if the card fetch failed.
	 */
	if (fetchError) {
		return (
			<Alert variant="filled" severity="error">
				Failed to load cards for "{list.name}".
			</Alert>
		);
	}

	/*
	 * Render — Happy Path
	 * ─────────────────────────────────────────────────────────────────────
	 * Column structure:
	 *   Box (column surface, ref for dnd-kit)
	 *     ├─ Stack (column header row)
	 *     │    ├─ Typography (list name)
	 *     │    ├─ Badge span (card count)
	 *     │    ├─ IconButton (add card)
	 *     │    ├─ IconButton (options menu trigger)
	 *     │    └─ Menu > MenuItem (Delete list)
	 *     ├─ Alert (mutation error banner, shown conditionally)
	 *     ├─ Cards (card list presenter)
	 *     └─ Box (add-card form, shown conditionally when isAddingCard is true)
	 */
	return (
		<Box
			ref={ref}
			component="section"
			sx={theme => ({
				flexGrow: 0,
				flexShrink: 0,
				width: 280,
				bgcolor: theme.palette.background.surface,
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: '12px',
				p: 1.5,
				height: '100%',
				overflowY: 'auto',
				overflowX: 'hidden',
			})}
		>
			{/* Column header row — list name, card count badge, add and options buttons. */}
			<Stack direction="row" alignItems="center" sx={{ mb: 1, gap: 0.5 }}>
				<Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem', flexGrow: 1 }}>
					{list.name}
				</Typography>

				{/* Card count badge — pill showing total cards in this column. */}
				<Box
					component="span"
					sx={theme => ({
						ml: 1,
						px: 1,
						py: 0.25,
						bgcolor: theme.palette.badge.bg,
						borderRadius: '999px',
						fontSize: '0.75rem',
						color: theme.palette.badge.text,
					})}
				>
					{cards.length}
				</Box>

				{/* Add card button — opens the inline add-card form. */}
				<IconButton size="small" onClick={() => setIsAddingCard(true)} sx={{ color: 'secondary.main', p: 0.5 }}>
					<AddIcon fontSize="small" />
				</IconButton>

				{/* Options menu trigger — opens the MoreVert dropdown. */}
				<IconButton size="small" onClick={handleClick} sx={{ color: 'secondary.main', p: 0.5 }}>
					<MoreVertIcon fontSize="small" />
				</IconButton>

				{/* Options menu — currently contains only the Delete list action. */}
				<Menu open={open} onClose={handleClose} anchorEl={anchorEl}>
					<MenuItem onClick={() => { handleClose(); handleDeleteList(list.id); }} sx={{ color: 'error.main', gap: 1 }}>
						<DeleteIcon fontSize="small" /> Delete list
					</MenuItem>
				</Menu>
			</Stack>

			{/* Mutation error banner — shown when a card create/delete fails. Dismissable. */}
			{mutationError && (
				<Alert severity="error" onClose={() => setMutationError(null)} sx={{ mb: 1, fontSize: '0.8rem' }}>
					{mutationError}
				</Alert>
			)}

			{/* Cards presenter — purely presentational; receives the cards array and a delete callback. */}
			<Cards cards={cards} onDeleteCard={handleDeleteCard} />

			{/*
			  * Inline add-card form — conditionally rendered when isAddingCard is true.
			  *
			  * The `data-card-form` attribute is used as a CSS selector anchor so the
			  * title field's Enter key handler can focus the priority dropdown via
			  * querySelector('[role="combobox"]') without a ref.
			  *
			  * The onBlur guard closes the form when focus leaves the entire form
			  * container, but ignores blur events caused by clicking into a MUI
			  * Select listbox popover (which is rendered outside the form in the DOM).
			  */}
			{isAddingCard && (
				<Box
					data-card-form
					onKeyDown={handleFormKeyDown}
					onBlur={e => {
						const focusLeftForm = !e.currentTarget.contains(e.relatedTarget);
						const focusedAMuiPopover = e.relatedTarget?.closest('[role="listbox"]');
						if (focusLeftForm && !focusedAMuiPopover) handleCancelCard();
					}}
					sx={{
						mt: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: 1,
						bgcolor: 'background.paper',
						border: '1px solid',
						borderColor: 'divider',
						borderRadius: '8px',
						p: 1.5,
					}}
				>
					{/* Card title input — auto-focuses when the form opens. */}
					<TextField
						autoFocus
						placeholder="Enter card title…"
						value={newCardTitle}
						onChange={e => setNewCardTitle(e.target.value)}
						inputRef={titleRef}
						onKeyDown={e => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault();
								e.currentTarget.closest('[data-card-form]')?.querySelector('[role="combobox"]')?.focus();
							}
						}}
						size="small"
						fullWidth
						slotProps={{
							input: {
								sx: theme => ({
									color: 'text.primary',
									bgcolor: theme.palette.background.surface,
									borderRadius: 1,
									fontSize: '0.9rem',
								}),
							},
						}}
					/>

					{/* Action row — priority dropdown, submit button, and cancel button. */}
					<Stack direction="row" spacing={1} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 110 }}>
							<Select
								value={newCardPriority}
								onChange={e => setNewCardPriority(e.target.value)}
								sx={theme => ({
									color: 'text.primary',
									bgcolor: theme.palette.background.surface,
									fontSize: '0.9rem',
									'& .MuiSelect-icon': { color: theme.palette.secondary.main },
								})}
							>
								<MenuItem value="Low">Low</MenuItem>
								<MenuItem value="Medium">Medium</MenuItem>
								<MenuItem value="High">High</MenuItem>
							</Select>
						</FormControl>
						<Box
							component="button"
							onClick={handleCreateCard}
							disabled={isSubmitting}
							sx={{
								px: 2,
								py: 0.75,
								bgcolor: 'primary.main',
								color: 'text.primary',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								fontWeight: 600,
								fontSize: '0.875rem',
								'&:disabled': { opacity: 0.5 },
							}}
						>
							{isSubmitting ? '…' : 'Add (Shift+↵'}
						</Box>
						<IconButton size="small" onClick={handleCancelCard} sx={{ color: 'secondary.main', p: 0.5 }}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Stack>
				</Box>
			)}
		</Box>
	);
}
