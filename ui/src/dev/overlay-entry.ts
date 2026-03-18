import { createElement } from 'react'
import { createRoot } from 'react-dom/client'
import { DevOverlay } from './DevOverlay'

const container = document.createElement('div')
container.id = 'dev-overlay-root'
document.body.appendChild(container)
createRoot(container).render(createElement(DevOverlay))
