import { createRoot } from 'react-dom/client'
import { I18nProvider } from './lib/i18n'
import { UIProvider } from './lib/ui'
import App from './App'
import './styles/global.css'

createRoot(document.getElementById('root')).render(
  <I18nProvider>
    <UIProvider>
      <App />
    </UIProvider>
  </I18nProvider>
)
