'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  Building2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  Globe,
  Mail,
  Phone,
  Users,
  Eye,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/providers/ToastProvider';
import { organizationSchema, type OrganizationFormData } from '@/lib/validators';
import {
  formatDate,
  getPaginationInfo,
  formatCount,
} from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
interface Organization {
  id: string;
  name: string;
  type: string;
  description?: string;
  website?: string;
  email?: string;
  phone?: string;
  address?: string;
  focusAreas: string[];
  activeRegions: string[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    users: number;
    distributions: number;
  };
}

interface OrganizationsResponse {
  success: boolean;
  data: Organization[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  };
}

// ─── Type Colors ──────────────────────────────────────────
const typeColors: Record<string, { bg: string; text: string }> = {
  NGO: { bg: 'rgba(0,255,136,0.1)', text: '#00ff88' },
  GOVERNMENT: { bg: 'rgba(251,191,36,0.1)', text: '#fbbf24' },
  INTERNATIONAL: { bg: 'rgba(0,212,255,0.1)', text: '#00d4ff' },
  RESEARCH: { bg: 'rgba(123,47,255,0.1)', text: '#7b2fff' },
  OTHER: { bg: 'rgba(167,139,250,0.1)', text: '#a78bfa' },
};

// ─── Organizations Page ───────────────────────────────────
export default function OrganizationsPage() {
  const permissions = usePermissions();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OrganizationFormData>({
    resolver: zodResolver(organizationSchema),
  });

  // ── Fetch Organizations ──────────────────────────────
  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.organizations.list({
      page,
      search: debouncedSearch,
      type: typeFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(typeFilter && { type: typeFilter }),
      });
      const res = await apiClient.get<OrganizationsResponse>(
        `/organizations?${params}`,
      );
      return res.data;
    },
  });

  // ── Create Organization Mutation ──────────────────────
  const createMutation = useMutation({
    mutationFn: async (data: OrganizationFormData) => {
      const res = await apiClient.post('/organizations', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success(
        'Organization created',
        'Organization has been created successfully.',
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      });
      setShowForm(false);
      reset();
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error?.statusCode === 409) {
        toast.error(
          'Already exists',
          'An organization with this name already exists.',
        );
      } else {
        toast.error(
          'Failed to create',
          error?.message || 'Please try again.',
        );
      }
    },
  });

  // ── Deactivate Organization Mutation ──────────────────
  const deactivateMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiClient.patch(`/organizations/${id}/deactivate`);
    },
    onSuccess: () => {
      toast.success(
        'Organization deactivated',
        'Organization has been deactivated.',
      );
      queryClient.invalidateQueries({
        queryKey: queryKeys.organizations.all,
      });
    },
    onError: () => {
      toast.error('Failed to deactivate', 'Please try again.');
    },
  });

  const organizations = data?.data || [];
  const pagination = data?.pagination;
  const paginationInfo = pagination
    ? getPaginationInfo(
        pagination.total,
        pagination.page,
        pagination.perPage,
      )
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
            Organizations
          </h1>
          <p
            className="text-sm"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            {pagination
              ? `${formatCount(pagination.total)} organizations`
              : 'Loading...'}
          </p>
        </div>

        {permissions.canCreateOrganizations && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{
              background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
              color: '#001a0e',
            }}
          >
            <Plus size={15} />
            Add Organization
          </button>
        )}
      </div>

      {/* Create Organization Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{
            background: 'rgba(0,0,0,0.7)',
            backdropFilter: 'blur(8px)',
          }}
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
                Add Organization
              </h2>

              <button
                onClick={() => {
                  setShowForm(false);
                  reset();
                }}
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSubmit((data) =>
                createMutation.mutate(data),
              )}
              className="space-y-4"
            >
              <div>
                <label style={labelStyle}>Organization Name *</label>
                <input
                  {...register('name')}
                  placeholder="e.g. World Food Programme Ethiopia"
                  style={inputStyle}
                />
                {errors.name && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {errors.name.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Type *</label>
                <select {...register('type')} style={inputStyle}>
                  <option value="">Select type</option>
                  <option value="NGO">NGO</option>
                  <option value="GOVERNMENT">Government</option>
                  <option value="INTERNATIONAL">International</option>
                  <option value="RESEARCH">Research</option>
                  <option value="OTHER">Other</option>
                </select>

                {errors.type && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Description</label>
                <textarea
                  {...register('description')}
                  placeholder="Brief description of the organization..."
                  rows={3}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Email</label>
                  <input
                    {...register('email')}
                    type="email"
                    placeholder="info@org.et"
                    style={inputStyle}
                  />

                  {errors.email && (
                    <p
                      className="text-xs mt-1"
                      style={{ color: '#f87171' }}
                    >
                      {errors.email.message}
                    </p>
                  )}
                </div>

                <div>
                  <label style={labelStyle}>Phone</label>
                  <input
                    {...register('phone')}
                    placeholder="+251..."
                    style={inputStyle}
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Website</label>
                <input
                  {...register('website')}
                  placeholder="https://www.org.et"
                  style={inputStyle}
                />

                {errors.website && (
                  <p
                    className="text-xs mt-1"
                    style={{ color: '#f87171' }}
                  >
                    {errors.website.message}
                  </p>
                )}
              </div>

              <div>
                <label style={labelStyle}>Address</label>
                <input
                  {...register('address')}
                  placeholder="Addis Ababa, Ethiopia"
                  style={inputStyle}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    reset();
                  }}
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
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Organization'
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
              placeholder="Search organizations..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
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
              background: showFilters
                ? 'rgba(0,255,136,0.1)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${
                showFilters
                  ? 'rgba(0,255,136,0.2)'
                  : 'rgba(255,255,255,0.08)'
              }`,
              color: showFilters
                ? '#00ff88'
                : 'rgba(255,255,255,0.6)',
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
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value);
                setPage(1);
              }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                outline: 'none',
              }}
            >
              <option value="">All Types</option>
              <option value="NGO">NGO</option>
              <option value="GOVERNMENT">Government</option>
              <option value="INTERNATIONAL">International</option>
              <option value="RESEARCH">Research</option>
              <option value="OTHER">Other</option>
            </select>

            {(typeFilter || search) && (
              <button
                onClick={() => {
                  setTypeFilter('');
                  setSearch('');
                  setPage(1);
                }}
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

      {/* Organizations Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-2xl shimmer"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
      ) : organizations.length === 0 ? (
        <div
          className="p-16 text-center rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <Building2
            size={40}
            className="mx-auto mb-4"
            style={{ color: 'rgba(255,255,255,0.15)' }}
          />

          <p
            className="text-base font-medium mb-2"
            style={{ color: 'rgba(255,255,255,0.4)' }}
          >
            No organizations found
          </p>

          <p
            className="text-sm"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {search
              ? 'Try a different search term'
              : 'Add the first organization to get started'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {organizations.map((org, index) => {
            const typeColor =
              typeColors[org.type] || typeColors.OTHER;

            return (
              <motion.div
                key={org.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: `1px solid ${
                    org.isActive
                      ? 'rgba(255,255,255,0.08)'
                      : 'rgba(248,113,113,0.15)'
                  }`,
                }}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ background: typeColor.bg }}
                  >
                    <Building2
                      size={18}
                      style={{ color: typeColor.text }}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{
                        background: typeColor.bg,
                        color: typeColor.text,
                      }}
                    >
                      {org.type}
                    </span>

                    {!org.isActive && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-semibold"
                        style={{
                          background: 'rgba(248,113,113,0.1)',
                          color: '#f87171',
                        }}
                      >
                        Inactive
                      </span>
                    )}
                  </div>
                </div>

                {/* Name & Description */}
                <h3
                  className="text-sm font-bold mb-1 truncate"
                  style={{ color: 'rgba(255,255,255,0.9)' }}
                >
                  {org.name}
                </h3>

                {org.description && (
                  <p
                    className="text-xs mb-4 line-clamp-2"
                    style={{ color: 'rgba(255,255,255,0.4)' }}
                  >
                    {org.description}
                  </p>
                )}

                {/* Contact Info */}
                <div className="space-y-1.5 mb-4">
                  {org.email && (
                    <div className="flex items-center gap-2">
                      <Mail
                        size={12}
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      />

                      <span
                        className="text-xs truncate"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {org.email}
                      </span>
                    </div>
                  )}

                  {org.phone && (
                    <div className="flex items-center gap-2">
                      <Phone
                        size={12}
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      />

                      <span
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {org.phone}
                      </span>
                    </div>
                  )}

                  {org.website && (
                    <div className="flex items-center gap-2">
                      <Globe
                        size={12}
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      />

                      <a
                        href={org.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs truncate"
                        style={{ color: '#00d4ff' }}
                      >
                        {org.website.replace('https://', '')}
                      </a>
                    </div>
                  )}
                </div>

                {/* Stats */}
                <div
                  className="flex items-center justify-between pt-3 mb-4"
                  style={{
                    borderTop: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  <div className="flex items-center gap-1.5">
                    <Users
                      size={12}
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    />

                    <span
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {org._count.users} users
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    <span
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.5)' }}
                    >
                      {formatCount(org._count.distributions)} distributions
                    </span>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center gap-2">
                  <Link
                    href={`/organizations/${org.id}`}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                    style={{
                      background: 'rgba(0,212,255,0.08)',
                      border: '1px solid rgba(0,212,255,0.15)',
                      color: '#00d4ff',
                    }}
                  >
                    <Eye size={12} />
                    View Details
                  </Link>

                  {permissions.canDeactivateOrganizations &&
                    org.isActive && (
                      <button
                        onClick={() =>
                          deactivateMutation.mutate(org.id)
                        }
                        disabled={deactivateMutation.isPending}
                        className="px-3 py-2 rounded-xl text-xs font-medium transition-all duration-200"
                        style={{
                          background: 'rgba(248,113,113,0.08)',
                          border: '1px solid rgba(248,113,113,0.15)',
                          color: '#f87171',
                        }}
                      >
                        Deactivate
                      </button>
                    )}
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {paginationInfo &&
        pagination &&
        pagination.pageCount > 1 && (
          <div className="flex items-center justify-between">
            <p
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Showing {paginationInfo.from}–{paginationInfo.to} of{' '}
              {formatCount(pagination.total)}
            </p>

            <div className="flex items-center gap-2">
              <button
                onClick={() =>
                  setPage((p) => Math.max(1, p - 1))
                }
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
                  setPage((p) =>
                    Math.min(pagination.pageCount, p + 1),
                  )
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
  );
}
