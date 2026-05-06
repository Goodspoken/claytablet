import * as Sentry from '@sentry/react'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.tsx'
import { LanguageProvider } from './contexts/LanguageContext'
import { ThemeProvider } from './contexts/ThemeContext'

Sentry.init({
  dsn: 'https://8230bf82082299aeec3511216b19e0c5@o4511270760677376.ingest.de.sentry.io/4511293366534224',
  environment: import.meta.env.MODE,
  integrations: [
    Sentry.browserTracingIntegration(),
    Sentry.replayIntegration(),
  ],
  // Capture 10% of transactions for performance monitoring
  tracesSampleRate: 0.1,
  // Capture 10% of sessions for session replay
  replaysSessionSampleRate: 0.1,
  // Always capture replays for sessions with errors
  replaysOnErrorSampleRate: 1.0,
})


createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <App />
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
