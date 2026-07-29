/**
 * @file Cards.jsx
 * @description Presentational component that renders a list of card items for
 * a single Kanban column.
 *
 * Intentionally "dumb" — it accepts pre-fetched card data via props and maps
 * each card to a CardItem, which owns its own context-menu state. All card
 * data-fetching and mutation logic lives in BoardDetailPage (via useBoardCards)
 * and is threaded down through Lists and ListColumn as props.
 *
 * Renders:
 *   - An empty-state message when no cards exist.
 *   - A MUI List of CardItem components (one per card).
 *
 * Hierarchy:
 *   ListColumn (src/features/lists/components/ListColumn.jsx)
 *     └─ Cards  ← YOU ARE HERE
 *          └─ CardItem (one per card)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * List, Typography — MUI list container and empty-state message text.
 * CardItem         — presentational component for a single card row.
 */
import { List, Typography } from '@mui/material';
import CardItem from './CardItem';

/**
 * Cards component.
 *
 * Renders an array of card objects as a styled MUI list, delegating each
 * card's rendering and context-menu behaviour to CardItem. Delegates the
 * actual deletion to the parent via the `onDeleteCard` callback.
 *
 * @component
 * @param {Object}          props
 * @param {Array<Object>}   props.cards        - Array of card objects to render.
 *   Each card is expected to have: `id` {number}, `title` {string},
 *   `priority` {string} — one of "Low" | "Medium" | "High", and `listId` {number}
 *   which CardItem uses directly as its sortable group.
 * @param {Function}        props.onDeleteCard - Callback invoked with a card's
 *   `id` when the user confirms deletion from a CardItem's context menu.
 * @returns {JSX.Element} A list of CardItem components or an empty-state message.
 */
export default function Cards({ cards, onDeleteCard }) {
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
	 * Each card object is mapped to a CardItem, keyed by card.id for
	 * efficient reconciliation. The card's index is also passed so
	 * CardItem's useSortable call can compute correct drop positioning.
	 */
	return (
		<List sx={{ p: 0, m: 0 }}>
			{cards.map((card, index) => (
				<CardItem key={card.id} card={card} index={index} onDeleteCard={onDeleteCard} />
			))}
		</List>
	);
}
