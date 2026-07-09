'use client';

import { QueryProvider } from './QueryProvider';
import { AuthProvider } from './AuthProvider';
import { ToastProvider } from './ToastProvider';

interface ProvidersProps {
  children: React.ReactNode;
}

/**
 * Combined providers wrapper.
 * Wraps the entire application with all required context providers.
 * Order matters:
 * 1. QueryProvider — must be outermost for data fetching
 * 2. AuthProvider — depends on QueryProvider for auth queries
 * 3. ToastProvider — independent, can be anywhere
 */
export function Providers({ children }: ProvidersProps) {
  return (
    <QueryProvider>
      <AuthProvider>
        <ToastProvider>{children}</ToastProvider>
      </AuthProvider>
    </QueryProvider>
  );
}

export default Providers;
