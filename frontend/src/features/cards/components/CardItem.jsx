/**
 * @file CardItem.jsx
 * @description Presentational component that renders a single card row inside
 * a Kanban column's card list.
 *
 * Extracted from the `cards.map()` callback in Cards.jsx so each card owns its
 * own context-menu state (anchorEl) instead of sharing one anchor across the
 * entire list. Renders the card title, a MoreVert context menu with a Delete
 * action, and a colour-coded priority Chip.
 *
 * Hierarchy:
 *   Cards (src/features/cards/components/Cards.jsx)
 *     └─ CardItem  ← YOU ARE HERE
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * React
 */
import { useState } from 'react';

/*
 * MUI primitives used to build the card item:
 *   ListItem        — the card's outer container within the parent List.
 *   ListItemText    — renders the card title with MUI typography.
 *   Chip            — pill badge for the priority label.
 *   IconButton      — trigger for the per-card options menu.
 *   Menu, MenuItem  — floating context menu with the Delete action.
 *   Box             — generic layout wrapper (card header row).
 */
import { ListItemText, Chip, IconButton, Menu, MenuItem, Box } from '@mui/material';

/*
 * Icons
 */
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

/*
 * @dnd-kit/react/sortable
 * ───────────────────────────────────────────────────────────────────────────
 * useSortable — makes this card both draggable and a drop target.
 *               Requires the item's unique `id` and its current `index` in
 *               the cards array. Returns a `ref` that must be attached to
 *               the card's root DOM element.
 * SortableKeyboardPlugin — see the `plugins` option on the useSortable call
 *               below for why this is passed explicitly instead of using
 *               dnd-kit's default plugin set.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";

/**
 * CardItem component.
 *
 * Renders a single card as a rounded ListItem with a title, a MoreVert context
 * menu (Delete action), and a colour-coded priority Chip. Owns its own menu
 * open/close state locally so multiple CardItems never interfere with each
 * other's menus.
 *
 * @component
 * @param {Object}   props
 * @param {Object}   props.card          - The card object to render.
 * @param {number}   props.card.id       - Unique identifier for the card.
 * @param {string}   props.card.title    - Display title of the card.
 * @param {string}   props.card.priority - One of "Low" | "Medium" | "High".
 * @param {number}   props.card.listId   - ID of the list this card belongs to.
 *   Used directly as the sortable `group`. Always present: useBoardCards groups
 *   the board's cards by this field, so a card missing it could never have been
 *   bucketed into a column in the first place.
 * @param {number}   props.index         - Zero-based position in the cards
 *   array; required by useSortable to compute the correct drop target.
 * @param {Function} props.onDeleteCard  - Callback invoked with `card.id` when
 *   the user confirms deletion from the context menu.
 * @returns {JSX.Element} A single rendered card list item.
 */
