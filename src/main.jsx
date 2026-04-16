import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

// --- Redirect loop breaker (runs before React mounts) ---
// If the URL contains a from_url that itself contains /login, we're in a loop.
// Strip the entire query string and redirect clean to /.
;(function breakRedirectLoop() {
  try {
    const url = new URL(window.location.href);
    const isLoginPath = url.pathname.includes('/login');
    if (!isLoginPath) return;

    const fromUrl = url.searchParams.get('from_url');
    if (!fromUrl) return;

    // Fully decode the from_url to check for nested /login
    let decoded = fromUrl;
    for (let i = 0; i < 20; i++) {
      const next = decodeURIComponent(decoded);
      if (next === decoded) break;
      decoded = next;
    }

    // If the decoded from_url still points to /login, we're in a loop
    if (decoded.includes('/login')) {
      try {
        localStorage.removeItem('base44_from_url');
        localStorage.removeItem('base44_server_url');
      } catch(_) {}
      // Replace with clean login URL — no from_url param
      window.location.replace('/login');
    }
  } catch(_) {}
})();

ReactDOM.createRoot(document.getElementById('root')).render(
  // <React.StrictMode>
  <App />
  // </React.StrictMode>,
)

if (import.meta.hot) {
  import.meta.hot.on('vite:beforeUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:beforeUpdate' }, '*');
  });
  import.meta.hot.on('vite:afterUpdate', () => {
    window.parent?.postMessage({ type: 'sandbox:afterUpdate' }, '*');
  });
}