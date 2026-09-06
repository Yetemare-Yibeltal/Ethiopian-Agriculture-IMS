'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ScrollText,
  Search,
  Filter,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Shield,
  Clock,
  User,
  Database,
} from 'lucide-react';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import {
  formatDateTime,
  getPaginationInfo,
  formatCount,
  getRoleColor,
} from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
interface AuditLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'EXPORT' | 'VIEW';
  tableName: string;
  recordId?: string;
  oldValues?: Record<string, unknown>;
  newValues?: Record<string, unknown>;
  ipAddress?: string;
  userAgent?: string;
  createdAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface AuditResponse {
  success: boolean;
  data: AuditLog[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  };
}

// ─── Action Colors ────────────────────────────────────────
const actionColors: Record<string, { bg: string; text: string }> = {
  CREATE: { bg: 'rgba(74,222,128,0.1)', text: '#4ade80' },
  UPDATE: { bg: 'rgba(251,191,36,0.1)', text: '#fbbf24' },
  DELETE: { bg: 'rgba(248,113,113,0.1)', text: '#f87171' },
  LOGIN: { bg: 'rgba(96,165,250,0.1)', text: '#60a5fa' },
  LOGOUT: { bg: 'rgba(167,139,250,0.1)', text: '#a78bfa' },
  EXPORT: { bg: 'rgba(0,212,255,0.1)', text: '#00d4ff' },
  VIEW: { bg: 'rgba(255,255,255,0.06)', text: 'rgba(255,255,255,0.5)' },
};

