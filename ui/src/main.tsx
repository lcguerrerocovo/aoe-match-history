import ReactDOM from 'react-dom/client'
import App from './App'
import { LandingPage } from './components/LandingPage'
import { MatchPage } from './components/MatchPage'
import { LivePage } from './components/LivePage'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { CustomThemeProvider } from './theme/ThemeProvider'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <CustomThemeProvider>
    <BrowserRouter>
      <Routes>
        <Route path="/profile_id/:profileId" element={<App />} />
        <Route path="/match/:matchId" element={<MatchPage />} />
        <Route path="/live" element={<LivePage />} />
        <Route path="/" element={<LandingPage />} />
      </Routes>
    </BrowserRouter>
  </CustomThemeProvider>
)
