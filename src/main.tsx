import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import 'leaflet/dist/leaflet.css';

// Initialize Telegram WebApp safely if available
try {
  const tgWebApp = (window as any).Telegram?.WebApp;
  if (tgWebApp) {
    tgWebApp.ready?.();
    tgWebApp.expand?.();
  }
} catch (e) {
  console.warn("Telegram WebApp initialization notice:", e);
}

// Prevent unhandled promise rejections or webview errors from crashing the app
window.addEventListener("unhandledrejection", (event) => {
  console.warn("Unhandled promise rejection caught safely:", event.reason);
  event.preventDefault();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
