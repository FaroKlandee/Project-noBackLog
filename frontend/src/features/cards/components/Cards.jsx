/**
 * @file Cards.jsx
 * @description Presentational component that renders the collection of cards
 * belonging to a single list column. Intentionally "dumb" — it receives
 * pre-fetched data via props and is purely responsible for display logic.
 *   - The parent owns the data-fetching lifecycle via useCards.
 *   - This component is easily testable in isolation by passing mock data.
 */

/*
 * MUI components used:
 *   List         — vertical container that provides list semantics and spacing.
 *   ListItem     — a single row within the List; wraps one card's content.
 *   ListItemText — renders primary text (card title) with MUI typography styles.
 *   Chip         — compact badge used to display the card's priority label.
 */
import { useState } from 'react';
import { List, ListItem, ListItemText, Chip, Typography, IconButton, Menu, MenuItem, Box } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

/**
 * Cards component — presentational renderer for a list column's cards.
 *
 * Receives the array of card objects from its
 parent and maps over them,
 * rendering each card as a MUI ListItem containing the card title and a
 * colour-coded priority Chip. Handles the empty-state case by rendering a
 * plain-text fallback when no cards are present.
 *
 * @component
 * @param {Object}        props
 * @param {Array<Object>} props.cards - The array of card objects to render.
 *   Each object is expected to have at minimum:
 *     - `id`       {number} — unique identifier, used as the React key.
 *     - `title`    {string} — the card's display title.
 *     - `priority` {string} — one of "Low" | "Medium" | "High".
 *
 * @returns {JSX.Element|string} A MUI List of cards, or the string
 *   "No cards yet" when the cards array is empty.
 *
 * @example
 * const { cards } = useCards(list.id);
 * <Cards cards={cards} />
 *
 * @example
 * <Cards cards={[]} />
 */
export default function Cards({ cards, onDeleteCard }) {
	/*
	 * selectedCardId tracks which card's menu is currently open.
	 * Only one menu can be open at a time — clicking a different card's
	 * MoreVert icon first closes the current menu then opens the new one.
	 * null means no menu is open.
	 */
	const [selectedCardId, setSelectedCardId] = useState(null);
	const [anchorEl, setAnchorEl] = useState(null);

	function handleMenuOpen(event, cardId) {
		setAnchorEl(event.currentTarget);
		setSelectedCardId(cardId);
	}

	function handleMenuClose() {
		setAnchorEl(null);
		setSelectedCardId(null);
	}

	function handleDelete() {
		if (onDeleteCard) onDeleteCard(selectedCardId);
		handleMenuClose();
	}
	/*
	 * Guard: render a plain-text fallback when there are no cards so the user
	 * sees clear feedback rather than an empty, invisible container.
	 */
	if (cards.length === 0) {
		return (
			<Typography
				sx={{
					color: 'text.secondary',
					fontSize: '0.875rem',
					opacity: 0.75,
				}}
			>
				No cards yet
			</Typography>
		);
	}

	return (
		/*
		 * MUI List: semantic <ul> wrapper that applies consistent vertical
		 * spacing and list-role accessibility attributes to its children.
		 */
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
					<Menu
						anchorEl={anchorEl}
						open={selectedCardId === card.id}
						onClose={handleMenuClose}
					>
						<MenuItem onClick={handleDelete} sx={{ color: 'error.main', gap: 1, fontSize: '0.875rem' }}>
							<DeleteIcon fontSize="small" /> Delete
						</MenuItem>
					</Menu>
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
							...(card.priority === 'Low' && { bgcolor: theme.palette.priority.low.bg, color: theme.palette.priority.low.text }),
							...(card.priority === 'Medium' && { bgcolor: theme.palette.priority.medium.bg, color: theme.palette.priority.medium.text }),
							...(card.priority === 'High' && { bgcolor: theme.palette.priority.high.bg, color: theme.palette.priority.high.text }),
						})}
					/>
				</ListItem>
			))}
		</List>
	);
}
