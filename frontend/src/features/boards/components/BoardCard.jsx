/**
 * @file BoardCard.jsx
 * @description Presentational card component for a single board in the boards grid.
 *
 * Renders a clickable MUI Card that navigates to the board's detail page when
 * activated. The entire card surface is the click target via CardActionArea,
 * which is composed with a React Router Link so navigation is handled
 * client-side without a full page reload.
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * Typography, CardContent, Card, CardActionArea — MUI components for the card
 *                                                  surface and content layout.
 * Link — React Router component; used as the CardActionArea's root element so
 *         the entire card is a client-side navigation link.
 */
import { Typography, CardContent, Card, CardActionArea } from '@mui/material';
import { Link } from "react-router";

/**
 * BoardCard component.
 *
 * Renders a single board as a clickable MUI card. Clicking anywhere on the
 * card navigates to `/boards/<id>` using React Router's client-side routing.
 *
 * @component
 * @param {Object} props
 * @param {Object} props.board      - The board object to display.
 * @param {number} props.board.id   - Unique identifier used to build the
 *                                    navigation link target URL.
 * @param {string} props.board.name - Display name rendered as the card heading.
 * @returns {JSX.Element} A clickable MUI Card that links to the board detail page.
 */
export default function BoardCard({ board }) {
	return (
		<Card>
			{/*
			  * CardActionArea makes the entire card surface clickable and provides
			  * hover/focus ripple feedback. `component={Link}` replaces the default
			  * root element with a React Router Link so navigation is client-side.
			  */}
			<CardActionArea component={Link} to={`/boards/${board.id}`}>
				<CardContent>
					<Typography gutterBottom variant='h5'>{board.name}</Typography>
				</CardContent>
			</CardActionArea>
		</Card>
	)
}
