/**
 * @file main.jsx
 * @description Application entry point for the nobacklog frontend.
 *
 * This file is responsible for bootstrapping the React application. It:
 *  - Locates the HTML mount point (`#root`) injected by index.html
 *  - Constructs the global MUI theme
 *  - Wraps the entire app in React StrictMode for development warnings
 *  - Provides the MUI ThemeProvider and CssBaseline for consistent styling
 *  - Connects the client-side router via RouterProvider
 *
 * This module is loaded as an ES module directly by Vite (see index.html).
 */

/*
 * StrictMode is a React development tool that activates additional checks and
 * warnings for its descendant tree. It renders components twice (in dev only)
 * to detect side-effects, and warns about deprecated API usage. Has no visual
 * output and zero impact on the production build.
 */
import { StrictMode } from 'react'

/*
 * ReactDOM/client is the React 18+ API for mounting a React tree onto a real
 * DOM node. `createRoot` replaces the legacy `ReactDOM.render` and enables
 * concurrent rendering features introduced in React 18.
 */
import ReactDOM from "react-dom/client"

/*
 * MUI (Material UI) imports:
 *   ThemeProvider - Context provider that makes the custom `theme` object
 *                   available to every MUI component in the subtree.
 *   createTheme   - Factory function that merges a partial theme config with
 *                   MUI's default theme, producing a complete theme object.
 *   CssBaseline   - Injects a normalisation stylesheet (similar to normalize.css)
 *                   that removes browser inconsistencies (margin resets, box-sizing,
 *                   font smoothing, etc.) so MUI components render predictably.
 */
import { ThemeProvider, createTheme, CssBaseline } from '@mui/material'

/*
 * RouterProvider is the top-level component required by React Router v7's
 * data router APIs. It receives the pre-built `router` object and renders
 * whichever route element matches the current URL, handling all navigation
 * state internally.
 */
import { RouterProvider } from 'react-router/dom'

/*
 * The application's pre-configured browser router instance, defined in
 * routes.jsx. It contains the full route hierarchy for the nobacklog app.
 */
import { router } from './routes'

/*
 * DOM Mount Point
 *
 * Locate the `<div id="root">` element declared in index.html. This is the
 * single DOM node that React will manage; everything rendered by the app will
 * be inserted here. If the element is missing the app will fail to mount.
 */
const root = document.getElementById("root");

/**
 * Application-wide MUI theme.
 *
 * `createTheme` accepts a partial theme configuration and deeply merges it
 * with MUI's built-in defaults, so only the values that deviate from the
 * defaults need to be specified here.
 *
 * Current overrides:
 *  - `palette.mode: 'light'`  — Selects the light colour scheme. MUI uses this
 *    flag to derive appropriate default colours for backgrounds, text, dividers,
 *    and component states across the whole design system.
 *  - `palette.primary.main: '#1976d2'` — The primary brand colour (a standard
 *    Material Design blue). MUI automatically generates lighter (`light`) and
 *    darker (`dark`) tonal variants, as well as a `contrastText` colour, from
 *    this single hex value.
 *
 * The resulting `theme` object is passed to `ThemeProvider` so that every MUI
 * component in the tree can read these values via the `useTheme` hook or the
 * `sx` prop without needing explicit colour props.
 */
const theme = createTheme({
  palette: {
    /* Opt into the light colour scheme (as opposed to 'dark'). */
    mode: 'light',
    primary: {
      /* Primary action colour used for buttons, links, focused inputs, etc. */
      main: '#1976d2',
    },
  },
})

/*
 * Application Render
 *
 * `ReactDOM.createRoot` initialises a React root attached to the `#root` DOM
 * node, enabling React 18's concurrent mode. Calling `.render()` on the root
 * kicks off the first synchronous render of the component tree.
 */
ReactDOM.createRoot(root).render(
  /**
   * StrictMode wraps the entire application.
   * In development it will:
   *   - Double-invoke render functions and state initialisers to surface
   *     impure code with unintended side-effects.
   *   - Warn about usage of deprecated React lifecycle methods and APIs.
   * None of this behaviour occurs in production builds.
   */
  <StrictMode>
    {/*
      * ThemeProvider injects the custom `theme` object into React context,
      * making it accessible to all MUI components in the subtree without
      * prop-drilling. Any component can call `useTheme()` to read the values.
      */}
    <ThemeProvider theme={theme}>
      {/*
        * CssBaseline applies a global CSS reset/normalisation stylesheet.
        * It must be rendered inside ThemeProvider so it can read theme values
        * (e.g. background colour in dark mode). Placing it near the top of the
        * tree ensures the reset styles are applied before any component renders.
        */}
      <CssBaseline/>
      {/*
        * RouterProvider is the single integration point between React and the
        * React Router data router. It receives the `router` instance (built in
        * routes.jsx) and renders the matching page component for the current
        * URL. All navigation-aware hooks (`useNavigate`, `useParams`, etc.)
        * must be used within this provider.
        */}
      <RouterProvider router={router}/>
    </ThemeProvider>
  </StrictMode>,
)