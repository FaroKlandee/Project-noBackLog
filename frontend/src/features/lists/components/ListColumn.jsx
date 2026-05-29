/**
 * @file ListColumn.jsx
 * @description Container component for a single list column on a board.
 * Sits between Lists.jsx (pure presenter) and Cards.jsx (pure presenter) in
 * the component hierarchy — it owns the data-fetching lifecycle for one
 * column's cards via useCards, applies traffic-light early returns for
 * loading and error states, then composes the column header and Cards presenter.
 *
 * Hierarchy:
 *   Lists           (src/features/lists/components/Lists.jsx)
 *     └─ ListColumn              ← YOU ARE HERE
 *          └─ Cards  (src/features/cards/components/Cards.jsx)
 */

/*
 * useCards — custom hook that fetches all cards belonging to a given list ID
 * and exposes { cards, loading, error } state.
 * Cards    — presentational component that renders the cards array as a MUI List.
 *
 * Both are imported from the cards feature barrel so this file never reaches
 * into the cards feature's internal folder structure directly.
 */
import { Cards, useCards, createCard, deleteCard } from "../../cards";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import { useState } from "react";
import DeleteIcon from "@mui/icons-material/Delete"
/*
 * useSortable from @dnd-kit/react/sortable makes this column both draggable
 * and droppable. It requires the item's unique `id` and its current `index`
 * in the list array. The hook returns a `ref` that must be attached to the
 * column's root DOM element so the library can track its position.
 */
import { useSortable } from "@dnd-kit/react/sortable";

/*
 * MUI components used:
 *   CircularProgress — indeterminate spinner shown while cards are loading.
 *   Alert            — error banner shown when the useCards fetch fails.
 *   Typography       — renders the list name as a column header with MUI's
 *                      typographic scale.
 *   Box              — generic layout wrapper used to give the column a
 *                      visual boundary and consistent padding.
 */
import { CircularProgress, Alert, Typography, Box, IconButton, Menu, MenuItem, Stack, TextField, Select, FormControl } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';

/**
 * ListColumn component — container for a single Kanban-style list column.
 *
 * Responsibilities:
 *   1. Accept a single `list` prop containing the list's `id` and `name`.
 *   2. Call useCards(list.id) to fetch the cards that belong to this column.
 *   3. Apply traffic-light early returns:
 *        - loading → spinner
 *        - error   → error banner
 *   4. On success, render the list name as a column header followed by the
 *      Cards presenter, passing the fetched cards array as a prop.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.list         - The list object for this column.
 * @param {number} props.list.id      - Unique identifier used to fetch cards
 *                                      and passed to useSortable as `id`.
 * @param {string} props.list.name    - Display name rendered as the column header.
 * @param {number} props.index        - The column's current zero-based position
 *                                      in the lists array. Passed to useSortable
 *                                      so the DragDropProvider can calculate
 *                                      the correct drop target index.
 *
 * @returns {JSX.Element} The rendered column: a spinner, an error banner, or
 *   the column header + card list depending on the fetch state.
 *
 * @example
 * // Rendered by Lists.jsx for each list in the board:
 * <ListColumn list={{ id: 3, name: "In Progress" }} index={2} />
 */
