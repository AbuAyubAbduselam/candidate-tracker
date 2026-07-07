import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './lib/AuthContext'
import AuthGate from './components/AuthGate'
import { loadConfig } from './lib/config'

// Load runtime config (/config.json) before rendering so the agency
// connection is known on first paint. Always renders, even if it's missing.
loadConfig().finally(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <AuthProvider>
        <AuthGate>
          <App />
        </AuthGate>
      </AuthProvider>
    </StrictMode>,
  )
})
