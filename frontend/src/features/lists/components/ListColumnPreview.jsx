/**
 * @file ListColumnPreview.jsx
 * @description Non-interactive visual clone of a ListColumn header, rendered
 * inside the board's DragOverlay while a list column is being dragged.
 *
 * See CardPreview.jsx for why a dedicated overlay preview exists at all — the
 * same reasoning applies to list columns: the real ListColumn must never be
 * touched by dnd-kit's direct-DOM feedback mechanism, only by React.
 *
 * Deliberately not a full ListColumn clone (no cards, no add-card form, no
 * menu) — a dragged column only needs to read as "this column, moving",
 * not remain fully interactive mid-drag.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ DragOverlay
 *          └─ ListColumnPreview  ← YOU ARE HERE
 */

import { Box, Typography, Stack } from '@mui/material';

/**
 * ListColumnPreview component.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.list      - The list object being dragged.
 * @param {string} props.list.name - Display name of the list.
 * @param {number} [props.cardCount=0] - Number of cards in the list, shown in
 *   the count badge for visual parity with the real column header.
 * @returns {JSX.Element}
 */
export default function ListColumnPreview({ list, cardCount = 0 }) {
	return (
		<Box
			sx={theme => ({
				width: 280,
				bgcolor: theme.palette.background.surface,
				border: `1px solid ${theme.palette.divider}`,
				borderRadius: '12px',
				p: 1.5,
				boxShadow: theme.shadows[8],
				cursor: 'grabbing',
			})}
		>
			<Stack direction="row" alignItems="center" sx={{ gap: 0.5 }}>
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
					{cardCount}
				</Box>
			</Stack>
		</Box>
	);
}
