import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ApplicationRoot from './app/ApplicationRoot'
import { followSystemColorMode } from './features/theme/model'
import '@fontsource-variable/estedad'
import '@fontsource/lalezar/arabic-400.css'
import '@fontsource/lalezar/latin-400.css'
import './index.css'
import './styles/experience.css'

const stopFollowingColorMode = followSystemColorMode()
if (import.meta.hot) import.meta.hot.dispose(stopFollowingColorMode)

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
)
