'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  Filter,
  Download,
  Package,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
  X,
  AlertTriangle,
} from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { useExport } from '@/hooks/useExport';
import { useDebounce } from '@/hooks/useDebounce';
import { useToast } from '@/providers/ToastProvider';
import { distributionSchema, type DistributionFormData } from '@/lib/validators';
import {
  formatDate,
  getPaginationInfo,
  formatCount,
  getCurrentSeason,
} from '@/lib/utils';

interface Distribution {
  id: string;
  quantity: number;
  unit: string;
  season: string;
  year: number;
  notes?: string;
  createdAt: string;
  farmer: {
    id: string;
    farmerId: string;
    firstName: string;
    lastName: string;
    kebele: {
      name: string;
      woreda: { name: string; zone: { name: string; region: { name: string } } };
    };
  };
  inputType: { id: string; name: string; amharicName?: string; category: string; unit: string };
  organization: { id: string; name: string; type: string };
  distributedBy: { id: string; name: string };
}

interface DistributionResponse {
  success: boolean;
  data: Distribution[];
  pagination: { total: number; page: number; perPage: number; pageCount: number };
}

interface Farmer { id: string; farmerId: string; firstName: string; lastName: string }
interface InputType { id: string; name: string; amharicName?: string; unit: string; category: string }
interface Organization { id: string; name: string; type: string }

const categoryColors: Record<string, string> = {
  FERTILIZER: '#00ff88',
  SEED: '#00d4ff',
  PESTICIDE: '#fbbf24',
  TOOL: '#7b2fff',
  OTHER: '#a78bfa',
};

