import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import Boards from '../features/boards/components/Boards';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2',
    },
  },
})

function App() {
  return (
    <ThemeProvider theme={theme}>
			<CssBaseline />
      <Boards />
    </ThemeProvider>
  )
}

export default App
