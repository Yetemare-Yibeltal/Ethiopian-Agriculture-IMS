'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3,
  TrendingUp,
  Wheat,
  Package,
  AlertTriangle,
  Filter,
  RefreshCw,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend,
  RadarChart,
  Radar,
  PolarGrid,
  PolarAngleAxis,
} from 'recharts';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { formatNumber, getCurrentSeason } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
interface RegionalYield {
  region: string;
  totalYieldTons: number;
  farmerCount: number;
  avgYieldPerFarmer: number;
}

interface SeasonComparison {
  season: string;
  year: number;
  totalYieldTons: number;
  farmerCount: number;
}

interface CropBreakdown {
  crop: string;
  totalYieldKg: number;
  farmerCount: number;
  percentage: number;
}

interface NGOActivity {
  organization: string;
  type: string;
  totalDistributions: number;
  farmersReached: number;
  season: string;
}

interface FoodSecurityRisk {
  region: string;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  farmerCount: number;
  avgYieldKg: number;
  coveragePercent: number;
}

// ─── Colors ───────────────────────────────────────────────
const CHART_COLORS = [
  '#00ff88', '#00d4ff', '#7b2fff', '#fbbf24', '#f87171',
  '#4ade80', '#60a5fa', '#a78bfa', '#fb923c', '#34d399',
];

const riskColors: Record<string, string> = {
  LOW: '#4ade80',
  MEDIUM: '#fbbf24',
  HIGH: '#fb923c',
  CRITICAL: '#f87171',
};

const tooltipStyle = {
  background: 'rgba(6,13,24,0.95)',
  border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: '8px',
  color: 'rgba(255,255,255,0.9)',
  fontSize: '12px',
};

