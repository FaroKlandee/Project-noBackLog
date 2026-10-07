/**
 * @file LoadError.jsx
 * @description Shared error banner for a failed *load* (as opposed to a failed
 * mutation), with a Retry action.
 *
 * Used wherever a feature's initial fetch can fail independently of the rest
 * of the page — the boards grid, the board header, the list columns and the
 * board's cards — so each one names what failed and can be retried on its own
 * instead of the whole page collapsing into one generic banner.
 *
 * Mutation errors keep using a plain dismissible `Alert`: there's nothing to
 * retry there, the user just repeats the action.
 */

import { Alert, Button } from '@mui/material';

/**
 * LoadError component.
 *
 * @component
 * @param {Object}   props
 * @param {string}   props.title   - What failed to load, e.g. "Couldn't load lists".
 * @param {string}   [props.message] - The underlying error message, shown under the title.
 * @param {Function} [props.onRetry] - Re-runs the failed fetch. The Retry
 *   button is omitted when not given.
 * @param {Object}   [props.sx]    - Extra styles merged onto the Alert.
 * @returns {JSX.Element}
 */
export default function LoadError({ title, message, onRetry, sx }) {
	return (
		<Alert
			severity="error"
			action={onRetry && (
				<Button color="inherit" size="small" onClick={onRetry}>
					Retry
				</Button>
			)}
			sx={sx}
		>
			<strong>{title}</strong>
			{message && <><br />{message}</>}
		</Alert>
	);
}
