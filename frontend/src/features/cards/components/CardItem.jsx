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
import { useEffect, useRef, useState } from 'react';

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
import EditIcon from '@mui/icons-material/Edit';

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
 * PointerSensor, KeyboardSensor, PointerActivationConstraints,
 * isInteractiveElement — see CARD_DRAG_SENSORS below.
 */
import { useSortable } from "@dnd-kit/react/sortable";
import { SortableKeyboardPlugin } from "@dnd-kit/dom/sortable";
import { PointerSensor, KeyboardSensor, PointerActivationConstraints } from "@dnd-kit/dom";
import { isInteractiveElement } from "@dnd-kit/dom/utilities";

/*
 * Double-Press Drag
 * ───────────────────────────────────────────────────────────────────────────
 * A card is dragged by clicking (or tapping) it once, then pressing again
 * within DOUBLE_PRESS_MS and moving. The same gesture applies to mouse, pen
 * and touch. A single click on its own opens
 * the edit dialog, but only after DOUBLE_PRESS_MS has passed without a second
 * press. That delay is the price of this gesture: opening the dialog on the
 * first click straight away would put the dialog's backdrop under the second
 * press, so the card could never be dragged.
 *
 * armedPress — the card that was just clicked, as `{ dndId, time }`. Kept at
 *              module scope rather than in component state because the drag
 *              sensor below (also module scope) has to read it during
 *              dnd-kit's native pointerdown listener. That listener runs before
 *              React's delegated onPointerDown, so the arm is still intact when
 *              the sensor checks it. Only one card can be armed at a time.
 */
const DOUBLE_PRESS_MS = 200;
let armedPress = null;

function isArmed(dndId) {
	return armedPress?.dndId === dndId && performance.now() - armedPress.time <= DOUBLE_PRESS_MS;
}

/*
 * CARD_DRAG_SENSORS — a draggable's own `sensors` replace the provider's
 * defaults rather than adding to them, so KeyboardSensor is listed again.
 *
 *   - Activation is refused unless this card is armed (see above), and an
 *     armed press still has to move 5px, so a double click or double tap that
 *     stays still is just a click.
 *   - No hold delay for touch, unlike dnd-kit's default. The second tap of
 *     tap-then-drag moves straight away, and a hold delay would cancel the drag
 *     as soon as it moved. The armed card's `touch-action: none` (set in the
 *     component) is what keeps the browser from taking that move as a scroll.
 *   - Presses on interactive children (the options IconButton) never start a
 *     drag. That's dnd-kit's default preventActivation, reimplemented here
 *     because passing our own replaces it.
 *
 * Defined at module scope so useSortable gets the same array on every render.
 */
const CARD_DRAG_SENSORS = [
	PointerSensor.configure({
		activationConstraints: [new PointerActivationConstraints.Distance({ value: 5 })],
		preventActivation(event, source) {
			const { target } = event;
			if (target !== source.element && target instanceof Element && isInteractiveElement(target)) {
				return true;
			}
			return !isArmed(source.id);
		},
	}),
	KeyboardSensor,
];

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
 * @param {Function} props.onEditCard    - Callback invoked with the full `card`
 *   object when the user chooses "Edit" from the context menu, or clicks the
 *   card body (outside the options button and outside a drag).
 * @returns {JSX.Element} A single rendered card list item.
 */
