'use client';

import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users,
  Wheat,
  Package,
  Building2,
  AlertTriangle,
  TrendingUp,
  UserPlus,
  Activity,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  CartesianGrid,
} from 'recharts';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useAuth } from '@/providers/AuthProvider';
import { formatNumber, formatCount, getCurrentSeason } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
interface DashboardStats {
  farmers?: {
    total: number;
    active: number;
    recentRegistrations: number;
  };
  organizations?: {
    total: number;
    active: number;
  };
  users?: {
    total: number;
  };
  currentSeason?: {
    season: string;
    year: number;
    distributions: number;
    yieldReports: number;
  };
  alerts?: {
    foodSecurity: number;
  };
  totalDistributions?: number;
  farmersReached?: number;
  activeAgents?: number;
  season?: string;
  year?: number;
}

interface ActivityItem {
  id: string;
  action: string;
  tableName: string;
  createdAt: string;
  user: {
    name: string;
    role: string;
  };
}

// ─── Stat Card ────────────────────────────────────────────
function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  delay?: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className="rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
      }}
    >
      <div className="mb-4 flex items-start justify-between">
        <div
          className="flex h-10 w-10 items-center justify-center rounded-xl"
          style={{ background: `${color}18`, border: `1px solid ${color}30` }}
        >
          <Icon size={18} style={{ color }} />
        </div>
      </div>
      <div
        className="mb-1 text-3xl font-bold"
        style={{ color: 'rgba(255,255,255,0.9)' }}
      >
        {typeof value === 'number' ? formatNumber(value) : value}
      </div>
      <div
        className="mb-1 text-sm font-medium"
        style={{ color: 'rgba(255,255,255,0.6)' }}
      >
        {title}
      </div>
      {subtitle && (
        <div className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {subtitle}
        </div>
      )}
    </motion.div>
  );
}

