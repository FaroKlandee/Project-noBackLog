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
import { List, ListItem, ListItemText, Chip } from '@mui/material';

/*
 * Maps each Priority value returned by the API to a MUI Chip colour.
 *
 * The backend Priority enum serialises to the strings "Low", "Medium", "High".
 * MUI Chip supports the colour tokens: "success" | "warning" | "error" among
 * others. Centralising the mapping here means the rest of the component stays
 * free of conditional colour logic.
 *
 * @type {Record<string, "success"|"warning"|"error"|"default">}
 */
const PRIORITY_COLOUR = {
	Low:    'success',
	Medium: 'warning',
	High:   'error',
};

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
export default function Cards({ cards }) {
	/*
	 * Guard: render a plain-text fallback when there are no cards so the user
	 * sees clear feedback rather than an empty, invisible container.
	 */
	if (cards.length === 0) {
		return "No cards yet";
	}

	return (
		/*
		 * MUI List: semantic <ul> wrapper that applies consistent vertical
		 * spacing and list-role accessibility attributes to its children.
		 */
		<List>
			{cards.map((card) => (
				/*
				 * ListItem: a single <li> row for one card.
				 *
				 * `key` uses `card.id` (unique DB primary key) so React can
				 * efficiently reconcile the list on updates without remounting
				 * unchanged items.
				 *
				 * `secondaryAction` anchors content to the trailing edge of the
				 * row — used here to position the priority Chip on the right so
				 * it does not interfere with the title text flow.
				 */
				<ListItem
					key={card.id}
					secondaryAction={
						/*
						 * Chip: compact badge that displays the priority label.
						 *
						 * `label`   — the text shown inside the chip ("Low" / "Medium" / "High").
						 * `color`   — resolved from PRIORITY_COLOUR; falls back to "default"
						 *             if the API returns an unexpected value.
						 * `size`    — "small" keeps the chip visually lightweight alongside
						 *             the title text.
						 * `variant` — "outlined" gives a lighter appearance than a filled chip,
						 *             reducing visual noise when many cards are visible.
						 */
						<Chip
							label={card.priority}
							color={PRIORITY_COLOUR[card.priority] ?? 'default'}
							size="small"
							variant="outlined"
						/>
					}
				>
					{/*
					  * ListItemText: renders card.title using MUI's typographic scale.
					  *
					  * `primary` maps to the main line of text — displayed as body1 by
					  * default. Additional card details (description, due date, etc.) can
					  * be added later via the `secondary` prop without restructuring markup.
					  */}
					<ListItemText primary={card.title} />
				</ListItem>
			))}
		</List>
	);
}