export default function InputsPage() {
  const permissions = usePermissions();
  const { exportDistributions, isExportingDistributions } = useExport();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [seasonFilter, setSeasonFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [farmerSearch, setFarmerSearch] = useState('');
  const [selectedFarmerId, setSelectedFarmerId] = useState('');
  const [selectedFarmerName, setSelectedFarmerName] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const debouncedFarmerSearch = useDebounce(farmerSearch, 400);
  const currentSeason = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<DistributionFormData>({
    resolver: zodResolver(distributionSchema),
    defaultValues: {
      season: currentSeason,
      year: currentYear,
    },
  });

  const { data, isLoading, refetch } = useQuery({
    queryKey: queryKeys.distributions.list({
      page,
      search: debouncedSearch,
      season: seasonFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        perPage: '20',
        ...(debouncedSearch && { search: debouncedSearch }),
        ...(seasonFilter && { season: seasonFilter }),
      });
      const res = await apiClient.get<DistributionResponse>(`/distributions?${params}`);
      return res.data;
    },
  });

  const { data: farmers = [] } = useQuery({
    queryKey: queryKeys.farmers.list({ search: debouncedFarmerSearch }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Farmer[] }>(
        `/farmers?perPage=10${debouncedFarmerSearch ? `&search=${debouncedFarmerSearch}` : ''}`,
      );
      return res.data.data;
    },
    enabled: showForm && farmerSearch.length > 1,
  });

  const { data: inputTypes = [] } = useQuery({
    queryKey: ['inputTypes'],
    queryFn: async () => {
      const res = await apiClient.get<{ data: InputType[] }>('/distributions/input-types');
      return res.data.data;
    },
    enabled: showForm,
  });

  const { data: organizations = [] } = useQuery({
    queryKey: queryKeys.organizations.list({ isActive: true }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: Organization[] }>('/organizations?isActive=true&perPage=100');
      return res.data.data;
    },
    enabled: showForm,
  });

  const recordMutation = useMutation({
    mutationFn: async (data: DistributionFormData) => {
      const res = await apiClient.post('/distributions', data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Distribution recorded', 'Aid distribution recorded successfully.');
      queryClient.invalidateQueries({ queryKey: queryKeys.distributions.all });
      setShowForm(false);
      reset();
      setSelectedFarmerId('');
      setSelectedFarmerName('');
      setFarmerSearch('');
    },
    onError: (error: { message?: string; statusCode?: number }) => {
      if (error?.statusCode === 409) {
        toast.error(
          'Duplicate distribution blocked',
          'This farmer already received this input this season from another organization.',
        );
      } else {
        toast.error('Failed to record', error?.message || 'Please try again.');
      }
    },
  });

  const distributions = data?.data || [];
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
            Aid Distribution
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {pagination ? `${formatCount(pagination.total)} distribution records` : 'Loading...'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {permissions.canExportDistributions && (
            <button
              onClick={() => exportDistributions({ season: seasonFilter as 'Meher' | 'Belg' | undefined })}
              disabled={isExportingDistributions}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Download size={15} />
              {isExportingDistributions ? 'Exporting...' : 'Export'}
            </button>
          )}
          {permissions.canRecordDistributions && (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', color: '#001a0e' }}
            >
              <Plus size={15} />
              Record Distribution
            </button>
          )}
        </div>
      </div>

      {/* Record Distribution Modal */}
      {showForm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(8px)' }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-lg rounded-2xl p-6"
            style={{ background: '#0a1a0e', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold" style={{ color: 'rgba(255,255,255,0.9)' }}>
                Record Distribution
              </h2>
              <button onClick={() => { setShowForm(false); reset(); setSelectedFarmerId(''); setSelectedFarmerName(''); setFarmerSearch(''); }} style={{ color: 'rgba(255,255,255,0.4)' }}>
                <X size={20} />
              </button>
            </div>

            {/* Deduplication Notice */}
            <div
              className="flex items-start gap-2 p-3 rounded-xl mb-4"
              style={{ background: 'rgba(251,191,36,0.08)', border: '1px solid rgba(251,191,36,0.15)' }}
            >
              <AlertTriangle size={14} className="mt-0.5 shrink-0" style={{ color: '#fbbf24' }} />
              <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Cross-NGO deduplication is active. Distribution will be blocked if this farmer already received this input this season from any organization.
              </p>
            </div>

            <form onSubmit={handleSubmit((data) => recordMutation.mutate(data))} className="space-y-4">
              <div>
                <label style={labelStyle}>Farmer *</label>
                {selectedFarmerName ? (
                  <div
                    className="flex items-center justify-between p-3 rounded-xl"
                    style={{ background: 'rgba(0,255,136,0.08)', border: '1px solid rgba(0,255,136,0.2)' }}
                  >
                    <span className="text-sm" style={{ color: '#00ff88' }}>{selectedFarmerName}</span>
                    <button
                      type="button"
                      onClick={() => { setSelectedFarmerId(''); setSelectedFarmerName(''); setFarmerSearch(''); setValue('farmerId', ''); }}
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : (
                  <div>
                    <input
                      placeholder="Search farmer by name or ID..."
                      value={farmerSearch}
                      onChange={(e) => setFarmerSearch(e.target.value)}
                      style={inputStyle}
                    />
                    {farmerSearch.length > 1 && farmers.length > 0 && (
                      <div
                        className="mt-1 rounded-xl overflow-hidden"
                        style={{ background: '#0e1a12', border: '1px solid rgba(255,255,255,0.08)' }}
                      >
                        {farmers.slice(0, 5).map((f) => (
                          <button
                            key={f.id}
                            type="button"
                            onClick={() => {
                              setSelectedFarmerId(f.id);
                              setSelectedFarmerName(`${f.firstName} ${f.lastName} (${f.farmerId})`);
                              setValue('farmerId', f.id);
                              setFarmerSearch('');
                            }}
                            className="w-full px-3 py-2 text-left text-sm"
                            style={{ color: 'rgba(255,255,255,0.7)' }}
                          >
                            {f.firstName} {f.lastName} — {f.farmerId}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
                <input type="hidden" {...register('farmerId')} value={selectedFarmerId} />
                {errors.farmerId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.farmerId.message}</p>}
              </div>

              <div>
                <label style={labelStyle}>Input Type *</label>
                <select {...register('inputTypeId')} style={inputStyle}>
                  <option value="">Select input type</option>
                  {inputTypes.map((it) => (
                    <option key={it.id} value={it.id}>{it.name} ({it.category})</option>
                  ))}
                </select>
                {errors.inputTypeId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.inputTypeId.message}</p>}
              </div>

              <div>
                <label style={labelStyle}>Organization *</label>
                <select {...register('orgId')} style={inputStyle}>
                  <option value="">Select organization</option>
                  {organizations.map((o) => (
                    <option key={o.id} value={o.id}>{o.name}</option>
                  ))}
                </select>
                {errors.orgId && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.orgId.message}</p>}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label style={labelStyle}>Quantity *</label>
                  <input {...register('quantity')} type="number" step="0.01" placeholder="e.g. 50" style={inputStyle} />
                  {errors.quantity && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.quantity.message}</p>}
                </div>
                <div>
                  <label style={labelStyle}>Unit *</label>
                  <input {...register('unit')} placeholder="e.g. kg" style={inputStyle} />
                  {errors.unit && <p className="text-xs mt-1" style={{ color: '#f87171' }}>{errors.unit.message}</p>}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                  style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.10)', color: 'rgba(255,255,255,0.6)' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={recordMutation.isPending}
                  className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold"
                  style={{ background: 'linear-gradient(135deg, #00ff88, #00d4ff)', color: '#001a0e' }}
                >
                  {recordMutation.isPending ? (
                    <><Loader2 size={14} className="animate-spin" /> Recording...</>
                  ) : 'Record Distribution'}
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
              placeholder="Search distributions..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm"
              style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.9)', outline: 'none' }}
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
            {(seasonFilter || search) && (
              <button
                onClick={() => { setSeasonFilter(''); setSearch(''); setPage(1); }}
                className="px-3 py-2 rounded-xl text-xs font-medium"
                style={{ background: 'rgba(248,113,113,0.1)', border: '1px solid rgba(248,113,113,0.2)', color: '#f87171' }}
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>

      {/* Distributions Table */}
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
        ) : distributions.length === 0 ? (
          <div className="p-16 text-center">
            <Package size={40} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
            <p className="text-base font-medium mb-2" style={{ color: 'rgba(255,255,255,0.4)' }}>No distributions found</p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>Record the first distribution to get started</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  {['Farmer', 'Input Type', 'Quantity', 'Organization', 'Season', 'Date'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: 'rgba(255,255,255,0.3)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {distributions.map((dist, index) => (
                  <motion.tr
                    key={dist.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.03 }}
                    style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
                  >
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium" style={{ color: 'rgba(255,255,255,0.8)' }}>
                        {dist.farmer.firstName} {dist.farmer.lastName}
                      </p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
                        {dist.farmer.farmerId}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{dist.inputType.name}</p>
                      <span
                        className="inline-block text-xs px-2 py-0.5 rounded-full mt-1"
                        style={{
                          background: `${categoryColors[dist.inputType.category] || '#a78bfa'}18`,
                          color: categoryColors[dist.inputType.category] || '#a78bfa',
                        }}
                      >
                        {dist.inputType.category}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm font-bold" style={{ color: '#00d4ff' }}>
                        {dist.quantity} {dist.unit}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{dist.organization.name}</p>
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>{dist.organization.type}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
                        {dist.season} {dist.year}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs" style={{ color: 'rgba(255,255,255,0.5)' }}>{formatDate(dist.createdAt)}</p>
                    </td>
                  </motion.tr>
                ))}
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
