import ReactDOM from 'react-dom/client'
import App from './App'
import { LandingPage } from './components/LandingPage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { ChakraProvider } from '@chakra-ui/react'
import theme from './theme/theme'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <ChakraProvider theme={theme}>
    <BrowserRouter>
      <Routes>
        <Route path="/profile_id/:profileId" element={<App />} />
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  </ChakraProvider>
)
