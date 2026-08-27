import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import ApplicationRoot from './app/ApplicationRoot'
import {
  applyThemeToDocument,
  readStoredColorMode,
  readStoredThemePreset,
} from './features/theme/model'
import './index.css'

applyThemeToDocument(readStoredThemePreset(), readStoredColorMode())

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ApplicationRoot />
  </StrictMode>,
)
