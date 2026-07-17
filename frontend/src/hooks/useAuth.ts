'use client';

import { useCallback } from 'react';
import { useAuth as useAuthContext } from '@/providers/AuthProvider';

// ─── User Role Constants ──────────────────────────────────
export const UserRole = {
  SUPER_ADMIN: 'SUPER_ADMIN',
  ADMIN: 'ADMIN',
  FIELD_AGENT: 'FIELD_AGENT',
  NGO_PARTNER: 'NGO_PARTNER',
  VIEWER: 'VIEWER',
} as const;

export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];

// ─── Permission Definitions ───────────────────────────────
const rolePermissions: Record<string, string[]> = {
  SUPER_ADMIN: [
    'manage_users',
    'manage_organizations',
    'manage_farmers',
    'manage_yields',
    'manage_distributions',
    'view_analytics',
    'view_audit_logs',
    'manage_system_settings',
    'view_map',
    'export_data',
    'broadcast_notifications',
    'delete_records',
    'manage_zones',
    'block_ips',
    'view_all_orgs',
  ],
  ADMIN: [
    'manage_organizations',
    'manage_farmers',
    'manage_yields',
    'manage_distributions',
    'view_analytics',
    'view_audit_logs',
    'view_map',
    'export_data',
    'manage_zones',
    'view_all_orgs',
  ],
  FIELD_AGENT: [
    'register_farmers',
    'edit_own_farmers',
    'submit_yields',
    'record_distributions',
    'view_map',
    'view_own_submissions',
  ],
  NGO_PARTNER: [
    'record_distributions',
    'view_own_distributions',
    'view_coverage_gaps',
    'view_analytics',
    'view_map',
    'export_data',
    'view_own_org',
  ],
  VIEWER: [
    'view_farmers',
    'view_yields',
    'view_distributions',
    'view_analytics',
    'view_map',
    'export_data',
    'view_all_orgs',
  ],
};

