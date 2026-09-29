/**
 * @file ListColumnPreview.jsx
 * @description Non-interactive visual clone of an entire ListColumn — header
 * plus its cards — rendered inside the board's DragOverlay while a list
 * column is being dragged.
 *
 * See CardPreview.jsx for why a dedicated overlay preview exists at all — the
 * same reasoning applies to list columns: the real ListColumn must never be
 * touched by dnd-kit's direct-DOM feedback mechanism, only by React.
 *
 * Renders its cards via CardPreview (`nested`) rather than CardItem, so the
 * clone stays purely visual — no `ref`/useSortable registration, no menus —
 * matching dnd-kit's own multi-container example, where picking up a column
 * lifts the whole stack of cards with it as one rigid unit instead of leaving
 * them behind. A slight scale/rotate + heavier shadow sells the "picked up
 * off the table" feel; the real column underneath stays as a plain drop
 * placeholder (see ListColumn.jsx's isDragSource treatment) and the other
 * columns shift over live to open a gap, via the same onDragOver reorder that
 * drives every other list's shift animation.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ DragOverlay
 *          └─ ListColumnPreview  ← YOU ARE HERE
 *               └─ CardPreview (nested, one per card)
 */

import { Box, Typography, Stack, List } from '@mui/material';
import { CardPreview } from '../../cards';

/**
 * ListColumnPreview component.
 *
 * @component
 * @param {Object}         props
 * @param {Object}         props.list      - The list object being dragged.
 * @param {string}         props.list.name - Display name of the list.
 * @param {Array<Object>}  [props.cards=[]] - This list's cards, rendered as
 *   nested CardPreviews so the lifted clone carries them along, the same way
 *   the real column does before it's picked up.
 * @returns {JSX.Element}
 */
export default function ListColumnPreview({ list, cards = [] }) {
	return (
		<Box
			sx={theme => ({
				width: 280,
				bgcolor: theme.palette.background.surface,
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: '12px',
				p: 1.5,
				boxShadow: theme.shadows[16],
				transform: 'scale(1.03) rotate(1.5deg)',
				cursor: 'grabbing',
			})}
		>
			<Stack direction="row" alignItems="center" sx={{ gap: 0.5, mb: 1 }}>
				<Typography sx={{ fontWeight: 700, color: 'text.primary', fontSize: '0.95rem', flexGrow: 1 }}>
					{list.name}
				</Typography>
				<Box
					component="span"
					sx={theme => ({
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
			</Stack>

			{cards.length > 0 && (
				<List sx={{ p: 0, m: 0 }}>
					{cards.map(card => (
						<Box key={card.id} sx={{ pb: 1 }}>
							<CardPreview card={card} nested />
						</Box>
					))}
				</List>
			)}
		</Box>
	);
}
