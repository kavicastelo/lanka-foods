import React from 'react'
import ReactDOM from 'react-dom/client'
import App from '@/App.jsx'
import '@/index.css'

window.addEventListener('error', (event) => {
    if (event?.message && typeof event.message === 'string' && event.message.includes("reading 'startTime'")) {
        event.preventDefault();
        event.stopPropagation();
    }
});

// Register PWA ServiceWorker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js').then((reg) => {
            console.log('[PWA] ServiceWorker active with scope:', reg.scope);
        }).catch((err) => {
            console.warn('[PWA] ServiceWorker registration failed:', err);
        });
    });
}

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
