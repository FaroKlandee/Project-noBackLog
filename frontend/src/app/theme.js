/**
 * @file theme.js
 * @description Global MUI theme for the nobacklog frontend.
 *
 * All colours used across the application are defined here as named tokens.
 * Components should reference these tokens via the `sx` prop's theme-aware
 * shorthands (e.g. `bgcolor: 'background.default'`) rather than hardcoding
 * hex values inline. This means a single change here propagates everywhere.
 *
 * Colour roles:
 *
 *   background.default  — page canvas (deepest layer)
 *   background.paper    — elevated surfaces: cards, columns, menus, inputs
 *   background.surface  — mid-level surfaces: card count badge, form boxes
 *   background.overlay  — subtle hover overlays on transparent buttons
 *
 *   primary.main        — brand violet; primary action buttons, focus rings
 *   primary.dark        — darker violet; button hover state
 *
 *   secondary.main      — muted lavender; icons, secondary text, borders
 *
 *   text.primary        — primary readable text (#fff in dark mode)
 *   text.secondary      — dimmed/muted text (empty states, labels)
 *
 *   divider             — border colour used on columns, cards, menus
 *   border.focus        — border colour on focused/hovered inputs
 *   border.hover        — border colour on hovered interactive elements
 *
 *   error.main          — destructive actions (delete), high-priority text
 *
 *   priority.low.bg     — Low priority chip background
 *   priority.low.text   — Low priority chip text
 *   priority.medium.bg  — Medium priority chip background
 *   priority.medium.text— Medium priority chip text
 *   priority.high.bg    — High priority chip background
 *   priority.high.text  — High priority chip text (same as error.main)
 *
 *   action.selected     — selected MenuItem background
 *   action.selectedHover— selected MenuItem hover background
 */

import { createTheme } from '@mui/material';

const theme = createTheme({
	palette: {
		mode: 'dark',

		background: {
			default:  '#0D0B1E',   // page canvas
			paper:    '#1C1A2E',   // elevated surfaces: columns, menus, cards
			surface:  '#12101F',   // deepest inset surfaces: column bg, text inputs
		},

		primary: {
			main: '#7C3AED',       // brand violet — buttons, focus rings
			dark: '#6D28D9',       // button hover
		},

		secondary: {
			main: '#7C6BAE',       // muted lavender — icons, secondary text
		},

		text: {
			primary:   '#ffffff',
			secondary: '#8B5CF6',  // empty-state labels
		},

		divider: '#2A2545',        // borders on columns, cards, menus

		error: {
			main: '#F87171',       // destructive actions, high-priority text
		},

		// Custom tokens — accessed via theme.palette.* or sx string paths
		// where MUI supports nested palette keys.
		border: {
			focus: '#3D3560',      // input fieldset default
			hover: '#4B3F8A',      // input/card hover border
			active: '#7C3AED',     // input hover fieldset (matches primary)
		},

		priority: {
			low:    { bg: '#0D2420', text: '#34D399' },
			medium: { bg: '#2D2210', text: '#FBBF24' },
			high:   { bg: '#3B1219', text: '#F87171' },
		},

		action: {
			selected:      '#3D2F6B',   // selected MenuItem
			selectedHover: '#4A3880',   // selected MenuItem on hover
			hover:         'rgba(124,107,174,0.08)', // transparent button hover
		},

		// Badge background (card count pill)
		badge: {
			bg:   '#1E1B3A',
			text: '#7C6BAE',
		},
	},

	components: {
		/*
		 * Make every MUI Menu popover (used by Select dropdowns and icon menus)
		 * default to the paper surface colour so no component needs to set it
		 * manually via slotProps or MenuProps.
		 */
		MuiMenu: {
			styleOverrides: {
				paper: ({ theme }) => ({
					backgroundColor: theme.palette.background.paper,
					border: `1px solid ${theme.palette.divider}`,
					borderRadius: 4,
				}),
				list: ({ theme }) => ({
					backgroundColor: theme.palette.background.paper,
				}),
			},
		},

		/*
		 * Style every MenuItem to use white text and theme-consistent
		 * hover/selected states by default.
		 */
		MuiMenuItem: {
			styleOverrides: {
				root: ({ theme }) => ({
					color: theme.palette.text.primary,
					'&:hover': {
						backgroundColor: theme.palette.divider,
					},
					'&.Mui-selected': {
						backgroundColor: theme.palette.action.selected,
						color: theme.palette.text.primary,
					},
					'&.Mui-selected:hover': {
						backgroundColor: theme.palette.action.selectedHover,
					},
				}),
			},
		},
	},
});

export default theme;