export default function ListColumn({ list, index, deleteExistingList }) {

	/* List-level MoreVert menu state */
	const [anchorEl, setAnchorEl] = useState(null);
	const open = anchorEl !== null;

	const handleClick = (event) => setAnchorEl(event.currentTarget);
	const handleClose = () => setAnchorEl(null);

	/* Add-card form state */
	const [isAddingCard, setIsAddingCard] = useState(false);
	const [newCardTitle, setNewCardTitle] = useState('');
	const [newCardPriority, setNewCardPriority] = useState('Medium');
	const [isSubmitting, setIsSubmitting] = useState(false);

	async function handleCreateCard() {
		if (newCardTitle.trim() === '') return;
		setIsSubmitting(true);
		try {
			const response = await createCard({ title: newCardTitle, priority: newCardPriority, listId: list.id });
			addCard(response.data);
			setNewCardTitle('');
			setNewCardPriority('Medium');
			setIsAddingCard(false);
		} finally {
			setIsSubmitting(false);
		}
	}

	function handleCancelCard() {
		setNewCardTitle('');
		setNewCardPriority('Medium');
		setIsAddingCard(false);
	}

	async function handleDeleteCard(cardId) {
		await deleteCard(cardId);
		removeCard(cardId);
	}
	/*
	 * Fetch all cards that belong to this list column.
	 * useCards is re-triggered automatically if list.id ever changes, ensuring
	 * the correct cards are always shown without unmounting the component.
	 */
	/*
	 * useSortable registers this column as a sortable drag-and-drop item.
	 * `id` identifies which list is being dragged; `index` tells the provider
	 * where it currently sits so it can compute the new order on drop.
	 * The returned `ref` must be attached to the root element.
	 */
	const { ref } = useSortable({ id: list.id, index });

	const { cards, loading, error, addCard, removeCard } = useCards(list.id);

	/*
	 * Traffic light — loading check first.
	 * Show a spinner while the network request is in-flight so the user has
	 * immediate visual feedback that content is on its way.
	 */
	if (loading) {
		return <CircularProgress aria-label={`Loading cards for ${list.name}…`} />;
	}

	/*
	 * Traffic light — error check second.
	 * If the fetch failed for any reason (network, timeout, non-2xx status),
	 * surface a descriptive error banner rather than an empty or broken column.
	 */
	if (error) {
		return (
			<Alert variant="filled" severity="error">
				Failed to load cards for "{list.name}".
			</Alert>
		);
	}

	async function handleDeleteList(listId) {
		await deleteExistingList(listId);
	}

	/*
	 * Happy path — cards loaded successfully.
	 * Render the column header using the list name, then pass the fetched cards
	 * array down to the Cards presenter. Cards is intentionally kept ignorant of
	 * the fetch lifecycle; it only knows how to render an array it receives.
	 */
	return (
		/*
		 * Box: lightweight layout wrapper that gives the column a visible
		 * boundary. `component="section"` adds semantic HTML meaning — each
		 * column is a distinct section of the board. Inline sx styles are used
		 * here to keep the component self-contained without a separate CSS file.
		 */
		<Box
			ref={ref}
			component="section"
			sx={{
				flexGrow: 0,
				flexShrink: 0,
				width: 280,
				bgcolor: '#12101F',
				border: '1px solid #2A2545',
				borderRadius: '12px',
				p: 1.5,
			}}
		>
			<Stack direction="row" alignItems="center" sx={{ mb: 1, gap: 0.5 }}>
				<Typography sx={{ fontWeight: 700, color: '#fff', fontSize: '0.95rem', flexGrow: 1 }}>
					{list.name}
				</Typography>
				{/* Card count badge */}
				<Box
					component="span"
					sx={{
						ml: 1,
						px: 1,
						py: 0.25,
						bgcolor: '#1E1B3A',
						borderRadius: '999px',
						fontSize: '0.75rem',
						color: '#7C6BAE',
					}}
				>
					{cards.length}
				</Box>
				{/* Add card button */}
				<IconButton size="small" onClick={() => setIsAddingCard(true)} sx={{ color: '#7C6BAE', p: 0.5 }}>
					<AddIcon fontSize="small" />
				</IconButton>
				{/* List options menu */}
				<IconButton size="small" onClick={handleClick} sx={{ color: '#7C6BAE', p: 0.5 }}>
					<MoreVertIcon fontSize="small" />
				</IconButton>
				<Menu
					open={open}
					onClose={handleClose}
					anchorEl={anchorEl}
					slotProps={{ paper: { sx: { bgcolor: '#1C1A2E', border: '1px solid #2A2545', borderRadius: 1 } } }}
				>
					<MenuItem onClick={() => { handleClose(); handleDeleteList(list.id); }} sx={{ color: '#F87171', gap: 1 }}>
						<DeleteIcon fontSize="small" /> Delete list
					</MenuItem>
				</Menu>
			</Stack>
			{/*
			  * Typography variant="h6": renders the list name as a column heading
			  * using MUI's typographic scale. `gutterBottom` adds spacing between
			  * the header and the card list beneath it.
			  */}

			{/*
			  * Cards: purely presentational — receives the already-fetched cards
			  * array and renders each card as a MUI ListItem with a priority Chip.
			  * All fetch logic stays here in ListColumn; Cards never calls a hook.
			  */}
			<Cards cards={cards} onDeleteCard={handleDeleteCard} />

			{/* Inline add-card form — appears below cards when isAddingCard is true */}
			{isAddingCard && (
				<Box
					onBlur={e => { if (!e.currentTarget.contains(e.relatedTarget)) handleCancelCard(); }}
					sx={{
						mt: 1,
						display: 'flex',
						flexDirection: 'column',
						gap: 1,
						bgcolor: '#1C1A2E',
						border: '1px solid #2A2545',
						borderRadius: '8px',
						p: 1.5,
					}}
				>
					<TextField
						autoFocus
						placeholder="Enter card title…"
						value={newCardTitle}
						onChange={e => setNewCardTitle(e.target.value)}
						onKeyDown={e => e.key === 'Enter' && handleCreateCard()}
						size="small"
						fullWidth
						slotProps={{
							input: {
								sx: {
									color: '#fff',
									bgcolor: '#12101F',
									borderRadius: 1,
									fontSize: '0.9rem',
								},
							},
						}}
					/>
					<Stack direction="row" spacing={1} alignItems="center">
						<FormControl size="small" sx={{ minWidth: 110 }}>
							<Select
								value={newCardPriority}
								onChange={e => setNewCardPriority(e.target.value)}
								sx={{
									color: '#fff',
									bgcolor: '#12101F',
									fontSize: '0.9rem',
									'& .MuiNativeSelect-icon': { color: '#7C6BAE' },
								}}
								native
							>
								<option value="Low">Low</option>
								<option value="Medium">Medium</option>
								<option value="High">High</option>
							</Select>
						</FormControl>
						<Box
							component="button"
							onClick={handleCreateCard}
							disabled={isSubmitting}
							sx={{
								px: 2,
								py: 0.75,
								bgcolor: '#7C3AED',
								color: '#fff',
								border: 'none',
								borderRadius: '6px',
								cursor: 'pointer',
								fontWeight: 600,
								fontSize: '0.875rem',
								'&:disabled': { opacity: 0.5 },
							}}
						>
							{isSubmitting ? '…' : 'Add'}
						</Box>
						<IconButton size="small" onClick={handleCancelCard} sx={{ color: '#7C6BAE', p: 0.5 }}>
							<CloseIcon fontSize="small" />
						</IconButton>
					</Stack>
				</Box>
			)}
		</Box>
	);
}
