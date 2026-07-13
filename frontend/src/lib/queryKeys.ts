/**
 * Centralized React Query cache keys for AgroEthiopia MIS.
 *
 * Structure:
 *   queryKeys.entity.list(filters)    → list queries
 *   queryKeys.entity.detail(id)       → single item queries
 *   queryKeys.entity.stats()          → statistics queries
 *   queryKeys.entity.infinite(filters) → infinite scroll queries
 *
 * Usage:
 *   useQuery({ queryKey: queryKeys.farmers.list({ page: 1 }) })
 *   queryClient.invalidateQueries({ queryKey: queryKeys.farmers.all })
 */

export const queryKeys = {
  // ─── Auth ───────────────────────────────────────────────
  auth: {
    all: ['auth'] as const,
    me: () => ['auth', 'me'] as const,
  },

  // ─── Dashboard ──────────────────────────────────────────
  dashboard: {
    all: ['dashboard'] as const,
    stats: () => ['dashboard', 'stats'] as const,
    yieldChart: (filters: { season?: string; year?: number }) =>
      ['dashboard', 'yield-chart', filters] as const,
    monthlyRegistrations: (year?: number) =>
      ['dashboard', 'monthly-registrations', year] as const,
    coverageChart: (filters: { season?: string; year?: number }) =>
      ['dashboard', 'coverage-chart', filters] as const,
    activityFeed: (limit?: number) =>
      ['dashboard', 'activity-feed', limit] as const,
    topRegions: () => ['dashboard', 'top-regions'] as const,
  },

  // ─── Farmers ────────────────────────────────────────────
  farmers: {
    all: ['farmers'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['farmers', 'list', filters] as const,
    detail: (id: string) => ['farmers', 'detail', id] as const,
    history: (id: string) => ['farmers', 'history', id] as const,
    qrCode: (id: string) => ['farmers', 'qrcode', id] as const,
    duplicateCheck: (data: {
      firstName: string;
      lastName: string;
      phone?: string;
      kebeleId: string;
    }) => ['farmers', 'duplicate-check', data] as const,
    stats: () => ['farmers', 'stats'] as const,
  },

  // ─── Yield Reports ──────────────────────────────────────
  yields: {
    all: ['yields'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['yields', 'list', filters] as const,
    detail: (id: string) => ['yields', 'detail', id] as const,
    summary: (filters: { season?: string; year?: number; regionId?: string }) =>
      ['yields', 'summary', filters] as const,
    foodSecurity: (filters: { season?: string; year?: number }) =>
      ['yields', 'food-security', filters] as const,
  },

  // ─── Distributions ──────────────────────────────────────
  distributions: {
    all: ['distributions'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['distributions', 'list', filters] as const,
    detail: (id: string) => ['distributions', 'detail', id] as const,
    coverageGaps: (filters: {
      season?: string;
      year?: number;
      regionId?: string;
      woredaId?: string;
    }) => ['distributions', 'coverage-gaps', filters] as const,
    stats: (filters: { season?: string; year?: number; orgId?: string }) =>
      ['distributions', 'stats', filters] as const,
  },

  // ─── Organizations ──────────────────────────────────────
  organizations: {
    all: ['organizations'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['organizations', 'list', filters] as const,
    detail: (id: string) => ['organizations', 'detail', id] as const,
    activity: (id: string) => ['organizations', 'activity', id] as const,
    stats: (id: string) => ['organizations', 'stats', id] as const,
  },

  // ─── Users ──────────────────────────────────────────────
  users: {
    all: ['users'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['users', 'list', filters] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
  },

  // ─── Regions ────────────────────────────────────────────
  regions: {
    all: ['regions'] as const,
    list: () => ['regions', 'list'] as const,
    detail: (id: string) => ['regions', 'detail', id] as const,
    zones: (regionId: string) => ['regions', 'zones', regionId] as const,
    woredas: (zoneId: string) => ['regions', 'woredas', zoneId] as const,
    kebeles: (woredaId: string) => ['regions', 'kebeles', woredaId] as const,
    search: (query: string, level?: string) =>
      ['regions', 'search', query, level] as const,
    stats: () => ['regions', 'stats'] as const,
  },

  // ─── Map ────────────────────────────────────────────────
  map: {
    all: ['map'] as const,
    farmers: (filters?: Record<string, unknown>) =>
      ['map', 'farmers', filters] as const,
    heatmap: (filters?: Record<string, unknown>) =>
      ['map', 'heatmap', filters] as const,
    kebeles: (filters?: Record<string, unknown>) =>
      ['map', 'kebeles', filters] as const,
    boundaries: {
      woredas: (filters?: Record<string, unknown>) =>
        ['map', 'boundaries', 'woredas', filters] as const,
    },
    zones: (type?: string) => ['map', 'zones', type] as const,
  },

  // ─── Analytics ──────────────────────────────────────────
  analytics: {
    all: ['analytics'] as const,
    regionalYield: (filters?: Record<string, unknown>) =>
      ['analytics', 'regional-yield', filters] as const,
    seasonComparison: (filters?: Record<string, unknown>) =>
      ['analytics', 'season-comparison', filters] as const,
    cropBreakdown: (filters?: Record<string, unknown>) =>
      ['analytics', 'crop-breakdown', filters] as const,
    ngoActivity: (filters?: Record<string, unknown>) =>
      ['analytics', 'ngo-activity', filters] as const,
    foodSecurityRisk: (filters?: Record<string, unknown>) =>
      ['analytics', 'food-security-risk', filters] as const,
    aidEfficiency: (filters?: Record<string, unknown>) =>
      ['analytics', 'aid-efficiency', filters] as const,
  },

  // ─── Notifications ──────────────────────────────────────
  notifications: {
    all: ['notifications'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['notifications', 'list', filters] as const,
    unreadCount: () => ['notifications', 'unread-count'] as const,
    adminAll: (filters?: Record<string, unknown>) =>
      ['notifications', 'admin', 'all', filters] as const,
  },

  // ─── Audit Logs ─────────────────────────────────────────
  audit: {
    all: ['audit'] as const,
    list: (filters?: Record<string, unknown>) =>
      ['audit', 'list', filters] as const,
    detail: (id: string) => ['audit', 'detail', id] as const,
    record: (tableName: string, recordId: string) =>
      ['audit', 'record', tableName, recordId] as const,
    user: (userId: string, filters?: Record<string, unknown>) =>
      ['audit', 'user', userId, filters] as const,
    stats: (filters?: Record<string, unknown>) =>
      ['audit', 'stats', filters] as const,
  },

  // ─── Exports ────────────────────────────────────────────
  exports: {
    all: ['exports'] as const,
    history: () => ['exports', 'history'] as const,
    job: (id: string) => ['exports', 'job', id] as const,
  },

  // ─── Health ─────────────────────────────────────────────
  health: {
    all: ['health'] as const,
    status: () => ['health', 'status'] as const,
  },
} as const;

export default queryKeys;
