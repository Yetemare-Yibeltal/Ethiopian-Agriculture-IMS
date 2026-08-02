'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  Download,
  Wheat,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { useExport } from '@/hooks/useExport';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/providers/ToastProvider';
import { yieldSchema, type YieldFormData } from '@/lib/validators';
import {
  formatDate,
  formatYield,
  getPaginationInfo,
  formatCount,
  getCurrentSeason,
} from '@/lib/utils';

interface YieldReport {
  id: string;
  season: string;
  year: number;
  stage: string;
  quantityKg: number;
  notes?: string;
  createdAt: string;
  farmer: {
    id: string;
    farmerId: string;
    firstName: string;
    lastName: string;
    kebele: {
      name: string;
      woreda: {
        name: string;
        zone: { name: string; region: { name: string } };
      };
    };
  };
  crop: { id: string; name: string; amharicName?: string; category: string };
  submittedBy: { id: string; name: string };
}

interface YieldResponse {
  success: boolean;
  data: YieldReport[];
  pagination: {
    total: number;
    page: number;
    perPage: number;
    pageCount: number;
  };
}

interface Farmer {
  id: string;
  farmerId: string;
  firstName: string;
  lastName: string;
}

interface Crop {
  id: string;
  name: string;
  amharicName?: string;
}

const stageColors: Record<string, { bg: string; text: string; border: string }> = {
  PRE_HARVEST: { bg: 'rgba(251,191,36,0.1)', text: '#fbbf24', border: 'rgba(251,191,36,0.2)' },
  HARVEST: { bg: 'rgba(0,212,255,0.1)', text: '#00d4ff', border: 'rgba(0,212,255,0.2)' },
  FINAL: { bg: 'rgba(74,222,128,0.1)', text: '#4ade80', border: 'rgba(74,222,128,0.2)' },
};

