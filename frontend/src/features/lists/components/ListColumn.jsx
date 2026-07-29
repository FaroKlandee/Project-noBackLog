/**
 * @file ListColumn.jsx
 * @description Presentational component for a single Kanban-style list column.
 *
 * Sits between Lists.jsx (row presenter) and Cards.jsx (card list presenter).
 * Receives its cards slice and every card mutation handler as props — it does
 * NOT fetch card data itself. Card state is owned board-wide by useBoardCards
 * in BoardDetailPage, so that a card can be moved between two columns from a
 * single drag handler that can see both lists' cards at once.
 *
 * Still owns its own local interaction state, consistent with the convention
 * used by Lists.jsx and CardItem.jsx (data comes from an owner via props; local
 * interaction state lives with the component that owns the interaction):
 *   - The useSortable drag-and-drop registration for column reordering.
 *   - The MoreVert options menu (currently: Delete list).
 *   - The inline add-card form with title input, priority selector, and
 *     keyboard shortcuts (Shift+Enter to submit; L/M/H to set priority).
 *
 * Card loading and fetch-error states are no longer handled here — they are
 * board-level concerns surfaced once by BoardDetailPage, since useBoardCards
 * loads every list's cards in one pass.
 *
 * Hierarchy:
 *   Lists           (src/features/lists/components/Lists.jsx)
 *     └─ ListColumn              ← YOU ARE HERE
 *          └─ Cards  (src/features/cards/components/Cards.jsx)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * Cards — card list presenter, imported from the cards feature barrel so this
 *         file never reaches into the cards feature's internal folder structure.
 */
import { Cards } from "../../cards";

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
 * Alert            — dismissable banner for a scoped card mutation error.
 * Typography       — column header text.
 * Box              — generic layout wrapper for the column surface.
 * IconButton       — trigger buttons for add-card and the options menu.
 * Menu, MenuItem   — floating options menu (Delete list).
 * Stack            — horizontal row layout for the column header.
 * TextField        — card title input inside the add-card form.
 * Select, FormControl — priority dropdown inside the add-card form.
 */
import { Alert, Typography, Box, IconButton, Menu, MenuItem, Stack, TextField, Select, FormControl } from '@mui/material';

/**
 * ListColumn component.
 *
 * Renders one Kanban list column: header, card list, and inline add-card form.
 * Registers itself as a sortable drag-and-drop item for column reordering, and
 * delegates all card and list mutations upward via callback props.
 *
 * @component
 * @param {Object}        props
 * @param {Object}        props.list                    - The list object for this column.
 * @param {number}        props.list.id                 - Unique identifier; used as the
 *                                                        sortable key and passed to
 *                                                        mutation handlers.
 * @param {string}        props.list.name               - Display name in the column header.
 * @param {number}        props.index                   - Zero-based position in the lists
 *                                                        array; required by useSortable to
 *                                                        compute the correct drop target.
 * @param {Array<Object>} [props.cards=[]]              - This column's cards, sliced from
 *                                                        the board-level record by the
 *                                                        parent. Defaults to an empty array
 *                                                        so a newly created list renders
 *                                                        before its cards have been fetched.
 * @param {Function}      props.deleteExistingList      - Async callback invoked with this
 *                                                        list's ID when the user confirms
 *                                                        list deletion.
 * @param {Function}      props.onCreateCard            - Async callback invoked as
 *                                                        `(listId, data)` to create a card.
 * @param {Function}      props.onDeleteCard            - Async callback invoked as
 *                                                        `(listId, cardId)` to delete a card.
 * @param {string|null}   [props.mutationError]         - Card mutation error message already
 *                                                        scoped to this column by the parent,
 *                                                        or null when there is none.
 * @param {Function}      [props.onDismissMutationError] - Callback to clear the mutation error.
 * @returns {JSX.Element} The rendered column.
 */
export default function ListColumn({
	list,
	index,
	cards = [],
	deleteExistingList,
	onCreateCard,
	onDeleteCard,
	mutationError,
	onDismissMutationError,
}) {

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
	 *
	 * `type: 'list'` tags this draggable/droppable with a discriminator so the
	 * board-level `onDragEnd` handler (BoardDetailPage.jsx) can distinguish a
	 * list-reorder drag from a card-reorder drag, since both share the same
	 * DragDropProvider context.
	 *
	 * `accept: 'list'` is required, not just descriptive — without it this
	 * column's Sortable instance defaults to accepting every draggable,
	 * including cards. Since the column's `ref` spans the whole card list
	 * (cards render inside it), an unrestricted column would let a dragged
	 * card collide with the column itself, causing dnd-kit's optimistic
	 * sorting plugin to reposition the *list* instead of a card underneath
	 * it. Restricting `accept` to 'list' ensures only other list columns can
	 * ever be a valid drop target for this column, so a card drag can never
	 * be misidentified as a list-reorder collision.
	 */
	const { ref } = useSortable({ id: list.id, index, type: 'list', accept: 'list' });

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
	 * Submit the new card via the parent's create handler, reset the title
	 * field, and restore focus to the title input so the user can immediately
	 * add another card. Guards against empty titles. Sets isSubmitting to
	 * disable the button during the in-flight request.
	 *
	 * @async
	 */
	async function handleCreateCard() {
		if (newCardTitle.trim() === '') return;
		setIsSubmitting(true);
		try {
			await onCreateCard(list.id, { title: newCardTitle, priority: newCardPriority });
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
	 * Delegate card deletion upward, tagging it with this column's list ID so
	 * the board-level owner knows which bucket to remove the card from.
	 *
	 * @async
	 * @param {number} cardId - ID of the card to delete.
	 */
	async function handleDeleteCard(cardId) {
		await onDeleteCard(list.id, cardId);
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
	 * Render
	 * ─────────────────────────────────────────────────────────────────────
	 * No loading or fetch-error branches here — card loading and fetch errors
	 * are board-level states owned by useBoardCards and surfaced once by
	 * BoardDetailPage, rather than per column.
	 *
	 * Column structure:
	 *   Box (column surface, ref for dnd-kit)
	 *     ├─ Stack (column header row)
	 *     │    ├─ Typography (list name)
	 *     │    ├─ Badge span (card count)
	 *     │    ├─ IconButton (add card)
	 *     │    ├─ IconButton (options menu trigger)
	 *     │    └─ Menu > MenuItem (Delete list)
	 *     ├─ Alert (scoped mutation error banner, shown conditionally)
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

			{/*
			  * Mutation error banner — shown when a card create/delete originating
			  * from THIS column failed. The parent scopes the board-level mutation
			  * error down to a plain message for the matching list, so this
			  * component never needs to know the error envelope's shape.
			  */}
			{mutationError && (
				<Alert severity="error" onClose={onDismissMutationError} sx={{ mb: 1, fontSize: '0.8rem' }}>
					{mutationError}
				</Alert>
			)}

			{/*
			  * Cards presenter — purely presentational; receives the cards array and a
			  * delete callback. No listId is passed: each card already carries its own,
			  * which CardItem uses as its sortable group.
			  */}
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
