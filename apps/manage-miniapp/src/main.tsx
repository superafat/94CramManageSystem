import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ToastProviderEnhanced } from './components/Toast';
import { OfflineProvider } from './hooks/useOffline';

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').then(
      registration => {
        console.log('SW registered:', registration.scope);
      },
      error => {
        console.log('SW registration failed:', error);
      }
    );
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <ToastProviderEnhanced>
        <OfflineProvider>
          <App />
        </OfflineProvider>
      </ToastProviderEnhanced>
    </ErrorBoundary>
  </React.StrictMode>
);