export default function YieldsPage() {
  const permissions = usePermissions();
  const { exportYields, isExportingYields } = useExport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [stageFilter, setStageFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const debouncedFarmerSearch = useDebounce(farmerSearch, 400);
  const currentSeason = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<YieldFormData>({
    resolver: zodResolver(yieldSchema),
    defaultValues: {
      season: currentSeason,
      year: currentYear,
      stage: 'FINAL',
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.yields.list({
      page,
      search: debouncedSearch,
      season: seasonFilter || undefined,
      stage: stageFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(seasonFilter && { season: seasonFilter }),
        ...(stageFilter && { stage: stageFilter }),
      });
      const res = await apiClient.get<YieldResponse>(`/yields?${params}`);
      return res.data;
    },
  });

  const { data: farmers = [] } = useQuery({
    queryKey: queryKeys.farmers.list({ search: debouncedFarmerSearch }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Farmer[] }>(
        `/farmers?perPage=20${debouncedFarmerSearch ? `&search=${debouncedFarmerSearch}` : ''}`,
      );
      return res.data.data;
    },
    enabled: showForm,
  });

  const { data: crops = [] } = useQuery({
    queryKey: ['crops'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: Crop[] }>('/yields/crops');
      return res.data.data;
    },
    enabled: showForm,
  });

  const submitMutation = useMutation({
    mutationFn: async (data: YieldFormData) => {
      const res = await apiClient.post('/yields', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Yield submitted', 'Yield report submitted successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.yields.all });
      setShowForm(false);
      reset();
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error?.statusCode === 409) {
        toast.error('Duplicate report', 'A yield report for this farmer, crop, season and stage already exists.');
      } else {
        toast.error('Submission failed', error?.message || 'Please try again.');
      }
    },
  });

  const yields = data?.data || [];
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
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Yield Reports
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pagination ? `${formatCount(pagination.total)} yield reports` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canExportYields && (
            <button
              onClick={() => exportYields({ season: seasonFilter as 'Meher' | 'Belg' | undefined })}
              disabled={isExportingYields}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Download size={15} />
              {isExportingYields ? 'Exporting...' : 'Export'}
            </button>
          )}
          {permissions.canSubmitYields && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                color: '#001a0e',
              }}
            >
              <Plus size={15} />
              Submit Yield
            </button>
          )}
        </div>
      </div>

      {/* Submit Yield Form Modal */}
      {showForm && (
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
              <h2 className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Submit Yield Report
              </h2>
              <button onClick={() => { setShowForm(false); reset(); }} style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => submitMutation.mutate(data))} className="space-y-4">
              <div>
                <label style={labelStyle}>Farmer *</label>
                <input
                  placeholder="Search farmer by name or ID..."
                  value={farmerSearch}
                  onChange={(e) => setFarmerSearch(e.target.value)}
                  style={inputStyle}
                />
                {farmerSearch && farmers.length > 0 && (
                  <div
                    className="mt-1 rounded-xl overflow-hidden"
                    style={{ background: '#0e1a12', border: '1px solid rgba(255,255,255,0.08)' }}
                  >
                    {farmers.slice(0, 5).map((f) => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => {
                          const input = document.querySelector('input[name="farmerId"]') as HTMLInputElement;
                          if (input) input.value = f.id;
                          setFarmerSearch(`${f.firstName} ${f.lastName} (${f.farmerId})`);
                        }}
                        className="w-full px-3 py-2 text-left text-sm transition-colors"
                        style={{ color: 'rgba(255,255,255,0.7)' }}
                      >
                        {f.firstName} {f.lastName} — {f.farmerId}
                      </button>
                    ))}
                  </div>
                )}
                <input type="hidden" {...register('farmerId')} />
                {errors.farmerId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.farmerId.message}</p>}
              </div>

              <div>
                <label style={labelStyle}>Crop *</label>
                <select {...register('cropId')} style={inputStyle}>
                  <option value="">Select crop</option>
                  {crops.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {errors.cropId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.cropId.message}</p>}
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label style={labelStyle}>Season *</label>
                  <select {...register('season')} style={inputStyle}>
                    <option value="Meher">Meher</option>
                    <option value="Belg">Belg</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Year *</label>
                  <input {...register('year')} type="number" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}>Stage *</label>
                  <select {...register('stage')} style={inputStyle}>
                    <option value="PRE_HARVEST">Pre Harvest</option>
                    <option value="HARVEST">Harvest</option>
                    <option value="FINAL">Final</option>
                  </select>
                </div>
              </div>

              <div>
                <label style={labelStyle}>Quantity (kg) *</label>
                <input {...register('quantityKg')} type="number" step="0.01" placeholder="e.g. 500" style={inputStyle} />
                {errors.quantityKg && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.quantityKg.message}</p>}
              </div>

              <div>
                <label style={labelStyle}>Notes</label>
                <textarea
                  {...register('notes')}
                  placeholder="Optional notes..."
                  rows={2}
                  style={{ ...inputStyle, resize: 'none' }}
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowForm(false); reset(); }}
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
                  disabled={submitMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                    color: '#001a0e',
                  }}
                >
                  {submitMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Submitting...</>
                  ) : 'Submit Report'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Search & Filters */}
      <div
        className="p-4 rounded-2xl space-y-4"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: 'rgba(255,255,255,0.3)' }} />
            <input
              type="text"
              placeholder="Search yields..."
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
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)' }}
          >
            <RefreshCw size={15} />
          </button>
        </div>

        {showFilters && (
          <div className="flex items-center gap-3 flex-wrap">
            <select
              value={seasonFilter}
              onChange={(e) => { setSeasonFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', outline: 'none' }}
            >
              <option value="">All Seasons</option>
              <option value="Meher">Meher</option>
              <option value="Belg">Belg</option>
            </select>
            <select
              value={stageFilter}
              onChange={(e) => { setStageFilter(e.target.value); setPage(1); }}
              className="px-3 py-2 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', outline: 'none' }}
            >
              <option value="">All Stages</option>
              <option value="PRE_HARVEST">Pre Harvest</option>
              <option value="HARVEST">Harvest</option>
              <option value="FINAL">Final</option>
            </select>
            {(seasonFilter || stageFilter || search) && (
              <button
                onClick={() => { setSeasonFilter(''); setStageFilter(''); setSearch(''); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Yields Table */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
      >
        {isLoading ? (
          <div className="p-8 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-14 rounded-xl shimmer" style={{ background: 'rgba(255,255,255,0.04)' }} />
            ))}
          </div>
        ) : yields.length === 0 ? (
          <div className="p-16 text-center">
            <Wheat size={40} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-base font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>No yield reports found</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Submit the first yield report to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Farmer', 'Crop', 'Season & Stage', 'Quantity', 'Submitted By', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {yields.map((yr, index) => {
                  const stageColor = stageColors[yr.stage] || stageColors.FINAL;
                  return (
                    <motion.tr
                      key={yr.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.03 }}
                      style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                    >
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                          {yr.farmer.firstName} {yr.farmer.lastName}
                        </p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{yr.farmer.farmerId}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{yr.crop.name}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{yr.crop.category}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
                          {yr.season} {yr.year}
                        </p>
                        <span
                          className="inline-flex px-2 py-0.5 rounded-full text-xs font-semibold mt-1"
                          style={{ background: stageColor.bg, color: stageColor.text, border: `1px solid ${stageColor.border}` }}
                        >
                          {yr.stage.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-bold" style={{ color: '#00ff88' }}>{formatYield(yr.quantityKg)}</p>
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{formatYield(yr.quantityKg, 'tons')}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>{yr.submittedBy.name}</p>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(yr.createdAt)}</p>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

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
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs px-2" style={{ color: 'rgba(255,255,255,0.5)' }}>
                {page} / {pagination.pageCount}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(pagination.pageCount, p + 1))}
                disabled={!paginationInfo.hasNext}
                className="p-1.5 rounded-lg disabled:opacity-30"
                style={{ background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)' }}
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
