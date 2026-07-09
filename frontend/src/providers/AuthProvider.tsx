'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/apiClient';

// ─── Types ────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  orgId: string | null;
  language: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

export interface AuthContextType {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────
const AuthContext = createContext<AuthContextType | null>(null);

// ─── Provider ─────────────────────────────────────────────
interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // ─── Fetch current user on mount ──────────────────────
  const fetchCurrentUser = useCallback(async () => {
    try {
      const response = await apiClient.get<{
        success: boolean;
        data: AuthUser;
      }>('/auth/me');

      if (response.data.success) {
        setUser(response.data.data);
      }
    } catch {
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCurrentUser();
  }, [fetchCurrentUser]);

  // ─── Login ────────────────────────────────────────────
  const login = useCallback(
    async (email: string, password: string) => {
      const response = await apiClient.post<{
        success: boolean;
        data: {
          user: AuthUser;
          accessToken: string;
        };
      }>('/auth/login', { email, password });

      if (response.data.success) {
        setUser(response.data.data.user);

        // Store access token in memory
        apiClient.defaults.headers.common['Authorization'] =
          `Bearer ${response.data.data.accessToken}`;

        // Redirect based on role
        router.push('/dashboard');
      }
    },
    [router],
  );

  // ─── Logout ───────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await apiClient.post('/auth/logout');
    } catch {
      // Ignore logout errors
    } finally {
      setUser(null);
      delete apiClient.defaults.headers.common['Authorization'];
      router.push('/login');
    }
  }, [router]);

  // ─── Refresh user data ────────────────────────────────
  const refreshUser = useCallback(async () => {
    await fetchCurrentUser();
  }, [fetchCurrentUser]);

  // ─── Set up token refresh interceptor ────────────────
  useEffect(() => {
    const interceptorId = apiClient.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        // If 401 and not already retrying
        if (
          error.response?.status === 401 &&
          !originalRequest._retry &&
          !originalRequest.url?.includes('/auth/login') &&
          !originalRequest.url?.includes('/auth/refresh')
        ) {
          originalRequest._retry = true;

          try {
            // Attempt token refresh
            const refreshResponse = await apiClient.post<{
              success: boolean;
              data: { accessToken: string };
            }>('/auth/refresh');

            if (refreshResponse.data.success) {
              const newToken = refreshResponse.data.data.accessToken;

              // Update token in headers
              apiClient.defaults.headers.common['Authorization'] =
                `Bearer ${newToken}`;
              originalRequest.headers['Authorization'] = `Bearer ${newToken}`;

              // Retry original request
              return apiClient(originalRequest);
            }
          } catch {
            // Refresh failed — logout user
            setUser(null);
            delete apiClient.defaults.headers.common['Authorization'];
            router.push('/login');
          }
        }

        return Promise.reject(error);
      },
    );

    return () => {
      apiClient.interceptors.response.eject(interceptorId);
    };
  }, [router]);

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated: !!user,
    login,
    logout,
    refreshUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error(
      'useAuth must be used within an AuthProvider. ' +
        'Make sure your component is wrapped in <AuthProvider>.',
    );
  }
  return context;
}

export default AuthProvider;
