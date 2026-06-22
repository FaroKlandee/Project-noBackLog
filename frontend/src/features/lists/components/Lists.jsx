/**
 * @file Lists.jsx
 * @description Presentational component that renders the collection of list
 * columns for a single board, plus an inline "add new list" form.
 *
 * Intentionally "dumb" — it accepts pre-fetched data and mutation callbacks
 * via props and delegates per-column rendering and card fetching to ListColumn.
 * All list-fetch lifecycle logic lives in the parent (BoardDetailPage) via useLists.
 *
 * Renders:
 *   - A horizontally-scrollable row of ListColumn components (one per list).
 *   - An "Add new list" button at the end of the row.
 *   - An inline form (text field + confirm/cancel) that replaces the button
 *     when the user clicks "Add new list".
 *   - A plain-text empty
 state when no lists exist yet.
 *
 * Hierarchy:
 *   BoardDetailPage (src/pages/BoardDetailPage.jsx)
 *     └─ Lists  ← YOU ARE HERE
 *          └─ ListColumn (one per list)
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * ListColumn              — container component for a single list column.
 * Box, Button, IconButton,
 * TextField               — MUI layout and form components.
 * AddIcon, CloseIcon      — MUI icons for the add and cancel actions.
 * useState                — React hook for local form state.
 */
import ListColumn from './ListColumn';
import { Box, Button, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { useState } from 'react';

/**
 * Lists component.
 *
 * Renders all list columns for a board in a horizontal scrollable row, with
 * an "Add new list" control appended at the end.
 *
 * @component
 * @param {Object}        props
 * @param {Array<Object>} props.lists             - Array of list objects to render.
 *   Each object must have at minimum: `id` {number}, `name` {string}.
 * @param {Function}      props.createNewList     - Async callback invoked with the
 *   new list's name string when the user confirms the add-list form.
 * @param {Function}      props.deleteExistingList - Callback invoked with a list's
 *   ID when the user deletes a list from its column menu.
 * @returns {JSX.Element} A horizontally scrollable row of list columns and an
 *   "Add new list" control.
 */
export default function Lists({ lists, createNewList, deleteExistingList }) {
	/*
	 * Local State — Add-list form
	 * ─────────────────────────────────────────────────────────────────────
	 * isAd
ding    — toggles between the "Add new list" button and the inline form.
	 * newListName — controlled value for the list name text field.
	 */
	const [isAdding, setIsAdding] = useState(false);
	const [newListName, setNewListName] = useState('');

	/*
	 * Event Handlers
	 * ─────────────────────────────────────────────────────────────────────
	 */

	/**
	 * Submit the new list name to the parent callback, then reset the form.
	 * Guards against empty input — does nothing if the trimmed name is blank.
	 *
	 * @async
	 */
	async function handleConfirm() {
		if (newListName.trim() === '') return;
		await createNewList(newListName);
		setNewListName('');
		setIsAdding(false);
	}

	/**
	 * Cancel the add-list form and reset all form state.
	 */
	function handleCancel() {
		setNewListName('');
		setIsAdding(false);
	}

	/*
	 * Render
	 * ─────────────────────────────────────────────────────────────────────
	 * A horizontally-scrollable, no-wrap flex row. Each list is mapped to a
	 * ListColumn. An "Add new list" control is appended at the end — it renders
	 * either a dashed outline button (idle state) or an inline form (isAdding).
	 */
	return (
		<Box
			sx={{
				display: 'flex',
				flexDirection: 'row',
				flexWrap: 'nowrap',
				overflowX: 'auto',
				overflowY: 'hidden',
				flexGrow: 1,
				height: "100%",
				gap: 2,
				alignItems: 'flex-start',
				pb: 2,
			}}
		>
			{/*
			  * List columns — empty state shows a plain text placeholder;
			  * otherwise each list object is rendered as a ListColumn.
			  */}
			{lists.length === 0 ?
				(<p>No lists for now...</p>) : (
					lists.map((list, index) => (
						<ListColumn key={list.id} list={list} index={index} deleteExistingList={deleteExistingList}/>
					))
				)}

			{/*
			  * Add new list control — fixed-width box at the end of the row.
			  * Toggles between a dashed outline button and an inline input form.
			  */}
			<Box sx={{ width: 280, flexShrink: 0 }}>
				{isAdding ? (
					/*
					 * Inline add-list form — shown when isAdding is true.
					 * Contains a text field (Enter key confirms) and Confirm/Cancel actions.
					 */
					<Box
						sx={theme => ({
							display: 'flex',
							flexDirection: 'column',
							gap: 1,
							bgcolor: theme.palette.background.surface,
							border: `1px solid ${theme.palette.divider}`,
							borderRadius: '12px',
							p: 1.5,
						})}
					>
						<TextField
							autoFocus
							focused
							value={newListName}
							onChange={e => setNewListName(e.target.value)}
							onKeyDown={e => e.key === 'Enter' && handleConfirm()}
							placeholder="Enter list name…"
							color="secondary"
							size="small"
							sx={theme => ({
								'& .MuiOutlinedInput-root': {
									bgcolor: 'background.paper',
									borderRadius: 1,
									color: 'text.primary',
									'& fieldset': { borderColor: theme.palette.border.focus },
									'&:hover fieldset': { borderColor: theme.palette.primary.main },
								},
							})}
						/>
						<Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
							<Button
								variant="contained"
								onClick={handleConfirm}
								sx={{
									bgcolor: 'primary.main',
									'&:hover': { bgcolor: 'primary.dark' },
									textTransform: 'none',
									borderRadius: 1,
								}}
							>
								Confirm
							</Button>
							<IconButton onClick={handleCancel} size="small">
								<CloseIcon fontSize="large" sx={{ color: 'text.secondary' }} />
							</IconButton>
						</Box>
					</Box>
				) : (
					/*
					 * "Add new list" button — dashed outline style; clicking it
					 * switches to the inline form (isAdding = true).
					 */
					<Button
						variant="outlined"
						fullWidth
						startIcon={<AddIcon fontSize="inherit" />}
						onClick={() => setIsAdding(true)}
						sx={theme => ({
							width: '100%',
							justifyContent: 'flex-start',
							color: 'secondary.main',
							borderColor: theme.palette.border.hover,
							borderStyle: 'dashed',
							borderWidth: '1px',
							borderRadius: '12px',
							py: 1.5,
							px: 2,
							textTransform: 'none',
							bgcolor: 'transparent',
							'&:hover': { bgcolor: 'action.hover', borderColor: 'secondary.main' },
						})}
					>
						Add new list
					</Button>
				)}
			</Box>
		</Box>
	);
}
