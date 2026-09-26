import { QueryClient } from '@tanstack/react-query';

/**
 * React Query settings tuned for a small school network:
 * data stays fresh for a minute, one retry, no refetch storm on tab focus.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
