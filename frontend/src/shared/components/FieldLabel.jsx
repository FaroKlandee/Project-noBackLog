/**
 * @file FieldLabel.jsx
 * @description An uppercase, icon-prefixed section label (e.g. "TIME ESTIMATE")
 * used above each section of the card detail dialog. Shared so feature modules
 * that contribute a section (cards, timeLogs) render identical headings.
 *
 * Given `htmlFor`, it renders as a real `<label>` so the field it heads gets
 * that text as its accessible name; without it, it stays a plain heading (for
 * sections, like time tracking, that have no single input to label).
 */

import { Typography } from '@mui/material';

/**
 * @component
 * @param {Object}          props
 * @param {React.ReactNode} props.icon     - Small leading icon.
 * @param {React.ReactNode} props.children - The label text.
 * @param {string}          [props.htmlFor] - The `id` of the input this labels.
 * @returns {JSX.Element} The rendered label.
 */
export default function FieldLabel({ icon, children, htmlFor }) {
	const labelProps = htmlFor ? { component: 'label', htmlFor } : {};

	return (
		<Typography
			variant="overline"
			{...labelProps}
			sx={{
				display: 'flex',
				alignItems: 'center',
				gap: 0.5,
				color: 'text.secondary',
				fontWeight: 700,
				letterSpacing: '0.05em',
				lineHeight: 1.4,
			}}
		>
			{icon}
			{children}
		</Typography>
	);
}
