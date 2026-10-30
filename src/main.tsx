import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { reloadForNewVersion } from '@/lib/lazyPage'

// 새 버전 배포 뒤 예전 조각 파일(스크립트·CSS)을 못 받으면 한 번 새로고침해 새 버전을 받는다.
window.addEventListener('vite:preloadError', (event) => {
  if (reloadForNewVersion()) event.preventDefault()
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
