/**
 * @file theme.js
 * @description Global MUI theme for the nobacklog frontend.
 *
 * All colours are defined here as named palette tokens. Components reference
 * these tokens via the `sx` prop (e.g. `bgcolor: 'background.default'`) rather
 * than hardcoding hex values inline — a single change here propagates everywhere.
 *
 * Colour roles:
 *
 *   background.default   — page canvas (deepest layer)
 *   background.paper     — elevated surfaces: columns, menus, card items
 *   background.surface   — deepest inset surfaces: column bg, text inputs
 *
 *   primary.main         — brand violet; primary action buttons, focus rings
 *   primary.dark         — darker violet; button hover state
 *
 *   secondary.main       — muted lavender; icons, secondary text, borders
 *
 *   text.primary         — primary readable text (#fff in dark mode)
 *   text.secondary       — dimmed/muted text (empty states, labels)
 *
 *   divider              — border colour used on columns, cards, menus
 *   border.focus         — input fieldset default border
 *   border.hover         — input/card hover border
 *   border.active        — input hover fieldset (matches primary.main)
 *
 *   error.main           — destructive actions (delete), high-priority text
 *
 *   priority.low.bg/text    — Low priority chip colours
 *   priority.medium.bg/text — Medium priority chip colours
 *   priority.high.bg/text   — High priority chip colours
 *
 *   action.selected      — selected MenuItem background
 *   action.selectedHover — selected MenuItem hover background
 *   action.hover         — transparent button hover overlay
 *
 *   badge.bg             — card count pill background
 *   badge.text           — card count pill text
 */

/*
 * Import
 * ───────────────────────────────────────────────────────────────────────────
 * createTheme — MUI factory function that merges a partial config object with
 *               MUI's default theme, producing a complete theme object.
 */
import { createTheme } from '@mui/material';

/**
 * @constant {import('@mui/material').Theme} theme
 *
 * The application's single MUI theme instance. Passed to `<ThemeProvider>` in
 * main.jsx so every MUI component in the tree can read it via `useTheme()` or
 * the `sx` prop's theme-aware shorthand strings.
 */
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

		/*
		 * Custom border tokens — used for input fieldsets and card hover states.
		 * Accessed via theme.palette.border.* or sx string paths where MUI
		 * supports nested palette keys.
		 */
		border: {
			focus:  '#3D3560',     // input fieldset default
			hover:  '#4B3F8A',     // input/card hover border
			active: '#7C3AED',     // input hover fieldset (matches primary.main)
		},

		/*
		 * Priority chip colours — each priority level gets a distinct
		 * background and text colour pair used by the Chip component in Cards.jsx.
		 */
		priority: {
			low:    { bg: '#0D2420', text: '#34D399' },
			medium: { bg: '#2D2210', text: '#FBBF24' },
			high:   { bg: '#3B1219', text: '#F87171' },
		},

		action: {
			selected:      '#3D2F6B',              // selected MenuItem
			selectedHover: '#4A3880',              // selected MenuItem on hover
			hover:         'rgba(124,107,174,0.08)', // transparent button hover
		},

		/*
		 * Badge tokens — used by the card-count pill rendered in ListColumn's
		 * column header.
		 */
		badge: {
			bg:   '#1E1B3A',
			text: '#7C6BAE',
		},
	},

	components: {
		/*
		 * MuiMenu override
		 * ────────────────
		 * Makes every MUI Menu popover (Select dropdowns, icon menus) default to
		 * the `background.paper` surface so no component needs to set it manually
		 * via slotProps or MenuProps.
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
		 * MuiMenuItem override
		 * ─────────────────────
		 * Ensures every MenuItem uses white text and theme-consistent
		 * hover / selected states by default, so individual usage sites do not
		 * need to re-declare these styles.
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
