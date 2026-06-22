/**
 * @file Cards.jsx
 * @description Presentational component that renders a list of card items for
 * a single Kanban column.
 *
 * Intentionally "dumb" — it accepts pre-fetched card data via props and owns
 * only the context-menu UI state (anchorEl, selectedCardId) needed to show
 * a per-card options menu. All data-fetching and mutation logic lives in
 * ListColumn (via useCards).
 *
 * Renders:
 *   - An empty-state message when no cards exist.
 *   - A MUI List of card items, each with a title, a MoreVert context menu,
 *     and a colour-coded priority Chip.
 *
 * Hierarchy:
 *   ListColumn (src/features/lists/components/ListColumn.jsx)
 *     └─ Cards  ← YOU ARE HERE
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * React
 */
import { useState } from 'react';

/*
 * MUI primitives used to build each card item:
 *   List, ListItem  — scrollable list container and individual item wrapper.
 *   ListItemText    — renders the card title with MUI typography.
 *   Chip            — pill badge for the priority label.
 *   Typography      — empty-state message text.
 *   IconButton      — trigger for the per-card options menu.
 *   Menu, MenuItem  — floating context menu with the Delete action.
 *   Box             — generic layout wrapper (card header row).
 */
import { List, ListItem, ListItemText, Chip, Typography, IconButton, Menu, MenuItem, Box } from '@mui/material';

/*
 * Icons
 */
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Cards component.
 *
 * Renders an array of card objects as a styled MUI list with per-card context
 * menus and colour-coded priority chips. Delegates the actual deletion to the
 * parent via the `onDeleteCard` callback.
 *
 * @component
 * @param {Object}          props
 * @param {Array<Object>}   props.cards        - Array of card objects to render.
 *   Each card is expected to have: `id` {number}, `title` {string},
 *   `priority` {string} — one of "Low" | "Medium" | "High".
 * @param {Function}        props.onDeleteCard - Callback invoked with a card's
 *   `id` when the user confirms deletion from the context menu.
 * @returns {JSX.Element} A list of card items or an empty-state message.
 */
export default function Cards({ cards, onDeleteCard }) {
	/*
	 * Context Menu State
	 * ─────────────────────────────────────────────────────────────────────
	 * anchorEl      — the DOM element that the MUI Menu anchors itself to
	 *                 (the MoreVert IconButton that was clicked).
	 * selectedCardId — tracks which card's menu is currently open so the
	 *                  correct Menu is shown and the right ID is passed to
	 *                  onDeleteCard on confirmation.
	 */
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [anchorEl, setAnchorEl] = useState(null);

	/**
	 * Open the context menu for a specific card.
	 *
	 * @param {React.SyntheticEvent} event - The click event on the MoreVert button.
	 * @param {number} cardId              - ID of the card whose menu should open.
	 */
	function handleMenuOpen(event, cardId) {
		setAnchorEl(event.currentTarget);
		setSelectedCardId(cardId);
	}

	/**
	 * Close the context menu and clear the selected card ID.
	 */
	function handleMenuClose() {
		setAnchorEl(null);
		setSelectedCardId(null);
	}

	/**
	 * Invoke the parent's delete callback for the currently selected card,
	 * then close the menu.
	 */
	function handleDelete() {
		if (onDeleteCard) onDeleteCard(selectedCardId);
		handleMenuClose();
	}

	/*
	 * Empty State
	 * ─────────────────────────────────────────────────────────────────────
	 * Render a muted placeholder when the cards array is empty so the column
	 * doesn't appear broken.
	 */
	if (cards.length === 0) {
		return (
			<Typography sx={{ color: 'text.secondary', fontSize: '0.875rem', opacity: 0.75 }}>
				No cards yet
			</Typography>
		);
	}

	/*
	 * Render — Card List
	 * ─────────────────────────────────────────────────────────────────────
	 * Each card is a rounded ListItem containing:
	 *   - A header row with the card title (left) and a MoreVert menu trigger (right).
	 *   - A floating Menu with a single "Delete" action.
	 *   - A colour-coded priority Chip below the title.
	 */
	return (
		<List sx={{ p: 0, m: 0 }}>
			{cards.map((card) => (
				<ListItem
					key={card.id}
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
							onClick={e => handleMenuOpen(e, card.id)}
							sx={{ color: 'secondary.main', p: 0.25, ml: 1, flexShrink: 0 }}
						>
							<MoreVertIcon fontSize="small" />
						</IconButton>
					</Box>

					{/*
					  * Per-card context menu — only the menu for `selectedCardId` is
					  * open at any time (open={selectedCardId === card.id}).
					  */}
					<Menu
						anchorEl={anchorEl}
						open={selectedCardId === card.id}
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
			))}
		</List>
	);
}