export default function CardItem({ card, index, onDeleteCard }) {
	/*
	 * Drag-and-Drop Registration
	 * ─────────────────────────────────────────────────────────────────────
	 * useSortable registers this card as a sortable item. The returned `ref`
	 * must be attached to the card's root DOM element so dnd-kit can track
	 * its position and compute drop targets.
	 *
	 * `type: 'card'` tags this draggable/droppable with a discriminator so the
	 * board-level `onDragEnd` handler (BoardDetailPage.jsx) can distinguish a
	 * card-reorder drag from a list-reorder drag, since both share the same
	 * DragDropProvider context.
	 *
	 * `accept: 'card'` restricts valid drop targets to other `type: 'card'`
	 * items, preventing a card from being dropped where a list is expected.
	 *
	 * `group: String(card.listId)` scopes this card to its containing list. Cards
	 * sharing the same group can be reordered within that list or moved into a
	 * different list's group entirely.
	 *
	 * Coerced to a string because `@dnd-kit/helpers`'s `move()` compares `group`
	 * against `cardsByList`'s Object.keys with `!==` — and object keys are always
	 * strings, even numeric-looking ones. Passing the raw number `card.listId`
	 * made every same-list reorder register as `2 !== "2"` → true → a false
	 * "group changed", which sent `move()` down its cross-group branch. There,
	 * JS's own key coercion (`items[2]` and `items["2"]` are the same slot) made
	 * it write the dragged card into that slot twice, producing a duplicate.
	 *
	 * Read straight off the card, chosen over accepting a `listId` prop from the
	 * parent column as a fallback, because useBoardCards already groups the
	 * board's cards by `card.listId` — a card lacking that field would have been
	 * bucketed under `undefined` and never reached this component, so a fallback
	 * could not fire.
	 *
	 * `plugins: [SortableKeyboardPlugin]` — omits dnd-kit's default
	 * `OptimisticSortingPlugin` for the same reason ListColumn.jsx's own
	 * useSortable call does (see its comment for the full mechanism). Crucially,
	 * dnd-kit's plugin registry is a MANAGER-WIDE singleton keyed only by plugin
	 * class (`PluginRegistry.register` in @dnd-kit/abstract returns the existing
	 * instance if one was already created) — so leaving this unset here doesn't
	 * just affect card drags, it instantiates OptimisticSortingPlugin for the
	 * *entire* DragDropProvider the moment the board has a single card anywhere,
	 * and its dragover handler doesn't filter by `type`. That let it start
	 * processing list-vs-list dragover events too, directly mutating list DOM
	 * nodes via insertAdjacentElement in a race against React's own
	 * reconciliation — exactly the failure ListColumn.jsx's own plugin comment
	 * describes, just triggered board-wide by any card's mount rather than by
	 * that specific list's own config. This was the actual cause of list
	 * reordering silently failing to repaint whenever the board had any card,
	 * even on lists ListColumn had already opted out for individually.
	 */
	/*
	 * `transition` overrides dnd-kit's default shift-animation easing
	 * (`cubic-bezier(0.25, 1, 0.5, 1)`, a plain ease-out) with a "back" curve
	 * whose control points push past y=1 — since dnd-kit only ever animates a
	 * `translate` between the card's old and new position, an easing curve
	 * that overshoots 1.0 partway through is the only way to make a card
	 * visibly slide past its landing spot and spring back, rather than just
	 * easing straight into place. `duration` is left unset, keeping the
	 * library's default (250ms).
	 */
	/*
	 * `id: `card-${card.id}`` — prefixed rather than the bare numeric
	 * `card.id`, to guarantee uniqueness across dnd-kit's single shared
	 * draggable/droppable registry for the whole DragDropProvider. `Card.Id`
	 * and `List.Id` come from independent Postgres identity sequences, so an
	 * unrelated list can share a card's numeric id — see ListColumn.jsx's
	 * matching `list-${list.id}` prefix for the full explanation, and
	 * BoardDetailPage.jsx's `toCardDndId`/`fromDndId` helpers, which
	 * translate back to the raw numeric id around every `move()` call.
	 */
	const { ref, isDragSource } = useSortable({
		id: `card-${card.id}`,
		index,
		type: 'card',
		accept: 'card',
		group: String(card.listId),
		plugins: [SortableKeyboardPlugin],
		transition: { easing: 'cubic-bezier(0.34, 1.56, 0.64, 1)' },
	});

	/*
	 * Context Menu State
	 * ─────────────────────────────────────────────────────────────────────
	 * anchorEl — the DOM element the MUI Menu anchors itself to (the
	 *            MoreVert IconButton for this card). null means the menu
	 *            is closed; a DOM node means it is open.
	 */
	const [anchorEl, setAnchorEl] = useState(null);
	const open = anchorEl !== null;

	/**
	 * Open this card's context menu.
	 *
	 * @param {React.SyntheticEvent} event - The click event on the MoreVert button.
	 */
	function handleMenuOpen(event) {
		setAnchorEl(event.currentTarget);
	}

	/**
	 * Close this card's context menu.
	 */
	function handleMenuClose() {
		setAnchorEl(null);
	}

	/**
	 * Invoke the parent's delete callback for this card, then close the menu.
	 */
	function handleDelete() {
		if (onDeleteCard) onDeleteCard(card.id);
		handleMenuClose();
	}

	/*
	 * Render
	 * ─────────────────────────────────────────────────────────────────────
	 * Two nested boxes rather than one styled ListItem:
	 *   - Outer <li> (ref, hit area) — carries the sortable `ref` and the
	 *     spacing between cards as `pb` (padding), not `mb` (margin).
	 *     dnd-kit's collision detection only ever considers an element's own
	 *     getBoundingClientRect(), which excludes margin but includes
	 *     padding — so with `mb`, the visual gap between two cards belonged
	 *     to neither CardItem's hit area, and a drag hovering exactly in
	 *     that gap fell through to ListColumn's plain `cardDropRef`
	 *     droppable instead (see its comment in ListColumn.jsx). Since that
	 *     droppable isn't a Sortable, dnd-kit's OptimisticSortingPlugin
	 *     skipped the reactive reindex that drives the built-in shift
	 *     animation — which is what made the animation not show while
	 *     hovering between cards. Moving the gap into this outer box's
	 *     padding keeps it inside the ref'd element's own rect, so the card
	 *     is always the collision target between it and its neighbors.
	 *   - Inner box (visual card) — everything that used to be styled on the
	 *     ListItem itself: background, border, radius, and content padding.
	 *     While this card `isDragSource` (it's the one currently being
	 *     dragged), it switches to a hollow, dashed-border "drop indicator"
	 *     instead of its normal appearance — the floating clone the user is
	 *     actually dragging is rendered separately by DragOverlay/CardPreview
	 *     (BoardDetailPage.jsx), so this real DOM node just needs to mark
	 *     where it'll land. It keeps tracking the live drop position via the
	 *     same shift-animation mechanism as every other card, so the
	 *     indicator moves as the user hovers.
	 *   - Content wrapper — the header row and chip are wrapped together so
	 *     `visibility: hidden` can hide them as a unit while dragging without
	 *     collapsing their layout space, which is what keeps the placeholder
	 *     the same size as the real card instead of shrinking to empty.
	 * The context menu is unaffected — it's only ever visible via its own
	 * anchorEl state, never while dragging.
	 */
	return (
		<Box component="li" ref={ref} sx={{ pb: 1, listStyle: 'none' }}>
			<Box
				sx={theme => ({
					bgcolor: isDragSource ? 'transparent' : 'background.paper',
					border: isDragSource ? `1px dashed ${theme.palette.divider}` : `1px solid ${theme.palette.divider}`,
					borderRadius: '8px',
					px: 1.5,
					py: 1.25,
					display: 'flex',
					flexDirection: 'column',
					alignItems: 'flex-start',
					...(!isDragSource && { '&:hover': { borderColor: theme.palette.border.hover } }),
				})}
			>
				<Box sx={{ visibility: isDragSource ? 'hidden' : 'visible', width: '100%' }}>
					{/* Card header row — title on the left, options button on the right. */}
					<Box sx={{ width: '100%', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
						<ListItemText
							primary={card.title}
							primaryTypographyProps={{ sx: { color: 'text.primary', fontWeight: 600, fontSize: '0.95rem' } }}
						/>
						<IconButton
							size="small"
							onClick={handleMenuOpen}
							sx={{ color: 'secondary.main', p: 0.25, ml: 1, flexShrink: 0 }}
						>
							<MoreVertIcon fontSize="small" />
						</IconButton>
					</Box>

					{/*
					  * Priority chip — colour is determined by spreading the matching
					  * priority palette tokens (low/medium/high) onto the sx object.
					  */}
					<Chip
						label={card.priority}
						size="small"
						sx={theme => ({
							mt: 0.75,
							height: 22,
							fontSize: '0.7rem',
							fontWeight: 700,
							borderRadius: '999px',
							border: 'none',
							...(card.priority === 'Low'    && { bgcolor: theme.palette.priority.low.bg,    color: theme.palette.priority.low.text }),
							...(card.priority === 'Medium' && { bgcolor: theme.palette.priority.medium.bg, color: theme.palette.priority.medium.text }),
							...(card.priority === 'High'   && { bgcolor: theme.palette.priority.high.bg,   color: theme.palette.priority.high.text }),
						})}
					/>
				</Box>

				{/* This card's context menu — opens/closes independently of other cards. */}
				<Menu
					anchorEl={anchorEl}
					open={open}
					onClose={handleMenuClose}
				>
					<MenuItem onClick={handleDelete} sx={{ color: 'error.main', gap: 1, fontSize: '0.875rem' }}>
						<DeleteIcon fontSize="small" /> Delete
					</MenuItem>
				</Menu>
			</Box>
		</Box>
	);
}
