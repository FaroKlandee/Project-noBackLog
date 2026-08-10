/**
 * @file main.jsx
 * @description Application entry point for the nobacklog frontend.
 *
 * Bootstraps the React application by:
 *   - Locating the `#root` DOM node declared in index.html
 *   - Wrapping the tree in StrictMode for development-time checks
 *   - Providing the MUI ThemeProvider with the custom dark theme
 *   - Injecting CssBaseline for cross-browser style normalisation
 *   - Mounting the React Router RouterProvider with the app's route config
 *
 * Loaded as an ES module directly by Vite via the `<script type="module">` tag
 * in index.html.
 */

/*
 * Imports
 * ───────────────────────────────────────────────────────────────────────────
 * StrictMode      – React dev tool; double-invokes renders/effects to surface
 *                   impure code. No-op in production.
 * ReactDOM        – React 18+ DOM client; createRoot enables concurrent mode.
 * ThemeProvider   – MUI context provider; distributes the theme object to all
 *                   MUI components in the subtree.
 * CssBaseline     – MUI global CSS reset; removes browser inconsistencies
 *                   (margins, box-sizing, font-smoothing).
 * RouterProvider  – React Router v7 integration point; renders the route that
 *                   matches the current URL.
 * router          – Pre-built browser router instance (see routes.jsx).
 * theme           – Custom MUI dark theme (see theme.js).
 */
import { StrictMode } from 'react'
import ReactDOM from "react-dom/client"
import { ThemeProvider, CssBaseline } from '@mui/material'
import { RouterProvider } from 'react-router/dom'
import { router } from './routes'
import theme from './theme'

/*
 * DOM Mount Point
 * ───────────────────────────────────────────────────────────────────────────
 * Locate the `<div id="root">` element declared in index.html. React will
 * manage everything rendered inside this node. If the element is absent the
 * app will fail to mount.
 */
const root = document.getElementById("root");

/*
 * Application Render
 * ───────────────────────────────────────────────────────────────────────────
 * createRoot initialises a React 18 concurrent root attached to the #root
 * DOM node. Calling .render() kicks off the first synchronous render of the
 * component tree.
 *
 * Tree structure:
 *   StrictMode
 *     └─ ThemeProvider      (injects custom dark theme into MUI context)
 *          ├─ CssBaseline   (global CSS normalisation; reads theme bg colour)
 *          └─ RouterProvider (renders the matched route component)
 */
ReactDOM.createRoot(root).render(
  <StrictMode>
    {/*
      * ThemeProvider makes the custom `theme` object available to every MUI
      * component without prop-drilling. Any component can read it via useTheme().
      */}
    <ThemeProvider theme={theme}>
      {/*
        * CssBaseline must sit inside ThemeProvider so it can read the theme's
        * background colour when applying the dark-mode body style.
        */}
      <CssBaseline/>
      {/*
        * RouterProvider is the single integration point with React Router.
        * It receives the pre-built router and renders whichever page component
        * matches the current URL. All navigation hooks (useNavigate, useParams)
        * must be used within this provider.
        */}
      <RouterProvider router={router}/>
    </ThemeProvider>
  </StrictMode>,
)
