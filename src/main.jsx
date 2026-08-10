import { createRoot } from 'react-dom/client'
import { installCompat } from './lib/compat'
import { I18nProvider } from './lib/i18n'
import { UIProvider } from './lib/ui'
import App from './App'
import './styles/global.css'

// Antes de qualquer coisa tocar o pdf.js.
installCompat()

createRoot(document.getElementById('root')).render(
  <I18nProvider>
    <UIProvider>
      <App />
    </UIProvider>
  </I18nProvider>
)