export default function CardItem({ card, index, onDeleteCard, onEditCard }) {
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
		sensors: CARD_DRAG_SENSORS,
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

	/**
	 * Invoke the parent's edit callback for this card, then close the menu.
	 */
	function handleEdit() {
		if (onEditCard) onEditCard(card);
		handleMenuClose();
	}

	/*
	 * Card-Body Click (open the edit dialog) vs. Drag
	 * ─────────────────────────────────────────────────────────────────────
	 * pointerDownPos — coordinates recorded on pointerdown, used in the click
	 *                  handler to tell a genuine click apart from the tail end
	 *                  of a drag. useSortable here only exposes `{ ref,
	 *                  isDragSource }` — there's no "a drag just ended" flag —
	 *                  so this is a manual pointer-travel check instead.
	 * openTimer      — pending delayed open from a first click; see the
	 *                  Double-Press Drag comment at the top of this file.
	 * isSecondPress  — true while the current press is the second half of a
	 *                  double press, so its click opens the dialog at once.
	 * touchArmed     — mirrors this card being armed, as render state, so the
	 *                  card can switch to `touch-action: none` for the second
	 *                  tap. Browsers decide whether a touch scrolls from the
	 *                  touch-action in effect the moment the finger lands, before
	 *                  any JS runs, so it has to be applied after the first tap
	 *                  and not during the second. Clearing it on the second
	 *                  pointerdown is safe for the same reason: that touch's
	 *                  behaviour is already fixed.
	 */
	const dndId = `card-${card.id}`;
	const pointerDownPos = useRef(null);
	const openTimer = useRef(null);
	const isSecondPress = useRef(false);
	const [touchArmed, setTouchArmed] = useState(false);

	/* Cancel a pending open if the card unmounts (e.g. deleted, list removed). */
	useEffect(() => () => clearTimeout(openTimer.current), []);

	/**
	 * Record where the press started, and if it's the second press of a
	 * double press, cancel the first click's pending open: from here the
	 * press either moves (and dnd-kit takes it as a drag) or releases as a
	 * double click.
	 */
	function handleContentPointerDown(e) {
		pointerDownPos.current = { x: e.clientX, y: e.clientY };
		isSecondPress.current = isArmed(dndId);
		if (isSecondPress.current) {
			clearTimeout(openTimer.current);
			armedPress = null;
			setTouchArmed(false);
		}
	}

	/**
	 * Handle a genuine click on the card body. Bails out if the click landed
	 * on the options button (its own handler covers Edit via the menu) or if
	 * the pointer travelled more than a few pixels since pointerdown, which
	 * means this was a drag rather than a click.
	 *
	 * The first click arms the card and opens the dialog after DOUBLE_PRESS_MS
	 * unless a second press arrives first. A second press that didn't move
	 * (a plain double click) opens it straight away.
	 */
	function handleContentClick(e) {
		if (e.target.closest('button')) return;

		const start = pointerDownPos.current;
		const travelled = start
			? Math.hypot(e.clientX - start.x, e.clientY - start.y)
			: 0;
		if (travelled > 5) return;

		if (isSecondPress.current) {
			isSecondPress.current = false;
			if (onEditCard) onEditCard(card);
			return;
		}

		armedPress = { dndId, time: performance.now() };
		setTouchArmed(true);
		clearTimeout(openTimer.current);
		openTimer.current = setTimeout(() => {
			if (armedPress?.dndId === dndId) armedPress = null;
			setTouchArmed(false);
			if (onEditCard) onEditCard(card);
		}, DOUBLE_PRESS_MS);
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
		<Box
			component="li"
			ref={ref}
			data-card-item
			sx={{
				pb: 1,
				listStyle: 'none',
				/*
				 * `manipulation` keeps swipe-to-scroll but turns off double-tap
				 * zoom, which would otherwise swallow tap-then-drag. `none` only
				 * while armed — see touchArmed above.
				 */
				touchAction: touchArmed ? 'none' : 'manipulation',
			}}
		>
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
				<Box
					onPointerDown={handleContentPointerDown}
					onClick={handleContentClick}
					sx={{
						visibility: isDragSource ? 'hidden' : 'visible',
						width: '100%',
						cursor: 'pointer',
						/* An unarmed press-and-move does nothing, so don't let it select the title. */
						userSelect: 'none',
					}}
				>
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
					<MenuItem onClick={handleEdit} sx={{ gap: 1, fontSize: '0.875rem' }}>
						<EditIcon fontSize="small" /> Edit
					</MenuItem>
					<MenuItem onClick={handleDelete} sx={{ color: 'error.main', gap: 1, fontSize: '0.875rem' }}>
						<DeleteIcon fontSize="small" /> Delete
					</MenuItem>
				</Menu>
			</Box>
		</Box>
	);
}