// ─── Analytics Page ───────────────────────────────────────
export default function AnalyticsPage() {
  const permissions = usePermissions();
  const currentSeason = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  const [season, setSeason] = useState(currentSeason);
  const [year, setYear] = useState(currentYear);

  // ── Fetch Regional Yield ─────────────────────────────
  const { data: regionalYield = [], isLoading: loadingRegional, refetch: refetchRegional } = useQuery({
    queryKey: queryKeys.analytics.regionalYield({ season, year }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: RegionalYield[] }>(
        `/analytics/regional-yield?season=${season}&year=${year}`,
      );
      return res.data.data;
    },
    enabled: permissions.canViewAnalytics,
  });

  // ── Fetch Season Comparison ──────────────────────────
  const { data: seasonComparison = [] } = useQuery({
    queryKey: queryKeys.analytics.seasonComparison({ year }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: SeasonComparison[] }>(
        `/analytics/season-comparison?year=${year}`,
      );
      return res.data.data;
    },
    enabled: permissions.canViewAnalytics,
  });

  // ── Fetch Crop Breakdown ─────────────────────────────
  const { data: cropBreakdown = [] } = useQuery({
    queryKey: queryKeys.analytics.cropBreakdown({ season, year }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: CropBreakdown[] }>(
        `/analytics/crop-breakdown?season=${season}&year=${year}`,
      );
      return res.data.data;
    },
    enabled: permissions.canViewAnalytics,
  });

  // ── Fetch NGO Activity ───────────────────────────────
  const { data: ngoActivity = [] } = useQuery({
    queryKey: queryKeys.analytics.ngoActivity({ season, year }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: NGOActivity[] }>(
        `/analytics/ngo-activity?season=${season}&year=${year}`,
      );
      return res.data.data;
    },
    enabled: permissions.canViewAnalytics,
  });

  // ── Fetch Food Security Risk ─────────────────────────
  const { data: foodSecurityRisk = [] } = useQuery({
    queryKey: queryKeys.analytics.foodSecurityRisk({ season, year }),
    queryFn: async () => {
      const res = await apiClient.get<{ data: FoodSecurityRisk[] }>(
        `/analytics/food-security-risk?season=${season}&year=${year}`,
      );
      return res.data.data;
    },
    enabled: permissions.canViewAnalytics,
  });

  if (!permissions.canViewAnalytics) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <BarChart3 size={48} className="mx-auto mb-4" style={{ color: 'rgba(255,255,255,0.15)' }} />
          <p style={{ color: 'rgba(255,255,255,0.4)' }}>
            You do not have permission to view analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'rgba(255,255,255,0.9)' }}>
            Analytics
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Agricultural data insights for Ethiopia
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value as 'Meher' | 'Belg')}
            className="px-3 py-2 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              outline: 'none',
            }}
          >
            <option value="Meher">Meher</option>
            <option value="Belg">Belg</option>
          </select>
          <select
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="px-3 py-2 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              outline: 'none',
            }}
          >
            {[2022, 2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <button
            onClick={() => refetchRegional()}
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
      </div>

      {/* Regional Yield Bar Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-center gap-2 mb-5">
          <Wheat size={16} style={{ color: '#00ff88' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
            Regional Yield — {season} {year}
          </h3>
        </div>
        {loadingRegional ? (
          <div className="h-64 shimmer rounded-xl" style={{ background: 'rgba(255,255,255,0.04)' }} />
        ) : (
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={regionalYield}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="region" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={(v) => `${formatNumber(v)}t`} />
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${formatNumber(v)} tons`, 'Yield']} />
              <Bar dataKey="totalYieldTons" name="Yield (tons)" radius={[4, 4, 0, 0]}>
                {regionalYield.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Season Comparison & Crop Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Season Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <TrendingUp size={16} style={{ color: '#00d4ff' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Season Comparison {year}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={seasonComparison}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="season" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="totalYieldTons" name="Yield (tons)" fill="#00d4ff" radius={[4, 4, 0, 0]} />
              <Bar dataKey="farmerCount" name="Farmers" fill="#7b2fff" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Crop Breakdown Pie */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Filter size={16} style={{ color: '#7b2fff' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Crop Breakdown — {season} {year}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={cropBreakdown}
                dataKey="percentage"
                nameKey="crop"
                cx="50%"
                cy="50%"
                outerRadius={80}
                strokeWidth={0}
              >
                {cropBreakdown.map((_, index) => (
                  <Cell key={index} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(v: number) => [`${v.toFixed(1)}%`, 'Share']} />
              <Legend
                iconSize={8}
                wrapperStyle={{ fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </div>

      {/* NGO Activity */}
      {permissions.canViewNGOActivity && ngoActivity.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <Package size={16} style={{ color: '#fbbf24' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
              NGO Activity — {season} {year}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={ngoActivity} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis type="number" tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="organization" width={120} tick={{ fill: 'rgba(255,255,255,0.5)', fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Bar dataKey="farmersReached" name="Farmers Reached" fill="#fbbf24" radius={[0, 4, 4, 0]} />
              <Bar dataKey="totalDistributions" name="Distributions" fill="#00d4ff" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>
      )}

      {/* Food Security Risk */}
      {permissions.canViewFoodSecurityRisk && foodSecurityRisk.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="flex items-center gap-2 mb-5">
            <AlertTriangle size={16} style={{ color: '#f87171' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
              Food Security Risk Assessment — {season} {year}
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {foodSecurityRisk.map((item, index) => (
              <motion.div
                key={item.region}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-xl"
                style={{
                  background: `${riskColors[item.riskLevel]}08`,
                  border: `1px solid ${riskColors[item.riskLevel]}20`,
                }}
              >
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                    {item.region}
                  </h4>
                  <span
                    className="px-2 py-0.5 rounded-full text-xs font-bold"
                    style={{
                      background: `${riskColors[item.riskLevel]}20`,
                      color: riskColors[item.riskLevel],
                    }}
                  >
                    {item.riskLevel}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Farmers</p>
                    <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {formatNumber(item.farmerCount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Avg Yield</p>
                    <p className="text-sm font-bold" style={{ color: 'rgba(255,255,255,0.8)' }}>
                      {formatNumber(item.avgYieldKg)}kg
                    </p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>Coverage</p>
                    <p className="text-sm font-bold" style={{ color: riskColors[item.riskLevel] }}>
                      {item.coveragePercent}%
                    </p>
                  </div>
                </div>
                <div className="mt-3">
                  <div className="h-1.5 rounded-full" style={{ background: 'rgba(255,255,255,0.06)' }}>
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${item.coveragePercent}%`,
                        background: riskColors[item.riskLevel],
                      }}
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}
