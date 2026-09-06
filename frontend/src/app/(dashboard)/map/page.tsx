'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Map,
  Filter,
  Layers,
  Users,
  ZoomIn,
  ZoomOut,
  RefreshCw,
  Info,
} from 'lucide-react';
import dynamic from 'next/dynamic';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { formatCount, getCurrentSeason } from '@/lib/utils';

// ─── Dynamic import to avoid SSR issues with Leaflet ─────
const MapContainer = dynamic(
  () => import('react-leaflet').then((mod) => mod.MapContainer),
  { ssr: false },
);
const TileLayer = dynamic(
  () => import('react-leaflet').then((mod) => mod.TileLayer),
  { ssr: false },
);
const CircleMarker = dynamic(
  () => import('react-leaflet').then((mod) => mod.CircleMarker),
  { ssr: false },
);
const Popup = dynamic(
  () => import('react-leaflet').then((mod) => mod.Popup),
  { ssr: false },
);

// ─── Types ────────────────────────────────────────────────
interface FarmerMapPoint {
  id: string;
  farmerId: string;
  firstName: string;
  lastName: string;
  gpsLat: number;
  gpsLng: number;
  status: string;
  kebele: { name: string; woreda: { name: string; zone: { region: { name: string } } } };
  primaryCrop?: { name: string };
}

interface MapStats {
  totalWithGPS: number;
  totalFarmers: number;
  coveragePercent: number;
  byRegion: Array<{ region: string; count: number }>;
}

// ─── Status Colors ────────────────────────────────────────
const statusColors: Record<string, string> = {
  ACTIVE: '#00ff88',
  INACTIVE: 'rgba(255,255,255,0.4)',
  FLAGGED: '#f87171',
  PENDING: '#fbbf24',
};

