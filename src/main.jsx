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

ReactDOM.createRoot(document.getElementById('root')).render(
    <App />
)
