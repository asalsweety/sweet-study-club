import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ApplicationRoot from './app/ApplicationRoot'
import { followSystemColorMode } from './features/theme/model'
import '@fontsource-variable/estedad'
import '@fontsource/lalezar/arabic-400.css'
import '@fontsource/lalezar/latin-400.css'
import './index.css'
import './styles/experience.css'

// Fallback for when the edge "Always Use HTTPS" rule is off: secure cookies
// cannot work over plain http, so move to https before anything loads.
if (import.meta.env.PROD && location.protocol === 'http:' && !/^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname)) {
  location.replace(`https://${location.host}${location.pathname}${location.search}${location.hash}`)
}

const stopFollowingColorMode = followSystemColorMode()
if (import.meta.hot) import.meta.hot.dispose(stopFollowingColorMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
)
