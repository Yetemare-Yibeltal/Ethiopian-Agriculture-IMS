'use client';

import { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

interface QueryProviderProps {
  children: React.ReactNode;
}

/**
 * React Query provider with optimized default configuration.
 *
 * Key settings:
 * - staleTime: 5 minutes — data stays fresh for 5 min before refetching
 * - gcTime: 10 minutes — unused data stays in cache for 10 min
 * - retry: 2 — failed requests retry twice before showing error
 * - refetchOnWindowFocus: false — no refetch when user switches tabs
 */
export function QueryProvider({ children }: QueryProviderProps) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // Data is considered fresh for 5 minutes
            staleTime: 5 * 60 * 1000,

            // Keep unused data in cache for 10 minutes
            gcTime: 10 * 60 * 1000,

            // Retry failed requests 2 times before showing error
            retry: 2,

            // Retry delay increases with each attempt
            retryDelay: (attemptIndex) =>
              Math.min(1000 * 2 ** attemptIndex, 30000),

            // Do not refetch when user switches browser tabs
            refetchOnWindowFocus: false,

            // Do not refetch when network reconnects
            // We handle this manually with offline sync
            refetchOnReconnect: false,

            // Do not refetch on component mount if data exists
            refetchOnMount: true,
          },
          mutations: {
            // Retry mutations once on failure
            retry: 1,

            // Retry delay for mutations
            retryDelay: 1000,
          },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      {children}
      {process.env.NODE_ENV === 'development' && (
        <ReactQueryDevtools
          initialIsOpen={false}
          buttonPosition="bottom-left"
        />
      )}
    </QueryClientProvider>
  );
}

export default QueryProvider;