// ─── Dashboard Page ───────────────────────────────────────
export default function DashboardPage() {
  const { user } = useAuth();
  const currentSeason = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  // ── Fetch Stats ──────────────────────────────────────
  const { data: statsData, isLoading: statsLoading } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: DashboardStats;
      }>('/dashboard/stats');
      return res.data.data;
    },
  });

  // ── Fetch Yield Chart ────────────────────────────────
  const { data: yieldChartData } = useQuery({
    queryKey: queryKeys.dashboard.yieldChart({
      season: currentSeason,
      year: currentYear,
    }),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: { region: string; totalYieldTons: number }[];
      }>(`/dashboard/yield-chart?season=${currentSeason}&year=${currentYear}`);
      return res.data.data;
    },
  });

  // ── Fetch Coverage Chart ─────────────────────────────
  const { data: coverageData } = useQuery({
    queryKey: queryKeys.dashboard.coverageChart({
      season: currentSeason,
      year: currentYear,
    }),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: {
          covered: number;
          uncovered: number;
          coveragePercent: number;
          total: number;
        };
      }>(
        `/dashboard/coverage-chart?season=${currentSeason}&year=${currentYear}`,
      );
      return res.data.data;
    },
  });

  // ── Fetch Monthly Registrations ──────────────────────
  const { data: monthlyData } = useQuery({
    queryKey: queryKeys.dashboard.monthlyRegistrations(currentYear),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: { month: string; count: number }[];
      }>(`/dashboard/monthly-registrations?year=${currentYear}`);
      return res.data.data;
    },
  });

  // ── Fetch Activity Feed ──────────────────────────────
  const { data: activityData } = useQuery({
    queryKey: queryKeys.dashboard.activityFeed(10),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: ActivityItem[];
      }>('/dashboard/activity-feed?limit=10');
      return res.data.data;
    },
  });

  // ── Fetch Top Regions ────────────────────────────────
  const { data: topRegions } = useQuery({
    queryKey: queryKeys.dashboard.topRegions(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: { region: string; farmerCount: number }[];
      }>('/dashboard/top-regions');
      return res.data.data;
    },
  });

  const isNgo = user?.role === 'NGO_PARTNER';

  const coveragePieData = coverageData
    ? [
        { name: 'Covered', value: coverageData.covered, color: '#00ff88' },
        {
          name: 'Uncovered',
          value: coverageData.uncovered,
          color: 'rgba(255,255,255,0.1)',
        },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1
          className="mb-1 text-2xl font-bold"
          style={{ color: 'rgba(255,255,255,0.9)' }}
        >
          Welcome back, {user?.name?.split(' ')[0]}
        </h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
          {currentSeason} Season {currentYear} — AgroEthiopia MIS
        </p>
      </div>

      {/* KPI Stats */}
      {statsLoading ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="shimmer h-36 rounded-2xl"
              style={{ background: 'rgba(255,255,255,0.04)' }}
            />
          ))}
        </div>
      ) : isNgo ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
          <StatCard
            title="Distributions This Season"
            value={statsData?.totalDistributions ?? 0}
            icon={Package}
            color="#00ff88"
            delay={0}
          />
          <StatCard
            title="Farmers Reached"
            value={statsData?.farmersReached ?? 0}
            icon={Users}
            color="#00d4ff"
            delay={0.1}
          />
          <StatCard
            title="Active Field Agents"
            value={statsData?.activeAgents ?? 0}
            icon={Activity}
            color="#7b2fff"
            delay={0.2}
          />
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            title="Total Farmers"
            value={statsData?.farmers?.total ?? 0}
            subtitle={`${formatCount(statsData?.farmers?.recentRegistrations ?? 0)} this month`}
            icon={Users}
            color="#00ff88"
            delay={0}
          />
          <StatCard
            title="Distributions"
            value={statsData?.currentSeason?.distributions ?? 0}
            subtitle={`${currentSeason} ${currentYear}`}
            icon={Package}
            color="#00d4ff"
            delay={0.1}
          />
          <StatCard
            title="Organizations"
            value={statsData?.organizations?.active ?? 0}
            subtitle={`${statsData?.organizations?.total ?? 0} total`}
            icon={Building2}
            color="#7b2fff"
            delay={0.2}
          />
          <StatCard
            title="Food Security Alerts"
            value={statsData?.alerts?.foodSecurity ?? 0}
            subtitle="Active alerts"
            icon={AlertTriangle}
            color="#f87171"
            delay={0.3}
          />
        </div>
      )}

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Yield Chart */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="rounded-2xl p-5 lg:col-span-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Wheat size={16} style={{ color: '#00ff88' }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Yield by Region — {currentSeason} {currentYear}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={yieldChartData || []}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="region"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(6,13,24,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.9)',
                }}
              />
              <Bar
                dataKey="totalYieldTons"
                fill="#00ff88"
                radius={[4, 4, 0, 0]}
                name="Yield (tons)"
              />
            </BarChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Coverage Donut */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <TrendingUp size={16} style={{ color: '#00d4ff' }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Aid Coverage
            </h3>
          </div>
          <div className="flex items-center justify-center">
            <div className="relative">
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={coveragePieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    dataKey="value"
                    strokeWidth={0}
                  >
                    {coveragePieData.map((entry, index) => (
                      <Cell key={index} fill={entry.color} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
              <div
                className="absolute inset-0 flex flex-col items-center justify-center"
                style={{ pointerEvents: 'none' }}
              >
                <span
                  className="text-2xl font-bold"
                  style={{ color: '#00ff88' }}
                >
                  {coverageData?.coveragePercent ?? 0}%
                </span>
                <span
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  covered
                </span>
              </div>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: '#00ff88' }}
                />
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>Covered</span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                {formatCount(coverageData?.covered ?? 0)}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <div
                  className="h-2 w-2 rounded-full"
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                />
                <span style={{ color: 'rgba(255,255,255,0.6)' }}>
                  Uncovered
                </span>
              </div>
              <span style={{ color: 'rgba(255,255,255,0.8)' }}>
                {formatCount(coverageData?.uncovered ?? 0)}
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Monthly Registrations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="rounded-2xl p-5 lg:col-span-2"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <UserPlus size={16} style={{ color: '#7b2fff' }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Monthly Farmer Registrations {currentYear}
            </h3>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={monthlyData || []}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="month"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 11 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: 'rgba(6,13,24,0.95)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '8px',
                  color: 'rgba(255,255,255,0.9)',
                }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="#7b2fff"
                strokeWidth={2}
                dot={{ fill: '#7b2fff', r: 3 }}
                name="Registrations"
              />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        {/* Top Regions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="rounded-2xl p-5"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div className="mb-5 flex items-center gap-2">
            <Building2 size={16} style={{ color: '#ff6b35' }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Top Regions by Farmers
            </h3>
          </div>
          <div className="space-y-3">
            {(topRegions || []).map((item, index) => {
              const maxCount = topRegions?.[0]?.farmerCount || 1;
              const pct = Math.round((item.farmerCount / maxCount) * 100);
              return (
                <div key={item.region}>
                  <div className="mb-1 flex items-center justify-between">
                    <span
                      className="text-xs font-medium"
                      style={{ color: 'rgba(255,255,255,0.7)' }}
                    >
                      {item.region}
                    </span>
                    <span
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.4)' }}
                    >
                      {formatNumber(item.farmerCount)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: 0.8 + index * 0.1, duration: 0.6 }}
                      className="h-full rounded-full"
                      style={{
                        background: `hsl(${140 + index * 20}, 80%, 60%)`,
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>

      {/* Activity Feed */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="rounded-2xl p-5"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="mb-5 flex items-center gap-2">
          <Activity size={16} style={{ color: '#00ff88' }} />
          <h3
            className="text-sm font-semibold"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            Recent Activity
          </h3>
        </div>
        <div className="space-y-3">
          {(activityData || []).slice(0, 8).map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 py-2"
              style={{ borderBottom: '1px solid rgba(255,255,255,0.04)' }}
            >
              <div
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold"
                style={{ background: 'rgba(0,255,136,0.1)', color: '#00ff88' }}
              >
                {item.user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  <span className="font-semibold">{item.user.name}</span>{' '}
                  <span style={{ color: 'rgba(255,255,255,0.4)' }}>
                    {item.action.toLowerCase()}{' '}
                    {item.tableName.replace(/_/g, ' ')}
                  </span>
                </p>
              </div>
              <span
                className="shrink-0 text-xs"
                style={{ color: 'rgba(255,255,255,0.25)' }}
              >
                {new Date(item.createdAt).toLocaleDateString()}
              </span>
            </div>
          ))}
          {!activityData?.length && (
            <p
              className="py-4 text-center text-sm"
              style={{ color: 'rgba(255,255,255,0.3)' }}
            >
              No recent activity
            </p>
          )}
        </div>
      </motion.div>
    </div>
  );
}
