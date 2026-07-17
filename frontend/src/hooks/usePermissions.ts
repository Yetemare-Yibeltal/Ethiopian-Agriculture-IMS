'use client';

import { useMemo } from 'react';
import { useAuth } from '@/providers/AuthProvider';

// ─── Permission Types ─────────────────────────────────────
export interface Permissions {
  // Farmer permissions
  canViewFarmers: boolean;
  canRegisterFarmers: boolean;
  canEditFarmers: boolean;
  canDeleteFarmers: boolean;
  canUploadFarmerPhoto: boolean;
  canGenerateFarmerQR: boolean;
  canCheckDuplicates: boolean;
  canChangeFarmerStatus: boolean;

  // Yield permissions
  canViewYields: boolean;
  canSubmitYields: boolean;
  canEditYields: boolean;
  canDeleteYields: boolean;
  canViewFoodSecurityAlerts: boolean;
  canViewYieldSummary: boolean;

  // Distribution permissions
  canViewDistributions: boolean;
  canRecordDistributions: boolean;
  canDeleteDistributions: boolean;
  canViewCoverageGaps: boolean;
  canViewDistributionStats: boolean;
  canDownloadDistributionReceipt: boolean;

  // Organization permissions
  canViewOrganizations: boolean;
  canCreateOrganizations: boolean;
  canEditOrganizations: boolean;
  canDeactivateOrganizations: boolean;
  canDeleteOrganizations: boolean;
  canViewOrgActivity: boolean;

  // User permissions
  canViewUsers: boolean;
  canCreateUsers: boolean;
  canEditUsers: boolean;
  canDeactivateUsers: boolean;
  canDeleteUsers: boolean;
  canResetUserPasswords: boolean;

  // Map permissions
  canViewMap: boolean;
  canViewMapHeatmap: boolean;
  canViewMapBoundaries: boolean;
  canCreateMapZones: boolean;
  canEditMapZones: boolean;
  canDeleteMapZones: boolean;

  // Analytics permissions
  canViewAnalytics: boolean;
  canViewRegionalYield: boolean;
  canViewSeasonComparison: boolean;
  canViewCropBreakdown: boolean;
  canViewNGOActivity: boolean;
  canViewFoodSecurityRisk: boolean;
  canViewAidEfficiency: boolean;

  // Export permissions
  canExportFarmers: boolean;
  canExportYields: boolean;
  canExportDistributions: boolean;
  canViewExportHistory: boolean;

  // Dashboard permissions
  canViewDashboard: boolean;
  canViewDashboardStats: boolean;
  canViewActivityFeed: boolean;
  canClearDashboardCache: boolean;

  // Notification permissions
  canViewNotifications: boolean;
  canBroadcastNotifications: boolean;
  canViewAllNotifications: boolean;

  // Audit permissions
  canViewAuditLogs: boolean;
  canViewAuditStats: boolean;
  canViewRecordHistory: boolean;

  // System permissions
  canViewSystemSettings: boolean;
  canEditSystemSettings: boolean;
  canManageIPBlocking: boolean;
}

