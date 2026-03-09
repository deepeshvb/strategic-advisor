import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'

function showFallback(message: string, error?: unknown) {
  const root = document.getElementById('root')
  if (!root) return
  const errStr = error != null ? String(error) : ''
  root.innerHTML = `<div style="min-height:100vh;background:#111827;color:#fff;padding:24px;font-family:system-ui,sans-serif">
    <h1 style="color:#ef4444;margin:0 0 16px 0">Lobster Console</h1>
    <p style="margin:0 0 8px 0;color:#9ca3af">${message}</p>
    ${errStr ? `<pre style="background:#1f2937;padding:16px;border-radius:8px;overflow:auto;font-size:12px;margin-top:16px">${errStr.replace(/</g, '&lt;')}</pre>` : ''}
    <p style="margin-top:16px;color:#6b7280">Fallback: <a href="/config-simple.html" style="color:#22c55e">Use simple config page</a></p>
  </div>`
}

async function bootstrap() {
  const rootEl = document.getElementById('root')
  if (!rootEl) {
    document.body.innerHTML = '<div style="padding:24px;color:red">No root element found</div>'
    return
  }
  try {
    const { default: App } = await import('./App.tsx')
    ReactDOM.createRoot(rootEl).render(
      <React.StrictMode>
        <App />
      </React.StrictMode>,
    )
  } catch (err) {
    console.error('App failed to load:', err)
    showFallback('Failed to load app. Check console (F12) for details.', err)
  }
}

bootstrap()
