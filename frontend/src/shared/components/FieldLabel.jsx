/**
 * @file FieldLabel.jsx
 * @description An uppercase, icon-prefixed section label (e.g. "TIME ESTIMATE")
 * used above each section of the card detail dialog. Shared so feature modules
 * that contribute a section (cards, timeLogs) render identical headings.
 */

import { Typography } from '@mui/material';

/**
 * @component
 * @param {Object}          props
 * @param {React.ReactNode} props.icon     - Small leading icon.
 * @param {React.ReactNode} props.children - The label text.
 * @returns {JSX.Element} The rendered label.
 */
export default function FieldLabel({ icon, children }) {
	return (
		<Typography
			variant="overline"
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
