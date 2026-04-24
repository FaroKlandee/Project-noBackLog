/**
 * @file Lists.jsx
 * @description Presentational component that renders the collection of lists
 * (columns) belonging to a single board. Intentionally "dumb" — it accepts
 * pre-fetched data via props and delegates per-column rendering and data
 * fetching to ListColumn.
 *   - The parent (BoardDetailPage) owns the useLists fetch lifecycle.
 *   - This component maps the lists array to ListColumn instances.
 *   - ListColumn owns the useCards fetch lifecycle for its own column.
 */

/*
 * ListColumn is the container component for a single list column.
 * It calls useCards internally and renders the column header + Cards presenter.
 */
import ListColumn from './ListColumn';
import { Box } from '@mui/material';
/**
 * Lists component — presentational renderer for a board's list columns.
 *
 * Receives the array of list objects from its parent and maps each one to a
 * ListColumn, which handles its own card-fetching lifecycle. Handles the
 * empty-state case by rendering a descriptive fallback message when no lists
 * are present.
 *
 * @component
 * @param {Object}        props
 * @param {Array<Object>} props.lists - The array of list objects to render.
 *   Each object is expected to have at minimum:
 *     - `id`   {number} — unique identifier, used as the React key and passed
 *                         to ListColumn so it can fetch its cards.
 *     - `name` {string} — display name of the list column.
 *
 * @returns {JSX.Element|string} A series of ListColumn components (one per
 *   list), or the string "No lists yet" when the lists array is empty.
 *
 * @example
 * const { lists } = useLists(boardId);
 * <Lists lists={lists} />
 *
 * @example
 * <Lists lists={[]} />
 */
export default function Lists({ lists }) {
	/*
	 * Guard: if the lists array is empty (board has no lists yet, or the fetch
	 * hasn't resolved), render a plain-text fallback instead of an empty
	 * container. This gives the user clear feedback rather than a blank page.
	 */
	if (lists.length === 0) {
		return "No lists yet";
	}

	/*
	 * Map each list object to a ListColumn. The `key` prop uses `list.id` so
	 * React can efficiently reconcile columns when they are added or removed.
	 * The full `list` object is forwarded so ListColumn has access to both
	 * `id` (for the useCards call) and `name` (for the column header).
	 */
	return (
		<Box
			sx={{
				display:'flex',
				flexDirection:'row',
				flexWrap:'nowrap',
				overflowX:'auto',
				height: 'calc(100vh - 64px)',
				gap: 2,
			}}
		>
		{lists.map((list) => (
			<ListColumn key={list.id} list={list} />
		))}
		</Box>
	);
}
