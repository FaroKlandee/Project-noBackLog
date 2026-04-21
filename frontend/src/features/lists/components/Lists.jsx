/**
 * @file Lists.jsx
 * @description Presentational component that renders the collection of lists
 * (columns) belonging to a single board. Unlike its counterpart `Boards.jsx`,
 * this component is intentionally "dumb" — it accepts pre-fetched data via
 * props rather than calling a hook itself. This separation of concerns means:
 *   - The parent (BoardDetailPage) owns the data-fetching lifecycle.
 *   - This component is purely responsible for display logic.
 *   - The component is easily testable in isolation by passing mock data.
 */

/**
 * Lists component — presentational renderer for a board's list columns.
 *
 * Receives the array of list objects from its parent and maps over them to
 * render each list's name. Handles the empty-state case by rendering a
 * descriptive fallback message when no lists are present.
 *
 * @component
 * @param {Object}   props
 * @param {Array<Object>} props.lists - The array of list objects to render.
 *   Each object is expected to have at minimum:
 *     - `id`   {number} — unique identifier, used as the React `key`
 *     - `name` {string} — display name of the list column
 *
 * @returns {JSX.Element|string} A series of `<p>` elements (one per list),
 *   or the string "No lists yet" when the lists array is empty.
 *
 * @example
 * // Typical usage — parent passes the lists array from useLists:
 * const { lists } = useLists(boardId);
 * <Lists lists={lists} />
 *
 * @example
 * // Empty state — renders the fallback message:
 * <Lists lists={[]} />
 */
export default function Lists({ lists }) {
	// Guard: if the lists array is empty (board has no lists yet, or data
	// hasn't arrived yet), render a plain-text fallback instead of an empty
	// container. This gives the user clear feedback rather than a blank page.
	if (lists.length === 0) {
		return "No lists yet";
	}

	// Map over the lists array and render each list's name as a plain text
	// paragraph. The `key` prop uses `list.id` (the unique database identifier)
	// so React can efficiently reconcile the list when items are added or removed.
	return lists.map((list) => (
		<p key={list.id}>{list.name}</p>
	));
}