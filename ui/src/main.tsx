import ReactDOM from 'react-dom/client'
import App from './App'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <BrowserRouter>
    <Routes>
      <Route path="/profile_id/:profileId" element={<App />} />
      <Route path="/" element={<Navigate to="/profile_id/4764337" replace />} />
    </Routes>
  </BrowserRouter>
)
