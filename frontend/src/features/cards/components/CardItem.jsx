/**
 * @file CardItem.jsx
 * @description Presentational component that renders a single card row inside
 * a Kanban column's card list.
 *
 * Extracted from the `cards.map()` callback in Cards.jsx so each card owns its
 * own context-menu state (anchorEl) instead of sharing one anchor across the
 * entire list. Renders the card title, a MoreVert context menu with a Delete
 * action, and a colour-coded priority Chip.
 *
 * Hierarchy:
 *   Cards (src/features/cards/components/Cards.jsx)
 *     └─ CardItem  ← YOU ARE HERE
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * React
 */
import { useState } from 'react';

/*
 * MUI primitives used to build the card item:
 *   ListItem        — the card's outer container within the parent List.
 *   ListItemText    — renders the card title with MUI typography.
 *   Chip            — pill badge for the priority label.
 *   IconButton      — trigger for the per-card options menu.
 *   Menu, MenuItem  — floating context menu with the Delete action.
 *   Box             — generic layout wrapper (card header row).
 */
import { ListItem, ListItemText, Chip, IconButton, Menu, MenuItem, Box } from '@mui/material';

/*
 * Icons
 */
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

/*
 * @dnd-kit/react/sortable
 * ───────────────────────────────────────────────────────────────────────────
 * useSortable — makes this card both draggable and a drop target.
 *               Requires the item's unique `id` and its current `index` in
 *               the cards array. Returns a `ref` that must be attached to
 *               the card's root DOM element.
 */
import { useSortable } from "@dnd-kit/react/sortable";

/**
 * CardItem component.
 *
 * Renders a single card as a rounded ListItem with a title, a MoreVert context
 * menu (Delete action), and a colour-coded priority Chip. Owns its own menu
 * open/close state locally so multiple CardItems never interfere with each
 * other's menus.
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.card          - The card object to render.
 * @param {number}   props.card.id       - Unique identifier for the card.
 * @param {string}   props.card.title    - Display title of the card.
 * @param {string}   props.card.priority - One of "Low" | "Medium" | "High".
 * @param {number}   props.index         - Zero-based position in the cards
 *   array; required by useSortable to compute the correct drop target.
 * @param {Function} props.onDeleteCard  - Callback invoked with `card.id` when
 *   the user confirms deletion from the context menu.
 * @returns {JSX.Element} A single rendered card list item.
 */
export default function CardItem({ card, index, onDeleteCard }) {
	/*
	 * Drag-and-Drop Registration
	 * ─────────────────────────────────────────────────────────────────────
	 * useSortable registers this card as a sortable item. The returned `ref`
	 * must be attached to the card's root DOM element so dnd-kit can track
	 * its position and compute drop targets.
	 */
	const { ref } = useSortable({ id: card.id, index });

	/*
	 * Context Menu State
	 * ─────────────────────────────────────────────────────────────────────
	 * anchorEl — the DOM element the MUI Menu anchors itself to (the
	 *            MoreVert IconButton for this card). null means the menu
	 *            is closed; a DOM node means it is open.
	 */
	const [anchorEl, setAnchorEl] = useState(null);
	const open = anchorEl !== null;

	/**
	 * Open this card's context menu.
	 *
	 * @param {React.SyntheticEvent} event - The click event on the MoreVert button.
	 */
	function handleMenuOpen(event) {
		setAnchorEl(event.currentTarget);
	}

	/**
	 * Close this card's context menu.
	 */
	function handleMenuClose() {
		setAnchorEl(null);
	}

	/**
	 * Invoke the parent's delete callback for this card, then close the menu.
	 */
	function handleDelete() {
		if (onDeleteCard) onDeleteCard(card.id);
		handleMenuClose();
	}

	/*
	 * Render
	 * ─────────────────────────────────────────────────────────────────────
	 * A rounded ListItem containing:
	 *   - A header row with the card title (left) and a MoreVert menu trigger (right).
	 *   - A floating Menu with a single "Delete" action.
	 *   - A colour-coded priority Chip below the title.
	 */
	return (
		<ListItem
			ref={ref}
			sx={theme => ({
				bgcolor: 'background.paper',
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: '8px',
				mb: 1,
				px: 1.5,
				py: 1.25,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				'&:hover': { borderColor: theme.palette.border.hover },
			})}
			disablePadding={false}
		>
			{/* Card header row — title on the left, options button on the right. */}
			<Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
				<ListItemText
					primary={card.title}
					primaryTypographyProps={{ sx: { color: 'text.primary', fontWeight: 600, fontSize: '0.95rem' } }}
				/>
				<IconButton
					size="small"
					onClick={handleMenuOpen}
					sx={{ color: 'secondary.main', p: 0.25, ml: 1, flexShrink: 0 }}
				>
					<MoreVertIcon fontSize="small" />
				</IconButton>
			</Box>

			{/* This card's context menu — opens/closes independently of other cards. */}
			<Menu
				anchorEl={anchorEl}
				open={open}
				onClose={handleMenuClose}
			>
				<MenuItem onClick={handleDelete} sx={{ color: 'error.main', gap: 1, fontSize: '0.875rem' }}>
					<DeleteIcon fontSize="small" /> Delete
				</MenuItem>
			</Menu>

			{/*
			  * Priority chip — colour is determined by spreading the matching
			  * priority palette tokens (low/medium/high) onto the sx object.
			  */}
			<Chip
				label={card.priority}
				size="small"
				sx={theme => ({
					mt: 0.75,
					height: 22,
					fontSize: '0.7rem',
					fontWeight: 700,
					borderRadius: '999px',
					border: 'none',
					...(card.priority === 'Low'    && { bgcolor: theme.palette.priority.low.bg,    color: theme.palette.priority.low.text }),
					...(card.priority === 'Medium' && { bgcolor: theme.palette.priority.medium.bg, color: theme.palette.priority.medium.text }),
					...(card.priority === 'High'   && { bgcolor: theme.palette.priority.high.bg,   color: theme.palette.priority.high.text }),
				})}
			/>
		</ListItem>
	);
}
