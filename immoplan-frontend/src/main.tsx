import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClient } from './lib/queryClient';
import { SocketProvider } from './lib/socket';
import { ToastProvider } from './components/ui/Toast';
import App from './App';
import { ErrorBoundary } from './components/ErrorBoundary';
import './lib/i18n';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <SocketProvider>
          <ToastProvider>
            <App />
          </ToastProvider>
        </SocketProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  </React.StrictMode>
);