// ─── Map Page ─────────────────────────────────────────────
export default function MapPage() {
  const permissions = usePermissions();
  const currentSeason = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  const [mapLayer, setMapLayer] = useState<'farmers' | 'heatmap'>('farmers');
  const [statusFilter, setStatusFilter] = useState('');
  const [regionFilter, setRegionFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // ── Fetch Farmer Map Points ──────────────────────────
  const { data: farmerPoints = [], isLoading, refetch } = useQuery({
    queryKey: queryKeys.map.farmers({
      status: statusFilter || undefined,
      regionId: regionFilter || undefined,
    }),
    queryFn: async () => {
      const params = new URLSearchParams({
        ...(statusFilter && { status: statusFilter }),
        ...(regionFilter && { regionId: regionFilter }),
        limit: '2000',
      });
      const res = await apiClient.get<{
        success: boolean;
        data: FarmerMapPoint[];
      }>(`/map/farmers?${params}`);
      return res.data.data;
    },
  });

  // ── Fetch Map Stats ──────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: queryKeys.dashboard.stats(),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: MapStats;
      }>('/map/stats');
      return res.data.data;
    },
  });

  // ── Fetch Regions for filter ─────────────────────────
  const { data: regions = [] } = useQuery({
    queryKey: queryKeys.regions.list(),
    queryFn: async () => {
      const res = await apiClient.get<{
        data: Array<{ id: string; name: string }>;
      }>('/regions');
      return res.data.data;
    },
  });

  return (
    <div className="space-y-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1
            className="text-2xl font-bold mb-1"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            Agricultural Map
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {farmerPoints.length > 0
              ? `${formatCount(farmerPoints.length)} farmers with GPS coordinates`
              : 'Loading map data...'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium"
            style={{
              background: showFilters
                ? 'rgba(0,255,136,0.1)'
                : 'rgba(255,255,255,0.05)',
              border: `1px solid ${showFilters ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.08)'}`,
              color: showFilters ? '#00ff88' : 'rgba(255,255,255,0.6)',
            }}
          >
            <Filter size={14} />
            Filters
          </button>
          <button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.5)',
            }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          {
            label: 'Farmers on Map',
            value: formatCount(farmerPoints.length),
            color: '#00ff88',
            icon: Users,
          },
          {
            label: 'GPS Coverage',
            value: `${stats?.coveragePercent ?? 0}%`,
            color: '#00d4ff',
            icon: Map,
          },
          {
            label: 'Active Season',
            value: currentSeason,
            color: '#7b2fff',
            icon: Layers,
          },
          {
            label: 'Year',
            value: String(currentYear),
            color: '#fbbf24',
            icon: Info,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="p-3 rounded-xl flex items-center gap-3"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div
              className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
              style={{ background: `${stat.color}18` }}
            >
              <stat.icon size={15} style={{ color: stat.color }} />
            </div>
            <div>
              <p
                className="text-sm font-bold"
                style={{ color: 'rgba(255,255,255,0.9)' }}
              >
                {stat.value}
              </p>
              <p
                className="text-xs"
                style={{ color: 'rgba(255,255,255,0.4)' }}
              >
                {stat.label}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      {showFilters && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="p-4 rounded-2xl flex items-center gap-3 flex-wrap"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
          </select>

          <select
            value={regionFilter}
            onChange={(e) => setRegionFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-sm"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
              color: 'rgba(255,255,255,0.7)',
              outline: 'none',
            }}
          >
            <option value="">All Regions</option>
            {regions.map((r) => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>

          {/* Layer Toggle */}
          <div
            className="flex items-center gap-1 p-1 rounded-xl ml-auto"
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {(['farmers', 'heatmap'] as const).map((layer) => (
              <button
                key={layer}
                onClick={() => setMapLayer(layer)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-all"
                style={{
                  background:
                    mapLayer === layer
                      ? 'rgba(0,255,136,0.15)'
                      : 'transparent',
                  color:
                    mapLayer === layer
                      ? '#00ff88'
                      : 'rgba(255,255,255,0.5)',
                }}
              >
                {layer}
              </button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 flex-wrap">
        {Object.entries(statusColors).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ background: color }}
            />
            <span
              className="text-xs"
              style={{ color: 'rgba(255,255,255,0.5)' }}
            >
              {status}
            </span>
          </div>
        ))}
      </div>

      {/* Map Container */}
      <div
        className="rounded-2xl overflow-hidden"
        style={{
          height: '560px',
          border: '1px solid rgba(255,255,255,0.08)',
          position: 'relative',
        }}
      >
        {isLoading && (
          <div
            className="absolute inset-0 z-10 flex items-center justify-center"
            style={{ background: 'rgba(6,13,24,0.8)' }}
          >
            <div className="text-center">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                }}
              >
                <Map size={20} color="#001a0e" />
              </div>
              <p
                className="text-sm"
                style={{ color: 'rgba(255,255,255,0.5)' }}
              >
                Loading map data...
              </p>
            </div>
          </div>
        )}

        {isClient && (
          <MapContainer
            center={[9.0, 38.7]}
            zoom={6}
            style={{ height: '100%', width: '100%', background: '#0a1a0e' }}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
              maxZoom={19}
            />

            {farmerPoints.map((farmer) => (
              <CircleMarker
                key={farmer.id}
                center={[farmer.gpsLat, farmer.gpsLng]}
                radius={5}
                pathOptions={{
                  fillColor: statusColors[farmer.status] || '#00ff88',
                  fillOpacity: 0.8,
                  color: 'rgba(255,255,255,0.3)',
                  weight: 1,
                }}
              >
                <Popup>
                  <div
                    style={{
                      background: 'rgba(6,13,24,0.95)',
                      color: 'rgba(255,255,255,0.9)',
                      padding: '8px',
                      borderRadius: '8px',
                      minWidth: '160px',
                      fontSize: '12px',
                    }}
                  >
                    <p
                      style={{
                        fontWeight: 700,
                        marginBottom: '4px',
                        color: '#00ff88',
                      }}
                    >
                      {farmer.firstName} {farmer.lastName}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                      ID: {farmer.farmerId}
                    </p>
                    <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                      {farmer.kebele.name},{' '}
                      {farmer.kebele.woreda.name}
                    </p>
                    {farmer.primaryCrop && (
                      <p style={{ color: 'rgba(255,255,255,0.6)', marginBottom: '2px' }}>
                        Crop: {farmer.primaryCrop.name}
                      </p>
                    )}
                    <p
                      style={{
                        color: statusColors[farmer.status],
                        fontWeight: 600,
                        marginTop: '4px',
                      }}
                    >
                      {farmer.status}
                    </p>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        )}

        {/* Zoom Controls */}
        <div
          className="absolute right-4 bottom-4 z-20 flex flex-col gap-1"
        >
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(6,13,24,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
            onClick={() => {}}
          >
            <ZoomIn size={14} />
          </button>
          <button
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              background: 'rgba(6,13,24,0.9)',
              border: '1px solid rgba(255,255,255,0.1)',
              color: 'rgba(255,255,255,0.7)',
            }}
            onClick={() => {}}
          >
            <ZoomOut size={14} />
          </button>
        </div>
      </div>

      {/* Top Regions */}
      {stats?.byRegion && stats.byRegion.length > 0 && (
        <div
          className="p-5 rounded-2xl"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <h3
            className="text-sm font-semibold mb-4"
            style={{ color: 'rgba(255,255,255,0.7)' }}
          >
            Farmers by Region
          </h3>
          <div className="space-y-3">
            {stats.byRegion.slice(0, 6).map((item, index) => {
              const maxCount = stats.byRegion[0]?.count || 1;
              const pct = Math.round((item.count / maxCount) * 100);
              return (
                <div key={item.region}>
                  <div className="flex items-center justify-between mb-1">
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
                      {formatCount(item.count)}
                    </span>
                  </div>
                  <div
                    className="h-1.5 rounded-full"
                    style={{ background: 'rgba(255,255,255,0.06)' }}
                  >
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ delay: index * 0.1, duration: 0.6 }}
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
        </div>
      )}
    </div>
  );
}
