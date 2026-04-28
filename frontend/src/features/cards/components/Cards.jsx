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
import { List, ListItem, ListItemText, Chip, Typography } from '@mui/material';

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
  return (
    <Typography
      sx={{
        color: '#8B5CF6',
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
			<List
  sx={{
    display: 'flex',
    flexDirection: 'column',
    gap: 1.5,
    p: 0,
  }}
>
  {cards.map((card) => (
    <ListItem
      key={card.id}
      secondaryAction={
      <Chip
        label={card.priority}
        size="small"
        variant="outlined"
        sx={{
          fontWeight: 700,
          fontSize: '0.7rem',
          height: 24,
          backgroundColor: 'transparent',

          ...(card.priority === 'Low' && {
            color: '#4ADE80',
            borderColor: 'rgba(74, 222, 128, 0.6)',
          }),

          ...(card.priority === 'Medium' && {
            color: '#FBBF24',
            borderColor: 'rgba(251, 191, 36, 0.6)',
          }),

          ...(card.priority === 'High' && {
            color: '#F87171',
            borderColor: 'rgba(248, 113, 113, 0.7)',

            boxShadow: `
              0 0 6px rgba(248, 113, 113, 0.6),
              0 0 14px rgba(239, 68, 68, 0.4)
            `,
          }),
        }}
      />
      }
      sx={{
        borderRadius: 2.5,
        px: 2,
        py: 1.5,

        background: `
          linear-gradient(
            180deg,
            rgba(31, 18, 55, 0.95),
            rgba(20, 12, 40, 0.95)
          )
        `,

        border: '1px solid rgba(168, 85, 247, 0.18)',

        boxShadow: `
          0 6px 18px rgba(0,0,0,0.22),
          0 0 18px rgba(124, 58, 237, 0.08)
        `,

        transition: 'all 160ms ease',

        '&:hover': {
          transform: 'translateY(-1px)',
          borderColor: 'rgba(168, 85, 247, 0.38)',
          boxShadow: `
            0 8px 24px rgba(0,0,0,0.3),
            0 0 22px rgba(124, 58, 237, 0.18)
          `,
        },

        '& .MuiListItemSecondaryAction-root': {
          right: 16,
        },
      }}
    >
      <ListItemText
        primary={card.title}
        primaryTypographyProps={{
          sx: {
            color: '#E9D5FF',
            fontWeight: 600,
            pr: 8,
          },
        }}
      />
    </ListItem>
  ))}
</List>
	);
}
