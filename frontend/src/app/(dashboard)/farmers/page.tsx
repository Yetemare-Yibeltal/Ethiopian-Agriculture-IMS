'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  Download,
  Users,
  MapPin,
  Wheat,
  ChevronLeft,
  ChevronRight,
  Eye,
  QrCode,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { usePermissions } from '@/hooks/usePermissions';
import { useExport } from '@/hooks/useExport';
import { useDebounce } from '@/hooks/useDebounce';
import {
  formatDate,
  formatLandSize,
  getFarmerStatusColor,
  getFarmerPhotoUrl,
  getPaginationInfo,
  formatCount,
} from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
interface Farmer {
  id: string;
  farmerId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  photoUrl?: string;
  landSizeHectare?: number;
  landSizeTimad?: number;
  gpsLat?: number;
  gpsLng?: number;
  status: 'ACTIVE' | 'INACTIVE' | 'FLAGGED' | 'PENDING';
  createdAt: string;
  kebele: {
    name: string;
    woreda: {
      name: string;
      zone: {
        name: string;
        region: { name: string };
      };
    };
  };
  primaryCrop?: {
    name: string;
    amharicName?: string;
  };
  registeredBy?: {
    name: string;
  };
}

interface FarmersResponse {
  success: boolean;
  data: Farmer[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  };
}

// ─── Farmers Page ─────────────────────────────────────────
export default function FarmersPage() {
  const { user } = useAuth();
  const permissions = usePermissions();
  const { exportFarmers, isExportingFarmers } = useExport();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.farmers.list({
      page,
      search: debouncedSearch,
      status: statusFilter || undefined,
      regionId: regionFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(statusFilter && { status: statusFilter }),
        ...(regionFilter && { regionId: regionFilter }),
      });
      const res = await apiClient.get<FarmersResponse>(`/farmers?${params}`);
      return res.data;
    },
  });

  const farmers = data?.data || [];
  const pagination = data?.pagination;
  const paginationInfo = pagination
    ? getPaginationInfo(pagination.total, pagination.page, pagination.perPage)
    : null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Farmer Registry
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pagination ? `${formatCount(pagination.total)} farmers registered` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canExportFarmers && (
            <button
              onClick={() => exportFarmers({ regionId: regionFilter || undefined, status: statusFilter as 'ACTIVE' | undefined || undefined })}
              disabled={isExportingFarmers}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Download size={15} />
              {isExportingFarmers ? 'Exporting...' : 'Export'}
            </button>
          )}
          {permissions.canRegisterFarmers && (
            <Link
              href="/farmers/register"
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200"
              style={{
                background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                color: '#001a0e',
              }}
            >
              <Plus size={15} />
              Register Farmer
            </Link>
          )}
        </div>
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
              placeholder="Search by name, farmer ID, or phone..."
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
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
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
            className="p-2.5 rounded-xl transition-all duration-200"
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
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 flex-wrap"
          >
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.7)',
                outline: 'none',
              }}
            >
              <option value="">All Statuses</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="FLAGGED">Flagged</option>
              <option value="PENDING">Pending</option>
            </select>

            {(statusFilter || regionFilter || search) && (
              <button
                onClick={() => {
                  setStatusFilter('');
                  setRegionFilter('');
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
                Clear Filters
              </button>
            )}
          </motion.div>
        )}
      </div>

      {/* Farmers Table */}
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
              <div key={i} className="h-14 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : farmers.length === 0 ? (
          <div className="p-16 text-center">
            <Users size={40} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-base font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>
              No farmers found
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {search ? 'Try a different search term' : 'Register the first farmer to get started'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Farmer', 'Location', 'Land & Crop', 'Status', 'Registered', 'Actions'].map((header) => (
                    <th
                      key={header}
                      className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider"
                      style={{ color: 'rgba(255,255,255,0.3)' }}
                    >
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {farmers.map((farmer, index) => {
                  const statusColor = getFarmerStatusColor(farmer.status);
                  return (
                    <motion.tr
                      key={farmer.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      {/* Farmer */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className="w-9 h-9 rounded-xl overflow-hidden shrink-0 flex items-center justify-center"
                            style={{ background: 'rgba(0,255,136,0.1)' }}
                          >
                            {farmer.photoUrl ? (
                              <Image
                                src={getFarmerPhotoUrl(farmer.photoUrl)}
                                alt={`${farmer.firstName} ${farmer.lastName}`}
                                width={36}
                                height={36}
                                className="object-cover w-full h-full"
                              />
                            ) : (
                              <span className="text-xs font-bold" style={{ color: '#00ff88' }}>
                                {farmer.firstName[0]}{farmer.lastName[0]}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                              {farmer.firstName} {farmer.lastName}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {farmer.farmerId}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Location */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5">
                          <MapPin size={12} className="mt-0.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <div>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {farmer.kebele.name}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {farmer.kebele.woreda.name}, {farmer.kebele.woreda.zone.region.name}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Land & Crop */}
                      <td className="px-4 py-3">
                        <div className="flex items-start gap-1.5">
                          <Wheat size={12} className="mt-0.5 shrink-0" style={{ color: 'rgba(255,255,255,0.3)' }} />
                          <div>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.7)' }}>
                              {formatLandSize(farmer.landSizeHectare, farmer.landSizeTimad)}
                            </p>
                            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                              {farmer.primaryCrop?.name || '—'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold"
                          style={{
                            background: statusColor.bg,
                            color: statusColor.text,
                            border: `1px solid ${statusColor.border}`,
                          }}
                        >
                          {farmer.status}
                        </span>
                      </td>

                      {/* Registered */}
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                          {formatDate(farmer.createdAt)}
                        </p>
                        {farmer.registeredBy && (
                          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.3)' }}>
                            by {farmer.registeredBy.name}
                          </p>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Link
                            href={`/farmers/${farmer.id}`}
                            className="p-1.5 rounded-lg transition-colors"
                            style={{
                              background: 'rgba(0,212,255,0.1)',
                              color: '#00d4ff',
                            }}
                            title="View Profile"
                          >
                            <Eye size={13} />
                          </Link>
                          {permissions.canGenerateFarmerQR && (
                            <Link
                              href={`/farmers/${farmer.id}?tab=qrcode`}
                              className="p-1.5 rounded-lg transition-colors"
                              style={{
                                background: 'rgba(123,47,255,0.1)',
                                color: '#7b2fff',
                              }}
                              title="QR Code"
                            >
                              <QrCode size={13} />
                            </Link>
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
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Showing {paginationInfo.from}–{paginationInfo.to} of {formatCount(pagination.total)}
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!paginationInfo.hasPrev}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  color: 'rgba(255,255,255,0.6)',
                }}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {page} / {pagination.pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pageCount, p + 1))}
                disabled={!paginationInfo.hasNext}
                className="p-1.5 rounded-lg transition-colors disabled:opacity-30"
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
