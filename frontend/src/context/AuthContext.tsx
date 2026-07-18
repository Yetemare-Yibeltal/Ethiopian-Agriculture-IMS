'use client';

import {
  useAuth as useAuthProvider,
  type AuthUser,
  type AuthContextType,
} from '@/providers/AuthProvider';

export type { AuthUser, AuthContextType };

export interface AuthState {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isFieldAgent: boolean;
  isNgoPartner: boolean;
  isViewer: boolean;
}

export function useAuth(): AuthContextType {
  return useAuthProvider();
}

export function useCurrentUser(): AuthUser | null {
  const { user } = useAuthProvider();
  return user;
}

export function useIsAuthenticated(): boolean {
  const { isAuthenticated } = useAuthProvider();
  return isAuthenticated;
}

export function useUserRole(): string | null {
  const { user } = useAuthProvider();
  return user?.role ?? null;
}

export function useUserOrgId(): string | null {
  const { user } = useAuthProvider();
  return user?.orgId ?? null;
}

export function useAuthLoading(): boolean {
  const { isLoading } = useAuthProvider();
  return isLoading;
}

export function useRoleFlags(): {
  isSuperAdmin: boolean;
  isAdmin: boolean;
  isFieldAgent: boolean;
  isNgoPartner: boolean;
  isViewer: boolean;
} {
  const { user } = useAuthProvider();
  const role = user?.role;

  return {
    isSuperAdmin: role === 'SUPER_ADMIN',
    isAdmin: role === 'ADMIN' || role === 'SUPER_ADMIN',
    isFieldAgent: role === 'FIELD_AGENT',
    isNgoPartner: role === 'NGO_PARTNER',
    isViewer: role === 'VIEWER',
  };
}

export function useUserDisplay(): {
  displayName: string;
  initials: string;
  email: string;
  role: string;
  language: string;
} {
  const { user } = useAuthProvider();

  const displayName = user?.name || user?.email || 'User';
  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  return {
    displayName,
    initials,
    email: user?.email || '',
    role: user?.role || '',
    language: user?.language || 'en',
  };
}

export default useAuth;
