/**
 * Punto de entrada del frontend: monta la aplicación React dentro del <div id="root"> de index.html
 * y carga los estilos globales (Tailwind y los colores de los temas).
 */
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