// ─── Audit Page ───────────────────────────────────────────
export default function AuditPage() {
  const permissions = usePermissions();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [tableFilter, setTableFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.audit.list({
      page,
      search: debouncedSearch,
      action: actionFilter || undefined,
      tableName: tableFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '25',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(actionFilter && { action: actionFilter }),
        ...(tableFilter && { tableName: tableFilter }),
      });
      const res = await apiClient.get<AuditResponse>(
        `/audit?${params}`,
      );
      return res.data;
    },
    enabled: permissions.canViewAuditLogs,
  });

  if (!permissions.canViewAuditLogs) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield
            size={48}
            className="mx-auto mb-4"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>
            You do not have permission to view audit logs.
          </p>
        </div>
      </div>
    );
  }

  const logs = data?.data || [];
  const pagination = data?.pagination;
  const paginationInfo = pagination
    ? getPaginationInfo(pagination.total, pagination.page, pagination.perPage)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Audit Logs
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pagination
              ? `${formatCount(pagination.total)} audit records`
              : 'Loading...'}
          </p>
        </div>
        <button
          onClick={() => refetch()}
          className="p-2 rounded-xl"
          style={{
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.5)',
          }}
        >
          <RefreshCw size={15} />
        </button>
      </div>

      {/* Search & Filters */}
      <div
        className="p-4 rounded-2xl space-y-4"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search
              size={15}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            />
            <input
              type="text"
              placeholder="Search by user, action, or table..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.9)',
                outline: 'none',
              }}
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium"
            style={{
              background: showFilters ? 'rgba(0,255,136,0.1)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showFilters ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.08)'}`,
              color: showFilters ? '#00ff88' : 'rgba(255,255,255,0.6)',
            }}
          >
            <Filter size={15} />
            Filters
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={actionFilter}
              onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                outline: 'none',
              }}
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
              <option value="EXPORT">Export</option>
            </select>

            <select
              value={tableFilter}
              onChange={(e) => { setTableFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                outline: 'none',
              }}
            >
              <option value="">All Tables</option>
              <option value="farmers">Farmers</option>
              <option value="yield_reports">Yield Reports</option>
              <option value="distributions">Distributions</option>
              <option value="users">Users</option>
              <option value="organizations">Organizations</option>
            </select>

            {(actionFilter || tableFilter || search) && (
              <button
                onClick={() => { setActionFilter(''); setTableFilter(''); setSearch(''); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  color: '#f87171',
                }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="h-12 rounded-xl shimmer"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            ))}
          </div>
        ) : logs.length === 0 ? (
          <div className="p-16 text-center">
            <ScrollText
              size={40}
              className="mx-auto mb-4"
              style={{ color: 'rgba(255,255,255,0.15)' }}
            />
            <p
              className="text-base font-medium mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              No audit logs found
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {['Time', 'User', 'Action', 'Table', 'IP Address', 'Details'].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                          style={{ color: 'rgba(255,255,255,0.3)' }}
                        >
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log, index) => {
                    const actionColor =
                      actionColors[log.action] || actionColors.VIEW;
                    const roleColor = getRoleColor(log.user.role);
                    return (
                      <motion.tr
                        key={log.id}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        onClick={() =>
                          setSelectedLog(
                            selectedLog?.id === log.id ? null : log,
                          )
                        }
                        className="cursor-pointer"
                        style={{
                          borderBottom: '1px solid rgba(255,255,255,0.04)',
                          background:
                            selectedLog?.id === log.id
                              ? 'rgba(0,255,136,0.04)'
                              : 'transparent',
                        }}
                      >
                        {/* Time */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Clock
                              size={11}
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.5)' }}
                            >
                              {formatDateTime(log.createdAt)}
                            </span>
                          </div>
                        </td>

                        {/* User */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold shrink-0"
                              style={{
                                background: roleColor.bg,
                                color: roleColor.text,
                              }}
                            >
                              {log.user.name.charAt(0)}
                            </div>
                            <div>
                              <p
                                className="text-xs font-medium"
                                style={{ color: 'rgba(255,255,255,0.8)' }}
                              >
                                {log.user.name}
                              </p>
                              <p
                                className="text-xs"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                              >
                                {log.user.role.replace('_', ' ')}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* Action */}
                        <td className="px-4 py-3">
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold"
                            style={{
                              background: actionColor.bg,
                              color: actionColor.text,
                            }}
                          >
                            {log.action}
                          </span>
                        </td>

                        {/* Table */}
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1.5">
                            <Database
                              size={11}
                              style={{ color: 'rgba(255,255,255,0.3)' }}
                            />
                            <span
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.6)' }}
                            >
                              {log.tableName}
                            </span>
                          </div>
                          {log.recordId && (
                            <p
                              className="text-xs mt-0.5"
                              style={{
                                color: 'rgba(255,255,255,0.25)',
                                fontFamily: 'monospace',
                              }}
                            >
                              {log.recordId.substring(0, 8)}...
                            </p>
                          )}
                        </td>

                        {/* IP Address */}
                        <td className="px-4 py-3">
                          <span
                            className="text-xs font-mono"
                            style={{ color: 'rgba(255,255,255,0.4)' }}
                          >
                            {log.ipAddress || '—'}
                          </span>
                        </td>

                        {/* Details toggle */}
                        <td className="px-4 py-3">
                          <button
                            className="text-xs px-2 py-1 rounded-lg"
                            style={{
                              background:
                                selectedLog?.id === log.id
                                  ? 'rgba(0,255,136,0.1)'
                                  : 'rgba(255,255,255,0.05)',
                              color:
                                selectedLog?.id === log.id
                                  ? '#00ff88'
                                  : 'rgba(255,255,255,0.4)',
                            }}
                          >
                            {selectedLog?.id === log.id ? 'Hide' : 'View'}
                          </button>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Expanded Log Detail */}
            {selectedLog && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="px-5 py-4"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                  background: 'rgba(0,255,136,0.02)',
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedLog.oldValues && (
                    <div>
                      <p
                        className="text-xs font-semibold mb-2"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        Previous Values
                      </p>
                      <pre
                        className="text-xs p-3 rounded-xl overflow-auto"
                        style={{
                          background: 'rgba(248,113,113,0.06)',
                          border: '1px solid rgba(248,113,113,0.1)',
                          color: '#f87171',
                          maxHeight: '200px',
                        }}
                      >
                        {JSON.stringify(selectedLog.oldValues, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.newValues && (
                    <div>
                      <p
                        className="text-xs font-semibold mb-2"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        New Values
                      </p>
                      <pre
                        className="text-xs p-3 rounded-xl overflow-auto"
                        style={{
                          background: 'rgba(74,222,128,0.06)',
                          border: '1px solid rgba(74,222,128,0.1)',
                          color: '#4ade80',
                          maxHeight: '200px',
                        }}
                      >
                        {JSON.stringify(selectedLog.newValues, null, 2)}
                      </pre>
                    </div>
                  )}
                  {selectedLog.userAgent && (
                    <div className="md:col-span-2">
                      <p
                        className="text-xs font-semibold mb-1"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        User Agent
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        {selectedLog.userAgent}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {/* Pagination */}
            {paginationInfo && pagination && pagination.pageCount > 1 && (
              <div
                className="flex items-center justify-between px-4 py-3"
                style={{
                  borderTop: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Showing {paginationInfo.from}–{paginationInfo.to} of{' '}
                  {formatCount(pagination.total)}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={!paginationInfo.hasPrev}
                    className="p-1.5 rounded-lg disabled:opacity-30"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span
                    className="text-xs px-2"
                    style={{ color: 'rgba(255,255,255,0.5)' }}
                  >
                    {page} / {pagination.pageCount}
                  </span>
                  <button
                    onClick={() =>
                      setPage((p) => Math.min(pagination.pageCount, p + 1))
                    }
                    disabled={!paginationInfo.hasNext}
                    className="p-1.5 rounded-lg disabled:opacity-30"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      color: 'rgba(255,255,255,0.6)',
                    }}
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