// ─── useAuth Hook ─────────────────────────────────────────
export function useAuth() {
  const context = useAuthContext();

  const { user, isLoading, isAuthenticated, login, logout, refreshUser } =
    context;

  // ─── Role Checks ────────────────────────────────────────
  const isSuperAdmin = user?.role === UserRole.SUPER_ADMIN;
  const isAdmin =
    user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const isFieldAgent = user?.role === UserRole.FIELD_AGENT;
  const isNgoPartner = user?.role === UserRole.NGO_PARTNER;
  const isViewer = user?.role === UserRole.VIEWER;

  // ─── Permission Check ────────────────────────────────────
  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user?.role) {
        return false;
      }
      const permissions = rolePermissions[user.role] || [];
      return permissions.includes(permission);
    },
    [user?.role],
  );

  const hasRole = useCallback(
    (role: UserRoleType | UserRoleType[]): boolean => {
      if (!user?.role) {
        return false;
      }
      if (Array.isArray(role)) {
        return role.includes(user.role as UserRoleType);
      }
      return user.role === role;
    },
    [user?.role],
  );

  const hasAnyRole = useCallback(
    (...roles: UserRoleType[]): boolean => {
      if (!user?.role) {
        return false;
      }
      return roles.includes(user.role as UserRoleType);
    },
    [user?.role],
  );

  // ─── Feature Permission Helpers ──────────────────────────
  const canManageFarmers =
    hasPermission('manage_farmers') || hasPermission('register_farmers');
  const canRegisterFarmers =
    hasPermission('register_farmers') || hasPermission('manage_farmers');
  const canEditFarmers =
    hasPermission('manage_farmers') || hasPermission('edit_own_farmers');
  const canDeleteFarmers = hasPermission('delete_records');

  const canSubmitYields =
    hasPermission('submit_yields') || hasPermission('manage_yields');
  const canManageYields = hasPermission('manage_yields');
  const canDeleteYields = hasPermission('delete_records');

  const canRecordDistributions =
    hasPermission('record_distributions') ||
    hasPermission('manage_distributions');
  const canManageDistributions = hasPermission('manage_distributions');
  const canViewCoverageGaps =
    hasPermission('view_coverage_gaps') ||
    hasPermission('manage_distributions');

  const canManageUsers = hasPermission('manage_users');
  const canManageOrganizations = hasPermission('manage_organizations');
  const canViewAllOrganizations = hasPermission('view_all_orgs');
  const canViewOwnOrganization =
    hasPermission('view_own_org') || hasPermission('view_all_orgs');

  const canViewAnalytics = hasPermission('view_analytics');
  const canViewMap = hasPermission('view_map');
  const canExportData = hasPermission('export_data');
  const canViewAuditLogs = hasPermission('view_audit_logs');
  const canManageSystemSettings = hasPermission('manage_system_settings');
  const canManageZones = hasPermission('manage_zones');
  const canBroadcastNotifications = hasPermission('broadcast_notifications');
  const canBlockIPs = hasPermission('block_ips');

  // ─── Organization Context ────────────────────────────────
  const userOrgId = user?.orgId ?? null;
  const isOrgMember = !!userOrgId;

  // ─── Can access a specific resource ─────────────────────
  const canAccessOrganization = useCallback(
    (orgId: string): boolean => {
      if (isSuperAdmin || isAdmin) {
        return true;
      }
      if (isNgoPartner) {
        return userOrgId === orgId;
      }
      return false;
    },
    [isSuperAdmin, isAdmin, isNgoPartner, userOrgId],
  );

  const canEditFarmer = useCallback(
    (registeredById: string): boolean => {
      if (isSuperAdmin || isAdmin) {
        return true;
      }
      if (isFieldAgent) {
        return user?.id === registeredById;
      }
      return false;
    },
    [isSuperAdmin, isAdmin, isFieldAgent, user?.id],
  );

  const canDeleteFarmer = useCallback(
    (_farmerId: string): boolean => {
      return isSuperAdmin;
    },
    [isSuperAdmin],
  );

  const canEditYield = useCallback(
    (submittedById: string): boolean => {
      if (isSuperAdmin || isAdmin) {
        return true;
      }
      if (isFieldAgent) {
        return user?.id === submittedById;
      }
      return false;
    },
    [isSuperAdmin, isAdmin, isFieldAgent, user?.id],
  );

  // ─── Dashboard redirect based on role ───────────────────
  const getDashboardPath = useCallback((): string => {
    switch (user?.role) {
      case UserRole.SUPER_ADMIN:
      case UserRole.ADMIN:
        return '/dashboard';
      case UserRole.FIELD_AGENT:
        return '/farmers';
      case UserRole.NGO_PARTNER:
        return '/inputs';
      case UserRole.VIEWER:
        return '/dashboard';
      default:
        return '/dashboard';
    }
  }, [user?.role]);

  // ─── Get user display name ───────────────────────────────
  const displayName = user?.name || user?.email || 'User';
  const userInitials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .substring(0, 2)
    : 'U';

  return {
    // ── User Data ────────────────────────────────────────
    user,
    isLoading,
    isAuthenticated,
    displayName,
    userInitials,
    userOrgId,
    isOrgMember,

    // ── Auth Actions ─────────────────────────────────────
    login,
    logout,
    refreshUser,

    // ── Role Checks ──────────────────────────────────────
    isSuperAdmin,
    isAdmin,
    isFieldAgent,
    isNgoPartner,
    isViewer,

    // ── Permission Helpers ───────────────────────────────
    hasPermission,
    hasRole,
    hasAnyRole,

    // ── Farmer Permissions ───────────────────────────────
    canManageFarmers,
    canRegisterFarmers,
    canEditFarmers,
    canDeleteFarmers,
    canEditFarmer,
    canDeleteFarmer,

    // ── Yield Permissions ────────────────────────────────
    canSubmitYields,
    canManageYields,
    canDeleteYields,
    canEditYield,

    // ── Distribution Permissions ─────────────────────────
    canRecordDistributions,
    canManageDistributions,
    canViewCoverageGaps,

    // ── Organization Permissions ─────────────────────────
    canManageOrganizations,
    canViewAllOrganizations,
    canViewOwnOrganization,
    canAccessOrganization,

    // ── User Management Permissions ──────────────────────
    canManageUsers,

    // ── System Permissions ───────────────────────────────
    canViewAnalytics,
    canViewMap,
    canExportData,
    canViewAuditLogs,
    canManageSystemSettings,
    canManageZones,
    canBroadcastNotifications,
    canBlockIPs,

    // ── Navigation ───────────────────────────────────────
    getDashboardPath,
  };
}

export default useAuth;
