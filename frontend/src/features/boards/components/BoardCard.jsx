/**
 * @file BoardCard.jsx
 * @description A presentational component that renders a single board as a
 * clickable Material UI card. Tapping or clicking the card navigates the user
 * to that board's dedicated detail page via a React Router client-side link.
 */

// Material UI components used to build the card layout:
//  - Card:            the outermost surface / container with elevation shadow
//  - CardActionArea:  wraps the entire card surface so the whole card is clickable
//  - CardContent:     adds consistent inner padding around the card's text content
//  - Typography:      renders text with MUI's type-scale and spacing utilities
import { Typography, CardContent, Card, CardActionArea } from '@mui/material';

// Link from react-router provides client-side navigation without a full page
// reload. It is passed as the `component` prop to CardActionArea so MUI renders
// its interactive surface as a router-aware anchor element.
import { Link } from "react-router";

/**
 * BoardCard
 *
 * A presentational card component representing a single project board.
 * It is intended to be displayed inside a list or grid of boards (e.g. the
 * Boards page). The entire card surface is wrapped in a clickable action area
 * that navigates to `/boards/:id` when activated.
 *
 * @component
 * @param {Object}  props           - Component props.
 * @param {Object}  props.board     - The board data object to display.
 * @param {string|number} props.board.id   - Unique identifier for the board,
 *                                          used to build the navigation URL.
 * @param {string}  props.board.name       - Human-readable name of the board,
 *                                          displayed as the card's heading.
 * @returns {JSX.Element} A Material UI Card that links to the board detail page.
 *
 * @example
 * // Render a single board card:
 * <BoardCard board={{ id: 42, name: "Sprint Backlog" }} />
 */
export default function BoardCard({ board }) {
	return (
		// Card: the MUI surface container. By default it renders with a subtle
		// drop-shadow (elevation) to lift it visually off the background.
		<Card>
			{/*
			 * CardActionArea: makes the entire card surface interactive (hover
			 * highlight, ripple effect, keyboard focus ring, etc.).
			 *
			 * `component={Link}` — replaces the default <button> element with
			 * React Router's <Link> so MUI's accessibility and styling are
			 * preserved while navigation is handled client-side.
			 *
			 * `to={...}` — the target route. Interpolates the board's unique id
			 * to build a path like "/boards/42", matching the board detail route.
			 */}
			<CardActionArea component={Link} to={`/boards/${board.id}`}>
				{/*
				 * CardContent: applies MUI's standard inner padding (16 px on all
				 * sides by default) so the text is never flush against the card edge.
				 */}
				<CardContent>
					{/*
					 * Typography variant="h5": renders the board name as a prominent
					 * heading using MUI's typographic scale.
					 *
					 * `gutterBottom` adds a bottom margin (0.35em by default) beneath
					 * the heading — useful spacing if additional content is added later.
					 */}
					<Typography gutterBottom variant='h5'>{board.name}</Typography>
				</CardContent>
			</CardActionArea>
		</Card>
	)
}