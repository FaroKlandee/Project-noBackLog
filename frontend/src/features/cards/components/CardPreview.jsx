/**
 * @file CardPreview.jsx
 * @description Non-interactive visual clone of CardItem, rendered inside the
 * board's DragOverlay while a card is being dragged.
 *
 * dnd-kit's default drag feedback grabs the REAL dragged DOM node (the actual
 * CardItem's `<li>`) and relocates it via the Popover API, leaving a
 * placeholder behind — both done by direct DOM mutation outside React's
 * reconciler. For a same-list reorder that's harmless, but a cross-list move
 * also changes which React subtree renders the card (it moves from one
 * ListColumn's Cards list to another's), and reconciling that OUTSIDE-React
 * DOM mutation against React's own remove/insert of the same node is what
 * threw `NotFoundError: Failed to execute 'removeChild'`.
 *
 * Registering a `<DragOverlay>` (see BoardDetailPage.jsx) makes dnd-kit target
 * a dedicated, React-rendered overlay node as the drag feedback instead of the
 * real CardItem — so the real `<li>` is never touched by anything but React.
 * This component is what the overlay renders: a visual-only copy with no
 * `ref`, no `useSortable` registration, and no menu, since it never needs to
 * behave as a drop target or accept interaction — it only follows the pointer.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ DragOverlay
 *          └─ CardPreview  ← YOU ARE HERE
 */

import { ListItem, ListItemText, Chip, Box } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';

/**
 * CardPreview component.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.card          - The card object being dragged.
 * @param {string} props.card.title    - Display title of the card.
 * @param {string} props.card.priority - One of "Low" | "Medium" | "High".
 * @returns {JSX.Element}
 */
export default function CardPreview({ card }) {
	return (
		<ListItem
			sx={theme => ({
				bgcolor: 'background.paper',
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: '8px',
				width: 254,
				px: 1.5,
				py: 1.25,
				display: 'flex',
				flexDirection: 'column',
				alignItems: 'flex-start',
				boxShadow: theme.shadows[8],
				cursor: 'grabbing',
			})}
			disablePadding={false}
		>
			<Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
				<ListItemText
					primary={card.title}
					primaryTypographyProps={{ sx: { color: 'text.primary', fontWeight: 600, fontSize: '0.95rem' } }}
				/>
				<MoreVertIcon fontSize="small" sx={{ color: 'secondary.main', ml: 1, flexShrink: 0 }} />
			</Box>

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
