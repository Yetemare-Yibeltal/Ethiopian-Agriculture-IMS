'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  UserCog,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  Shield,
  Mail,
  ToggleLeft,
  ToggleRight,
  KeyRound,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/providers/ToastProvider';
import {
  createUserSchema,
  resetPasswordSchema,
  type CreateUserFormData,
  type ResetPasswordFormData,
} from '@/lib/validators';
import {
  formatDate,
  formatRelativeTime,
  getPaginationInfo,
  formatCount,
  getRoleColor,
  formatRole,
} from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  language: string;
  isActive: boolean;
  lastLoginAt?: string;
  createdAt: string;
  organization?: {
    id: string;
    name: string;
    type: string;
  } | null;
}

interface UsersResponse {
  success: boolean;
  data: User[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  };
}

interface Organization {
  id: string;
  name: string;
  type: string;
}

// ─── Users Page ───────────────────────────────────────────
export default function UsersPage() {
  const permissions = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showResetForm, setShowResetForm] = useState<string | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const {
    register: registerCreate,
    handleSubmit: handleCreate,
    reset: resetCreate,
    watch: watchCreate,
    formState: { errors: createErrors },
  } = useForm<CreateUserFormData>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { language: 'en', role: 'FIELD_AGENT' },
  });

  const {
    register: registerReset,
    handleSubmit: handleReset,
    reset: resetResetForm,
    formState: { errors: resetErrors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
  });

  const selectedRole = watchCreate('role');

  // ── Fetch Users ───────────────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.users.list({
      page,
      search: debouncedSearch,
      role: roleFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(roleFilter && { role: roleFilter }),
      });
      const res = await apiClient.get<UsersResponse>(`/users?${params}`);
      return res.data;
    },
  });

  // ── Fetch Organizations for dropdown ──────────────────
  const { data: organizations = [] } = useQuery({
    queryKey: queryKeys.organizations.list({ isActive: true }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Organization[] }>(
        '/organizations?isActive=true&perPage=100',
      );
      return res.data.data;
    },
    enabled: showCreateForm,
  });

  // ── Create User Mutation ──────────────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: CreateUserFormData) => {
      const res = await apiClient.post('/users', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('User created', 'New user account has been created successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
      setShowCreateForm(false);
      resetCreate();
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error?.statusCode === 409) {
        toast.error('Email already exists', 'A user with this email already exists.');
      } else {
        toast.error('Failed to create user', error?.message || 'Please try again.');
      }
    },
  });

  // ── Toggle Active Mutation ────────────────────────────
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await apiClient.patch(`/users/${id}`, { isActive: !isActive });
    },
    onSuccess: () => {
      toast.success('User updated', 'User status has been updated.');
      queryClient.invalidateQueries({ queryKey: queryKeys.users.all });
    },
    onError: () => {
      toast.error('Update failed', 'Could not update user status.');
    },
  });

  // ── Reset Password Mutation ───────────────────────────
  const resetPasswordMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: ResetPasswordFormData;
    }) => {
      await apiClient.patch(`/users/${id}/reset-password`, {
        newPassword: data.newPassword,
      });
    },
    onSuccess: () => {
      toast.success('Password reset', 'User password has been reset successfully.');
      setShowResetForm(null);
      resetResetForm();
    },
    onError: () => {
      toast.error('Reset failed', 'Could not reset user password.');
    },
  });

  const users = data?.data || [];
  const pagination = data?.pagination;
  const paginationInfo = pagination
    ? getPaginationInfo(pagination.total, pagination.page, pagination.perPage)
    : null;

  const inputStyle = {
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.10)',
    borderRadius: '12px',
    color: 'rgba(255,255,255,0.9)',
    padding: '10px 14px',
    fontSize: '14px',
    width: '100%',
    outline: 'none',
  };

  const labelStyle = {
    fontSize: '13px',
    fontWeight: 500,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: '6px',
    display: 'block',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            User Management
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pagination
              ? `${formatCount(pagination.total)} users`
              : 'Loading...'}
          </p>
        </div>
        {permissions.canCreateUsers && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              color: '#001a0e',
            }}
          >
            <Plus size={15} />
            Add User
          </button>
        )}
      </div>

      {/* Create User Modal */}
      {showCreateForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl p-6"
            style={{
              background: '#0a1a0e',
              border: '1px solid rgba(255,255,255,0.1)',
              maxHeight: '90vh',
              overflowY: 'auto',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                Create New User
              </h2>
              <button
                onClick={() => { setShowCreateForm(false); resetCreate(); }}
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleCreate((data) => createMutation.mutate(data))}
              className="space-y-4"
            >
              <div>
                <label style={labelStyle}>Full Name *</label>
                <input
                  {...registerCreate('name')}
                  placeholder="e.g. Tigist Haile"
                  style={inputStyle}
                />
                {createErrors.name && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                    {createErrors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Email Address *</label>
                <input
                  {...registerCreate('email')}
                  type="email"
                  placeholder="user@agroethiopia.gov.et"
                  style={inputStyle}
                />
                {createErrors.email && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                    {createErrors.email.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Password *</label>
                <input
                  {...registerCreate('password')}
                  type="password"
                  placeholder="Min 8 characters with uppercase, lowercase, number"
                  style={inputStyle}
                />
                {createErrors.password && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                    {createErrors.password.message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Role *</label>
                  <select {...registerCreate('role')} style={inputStyle}>
                    <option value="SUPER_ADMIN">Super Admin</option>
                    <option value="ADMIN">Admin</option>
                    <option value="FIELD_AGENT">Field Agent</option>
                    <option value="NGO_PARTNER">NGO Partner</option>
                    <option value="VIEWER">Viewer</option>
                  </select>
                  {createErrors.role && (
                    <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                      {createErrors.role.message}
                    </p>
                  )}
                </div>
                <div>
                  <label style={labelStyle}>Language</label>
                  <select {...registerCreate('language')} style={inputStyle}>
                    <option value="en">English</option>
                    <option value="am">Amharic</option>
                  </select>
                </div>
              </div>

              {(selectedRole === 'NGO_PARTNER' ||
                selectedRole === 'FIELD_AGENT') && (
                <div>
                  <label style={labelStyle}>Organization</label>
                  <select {...registerCreate('orgId')} style={inputStyle}>
                    <option value="">No organization</option>
                    {organizations.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name} ({o.type})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowCreateForm(false); resetCreate(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                    color: '#001a0e',
                  }}
                >
                  {createMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Creating...</>
                  ) : (
                    'Create User'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md rounded-2xl p-6"
            style={{
              background: '#0a1a0e',
              border: '1px solid rgba(255,255,255,0.1)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2
                className="text-lg font-bold"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                Reset Password
              </h2>
              <button
                onClick={() => { setShowResetForm(null); resetResetForm(); }}
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleReset((data) =>
                resetPasswordMutation.mutate({
                  id: showResetForm,
                  data,
                }),
              )}
              className="space-y-4"
            >
              <div>
                <label style={labelStyle}>New Password *</label>
                <input
                  {...registerReset('newPassword')}
                  type="password"
                  placeholder="Min 8 characters"
                  style={inputStyle}
                />
                {resetErrors.newPassword && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                    {resetErrors.newPassword.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Confirm Password *</label>
                <input
                  {...registerReset('confirmPassword')}
                  type="password"
                  placeholder="Confirm new password"
                  style={inputStyle}
                />
                {resetErrors.confirmPassword && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>
                    {resetErrors.confirmPassword.message}
                  </p>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowResetForm(null); resetResetForm(); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.10)',
                    color: 'rgba(255,255,255,0.6)',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={resetPasswordMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #f87171, #fbbf24)',
                    color: '#fff',
                  }}
                >
                  {resetPasswordMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Resetting...</>
                  ) : (
                    'Reset Password'
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

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
              placeholder="Search by name or email..."
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
          <button
            onClick={() => refetch()}
            className="p-2.5 rounded-xl"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                outline: 'none',
              }}
            >
              <option value="">All Roles</option>
              <option value="SUPER_ADMIN">Super Admin</option>
              <option value="ADMIN">Admin</option>
              <option value="FIELD_AGENT">Field Agent</option>
              <option value="NGO_PARTNER">NGO Partner</option>
              <option value="VIEWER">Viewer</option>
            </select>
            {(roleFilter || search) && (
              <button
                onClick={() => { setRoleFilter(''); setSearch(''); setPage(1); }}
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

      {/* Users Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="h-14 rounded-xl shimmer"
                style={{ background: 'rgba(255,255,255,0.04)' }}
              />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div className="p-16 text-center">
            <UserCog
              size={40}
              className="mx-auto mb-4"
              style={{ color: 'rgba(255,255,255,0.15)' }}
            />
            <p
              className="text-base font-medium mb-2"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              No users found
            </p>
            <p
              className="text-sm"
              style={{ color: 'rgba(255,255,255,0.25)' }}
            >
              {search ? 'Try a different search term' : 'Add the first user'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr
                  style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
                >
                  {[
                    'User',
                    'Role',
                    'Organization',
                    'Last Login',
                    'Status',
                    'Actions',
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((user, index) => {
                  const roleColor = getRoleColor(user.role);
                  return (
                    <motion.tr
                      key={user.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      style={{
                        borderBottom: '1px solid rgba(255,255,255,0.04)',
                      }}
                    >
                      {/* User */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl flex items-center justify-center text-xs font-bold shrink-0"
                            style={{
                              background: roleColor.bg,
                              color: roleColor.text,
                            }}
                          >
                            {user.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .substring(0, 2)}
                          </div>
                          <div>
                            <p
                              className="text-sm font-semibold"
                              style={{ color: 'rgba(255,255,255,0.9)' }}
                            >
                              {user.name}
                            </p>
                            <div className="flex items-center gap-1">
                              <Mail
                                size={10}
                                style={{ color: 'rgba(255,255,255,0.3)' }}
                              />
                              <p
                                className="text-xs"
                                style={{ color: 'rgba(255,255,255,0.35)' }}
                              >
                                {user.email}
                              </p>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Role */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <Shield size={12} style={{ color: roleColor.text }} />
                          <span
                            className="text-xs font-semibold px-2 py-1 rounded-lg"
                            style={{
                              background: roleColor.bg,
                              color: roleColor.text,
                            }}
                          >
                            {formatRole(user.role)}
                          </span>
                        </div>
                      </td>

                      {/* Organization */}
                      <td className="px-4 py-3">
                        {user.organization ? (
                          <div>
                            <p
                              className="text-xs font-medium"
                              style={{ color: 'rgba(255,255,255,0.7)' }}
                            >
                              {user.organization.name}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: 'rgba(255,255,255,0.35)' }}
                            >
                              {user.organization.type}
                            </p>
                          </div>
                        ) : (
                          <span
                            className="text-xs"
                            style={{ color: 'rgba(255,255,255,0.25)' }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Last Login */}
                      <td className="px-4 py-3">
                        <p
                          className="text-xs"
                          style={{ color: 'rgba(255,255,255,0.5)' }}
                        >
                          {user.lastLoginAt
                            ? formatRelativeTime(user.lastLoginAt)
                            : 'Never'}
                        </p>
                        {user.lastLoginAt && (
                          <p
                            className="text-xs"
                            style={{ color: 'rgba(255,255,255,0.25)' }}
                          >
                            {formatDate(user.lastLoginAt)}
                          </p>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: user.isActive
                              ? 'rgba(74,222,128,0.1)'
                              : 'rgba(248,113,113,0.1)',
                            color: user.isActive ? '#4ade80' : '#f87171',
                            border: `1px solid ${user.isActive ? 'rgba(74,222,128,0.2)' : 'rgba(248,113,113,0.2)'}`,
                          }}
                        >
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {permissions.canDeactivateUsers && (
                            <button
                              onClick={() =>
                                toggleActiveMutation.mutate({
                                  id: user.id,
                                  isActive: user.isActive,
                                })
                              }
                              disabled={toggleActiveMutation.isPending}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{
                                background: user.isActive
                                  ? 'rgba(248,113,113,0.1)'
                                  : 'rgba(74,222,128,0.1)',
                                color: user.isActive ? '#f87171' : '#4ade80',
                              }}
                              title={user.isActive ? 'Deactivate' : 'Activate'}
                            >
                              {user.isActive ? (
                                <ToggleRight size={15} />
                              ) : (
                                <ToggleLeft size={15} />
                              )}
                            </button>
                          )}
                          {permissions.canResetUserPasswords && (
                            <button
                              onClick={() => setShowResetForm(user.id)}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{
                                background: 'rgba(251,191,36,0.1)',
                                color: '#fbbf24',
                              }}
                              title="Reset Password"
                            >
                              <KeyRound size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {paginationInfo && pagination && pagination.pageCount > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
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
      </div>
    </div>
  );
}