// ─── Role-Permission Matrix ───────────────────────────────
const computePermissions = (role: string | undefined): Permissions => {
  const isSuperAdmin = role === 'SUPER_ADMIN';
  const isAdmin = role === 'ADMIN' || isSuperAdmin;
  const isFieldAgent = role === 'FIELD_AGENT';
  const isNgoPartner = role === 'NGO_PARTNER';
  const isViewer = role === 'VIEWER';
  const isAnyRole = !!role;

  return {
    // ── Farmer Permissions ──────────────────────────────
    canViewFarmers: isAnyRole,
    canRegisterFarmers: isAdmin || isFieldAgent,
    canEditFarmers: isAdmin || isFieldAgent,
    canDeleteFarmers: isSuperAdmin,
    canUploadFarmerPhoto: isAdmin || isFieldAgent,
    canGenerateFarmerQR: isAdmin || isFieldAgent || isNgoPartner,
    canCheckDuplicates: isAdmin || isFieldAgent,
    canChangeFarmerStatus: isAdmin,

    // ── Yield Permissions ───────────────────────────────
    canViewYields: isAnyRole,
    canSubmitYields: isAdmin || isFieldAgent,
    canEditYields: isAdmin || isFieldAgent,
    canDeleteYields: isAdmin,
    canViewFoodSecurityAlerts: isAdmin || isViewer,
    canViewYieldSummary: isAdmin || isNgoPartner || isViewer,

    // ── Distribution Permissions ────────────────────────
    canViewDistributions: isAnyRole,
    canRecordDistributions: isAdmin || isNgoPartner || isFieldAgent,
    canDeleteDistributions: isSuperAdmin,
    canViewCoverageGaps: isAdmin || isNgoPartner || isViewer,
    canViewDistributionStats: isAdmin || isNgoPartner || isViewer,
    canDownloadDistributionReceipt: isAdmin || isNgoPartner || isFieldAgent,

    // ── Organization Permissions ────────────────────────
    canViewOrganizations: isAnyRole,
    canCreateOrganizations: isSuperAdmin,
    canEditOrganizations: isAdmin,
    canDeactivateOrganizations: isSuperAdmin,
    canDeleteOrganizations: isSuperAdmin,
    canViewOrgActivity: isAdmin || isNgoPartner,

    // ── User Permissions ────────────────────────────────
    canViewUsers: isAdmin,
    canCreateUsers: isSuperAdmin,
    canEditUsers: isSuperAdmin,
    canDeactivateUsers: isSuperAdmin,
    canDeleteUsers: isSuperAdmin,
    canResetUserPasswords: isSuperAdmin,

    // ── Map Permissions ─────────────────────────────────
    canViewMap: isAnyRole,
    canViewMapHeatmap: isAdmin || isViewer,
    canViewMapBoundaries: isAdmin || isNgoPartner || isViewer,
    canCreateMapZones: isAdmin,
    canEditMapZones: isAdmin,
    canDeleteMapZones: isAdmin,

    // ── Analytics Permissions ───────────────────────────
    canViewAnalytics: isAdmin || isNgoPartner || isViewer,
    canViewRegionalYield: isAdmin || isNgoPartner || isViewer,
    canViewSeasonComparison: isAdmin || isViewer,
    canViewCropBreakdown: isAdmin || isNgoPartner || isViewer,
    canViewNGOActivity: isAdmin || isViewer,
    canViewFoodSecurityRisk: isAdmin || isViewer,
    canViewAidEfficiency: isAdmin || isViewer,

    // ── Export Permissions ──────────────────────────────
    canExportFarmers: isAdmin || isViewer,
    canExportYields: isAdmin || isNgoPartner || isViewer,
    canExportDistributions: isAdmin || isNgoPartner || isViewer,
    canViewExportHistory: isAdmin || isNgoPartner || isViewer,

    // ── Dashboard Permissions ───────────────────────────
    canViewDashboard: isAnyRole,
    canViewDashboardStats: isAnyRole,
    canViewActivityFeed: isAdmin || isViewer,
    canClearDashboardCache: isSuperAdmin,

    // ── Notification Permissions ────────────────────────
    canViewNotifications: isAnyRole,
    canBroadcastNotifications: isSuperAdmin,
    canViewAllNotifications: isSuperAdmin,

    // ── Audit Permissions ───────────────────────────────
    canViewAuditLogs: isAdmin,
    canViewAuditStats: isSuperAdmin,
    canViewRecordHistory: isAdmin,

    // ── System Permissions ──────────────────────────────
    canViewSystemSettings: isAdmin,
    canEditSystemSettings: isSuperAdmin,
    canManageIPBlocking: isSuperAdmin,
  };
};

// ─── usePermissions Hook ──────────────────────────────────
export function usePermissions(): Permissions {
  const { user } = useAuth();

  const permissions = useMemo(
    () => computePermissions(user?.role),
    [user?.role],
  );

  return permissions;
}

// ─── useCanAccess ─────────────────────────────────────────
/**
 * Check if current user can access a specific permission.
 * Returns false if user is not authenticated.
 *
 * Usage:
 *   const canDelete = useCanAccess('canDeleteFarmers');
 *   if (canDelete) return <DeleteButton />;
 */
export function useCanAccess(permission: keyof Permissions): boolean {
  const permissions = usePermissions();
  return permissions[permission];
}

export default usePermissions;
