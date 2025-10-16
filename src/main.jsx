import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

// Importar Bootstrap JS para funcionalidad de componentes
import 'bootstrap/dist/js/bootstrap.bundle.min.js';

// Importar funciones de debugging para que estén disponibles globalmente
import './services/api.js'

// Importar tester de endpoints
import './utils/endpointTester.js'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
