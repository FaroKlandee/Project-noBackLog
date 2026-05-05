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
import { Cards, useCards } from "../../cards";

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
import { CircularProgress, Alert, Typography, Box } from '@mui/material';

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
export default function ListColumn({ list, index }) {
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

	const { cards, loading, error } = useCards(list.id);

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
    width: 300,
    minHeight: 220,
    p: 2,
    borderRadius: 3,
    background: `
      linear-gradient(
        180deg,
        rgba(26, 11, 46, 0.88),
        rgba(15, 6, 35, 0.92)
      )
    `,
    border: '1px solid rgba(168, 85, 247, 0.22)',
    boxShadow: `
      0 0 0 1px rgba(255,255,255,0.025) inset,
      0 12px 35px rgba(0,0,0,0.25),
      0 0 28px rgba(124, 58, 237, 0.12)
    `,
    backdropFilter: 'blur(10px)',
  }}
>
			{/*
			  * Typography variant="h6": renders the list name as a column heading
			  * using MUI's typographic scale. `gutterBottom` adds spacing between
			  * the header and the card list beneath it.
			  */}
			<Typography
  variant="h6"
  sx={{
    mb: 2,
    fontWeight: 700,
    color: '#E9D5FF',
    fontSize: '1rem',
    letterSpacing: '0.2px',
  }}
>
  {list.name}
</Typography>
			{/*
			  * Cards: purely presentational — receives the already-fetched cards
			  * array and renders each card as a MUI ListItem with a priority Chip.
			  * All fetch logic stays here in ListColumn; Cards never calls a hook.
			  */}
			<Cards cards={cards} />
		</Box>
	);
}
