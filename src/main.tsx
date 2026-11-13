import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ApplicationRoot from './app/ApplicationRoot'
import { loadTitleFont } from './app/titleFont'
import {
  applyThemeToDocument,
  readStoredColorMode,
  readStoredThemePreset,
} from './features/theme/model'
import '@fontsource-variable/estedad'
import '@fontsource/lalezar/arabic-400.css'
import '@fontsource/lalezar/latin-400.css'
import './index.css'
import './styles/experience.css'

applyThemeToDocument(readStoredThemePreset(), readStoredColorMode())
loadTitleFont()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
)
