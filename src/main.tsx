import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import { store } from '@/app/store';
import { queryClient } from '@/app/queryClient';
import { ToastViewport } from '@/components/ui/Toast';
import App from './App';
import './index.css';

/**
 * Application entry point: Redux (auth/UI state) + React Query (server cache)
 * + React Router wrap everything, and the toast viewport sits at the root so
 * any page can raise notifications.
 */
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <App />
          <ToastViewport />
        </BrowserRouter>
      </QueryClientProvider>
    </Provider>
  </StrictMode>,
);
