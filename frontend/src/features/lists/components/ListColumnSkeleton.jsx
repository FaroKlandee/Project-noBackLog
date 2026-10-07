/**
 * @file ListColumnSkeleton.jsx
 * @description Placeholder for a list column while the board's lists are
 * loading.
 *
 * Matches ListColumn's outer geometry (280px wide, `pr: 2` spacing, 12px
 * radius, surface background) so the real columns replace it in place rather
 * than shifting the layout. Deliberately not a ListColumn with fake data: that
 * would register sortables/droppables with dnd-kit for lists that don't exist.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ ListColumnSkeleton  ← YOU ARE HERE (one per placeholder column)
 */

import { Box, Skeleton, Stack } from '@mui/material';

/**
 * ListColumnSkeleton component.
 *
 * @component
 * @returns {JSX.Element} A column-shaped placeholder with a title bar and a
 *   few card-shaped rows.
 */
export default function ListColumnSkeleton() {
	return (
		<Box sx={{ flexShrink: 0, pr: 2 }}>
			<Box
				sx={(theme) => ({
					width: 280,
					bgcolor: theme.palette.background.surface,
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: '12px',
					p: 1.5,
				})}
			>
				<Skeleton width="55%" sx={{ fontSize: '0.95rem', mb: 1 }} />
				<Stack spacing={1}>
					<Skeleton variant="rounded" height={80} />
					<Skeleton variant="rounded" height={80} />
					<Skeleton variant="rounded" height={80} />
				</Stack>
			</Box>
		</Box>
	);
}
