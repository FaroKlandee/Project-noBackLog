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
import { Box, Button, IconButton, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import { grey, purple } from '@mui/material/colors';
import { useState } from 'react';

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
export default function Lists({ lists, createNewList, deleteExistingList}) {
  const [isAdding, setIsAdding] = useState(false);

  const [newListName, setNewListName] = useState('');

   async function handleConfirm() {
    if (newListName.trim() === '') return;
    await createNewList(newListName);
    setNewListName('');
    setIsAdding(false);
  }

  function handleCancel() {
    setNewListName('');
    setIsAdding(false);
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
        px: 2,
        py: 1,
        borderRadius: '12px',

        background: '#1A0B2E',
        border: '1px solid #2E1A47',

        color: '#C4B5FD',

        display: 'flex',
        flexDirection: 'row',
        flexWrap: 'nowrap',
        overflowX: 'auto',
        flexGrow: 1,
        gap: 2,

        transition: 'all 0.2s ease',
      }}
		>
			{lists.length === 0 ?
				(<p>No lists for now...</p>) : (

						lists.map((list, index) => (
							<ListColumn key={list.id} list={list} index={index} deleteExistingList={deleteExistingList}/>
						))

				)}

      <Box sx={{ width: 300, minHeight: 220, flexShrink: 0 }}>
        {isAdding ? (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
						<TextField
						autoFocus
              focused
              value={newListName}
              onChange={e => setNewListName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleConfirm()}
              placeholder="Enter list name…"
              color="secondary"
              size="small"
              sx={{
                bgcolor: grey[300],
                color: grey[100],
                borderColor: purple[500],
                borderRadius: 2,
              }}
            />

            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
              <Button
                variant="contained"
                onClick={handleConfirm}
                sx={{ bgcolor: purple[500] }}
              >
                Confirm
              </Button>
              <IconButton onClick={handleCancel} size="small">
                <CloseIcon fontSize="large" sx={{ color: grey[400] }} />
              </IconButton>
            </Box>
          </Box>
        ) : (
          <Button
            variant="outlined"
            fullWidth
            startIcon={<AddIcon fontSize="inherit" />}
            onClick={() => setIsAdding(true)}
            sx={{
              bgcolor: purple[500],
              color: grey[100],
              borderColor: purple[500],
              borderRadius: 3,
            }}
          >
            Add new list
          </Button>
        )}
      </Box>
    </Box>
  );
}
