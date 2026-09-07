'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  MapPin,
  Phone,
  Wheat,
  Calendar,
  User,
  QrCode,
  Camera,
  Package,
  BarChart3,
  Edit,
  Loader2,
  Download,
  Tag,
  Clock,
} from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';

import { apiClient } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { usePermissions } from '@/hooks/usePermissions';
import { useExport } from '@/hooks/useExport';
import { useToast } from '@/providers/ToastProvider';
import {
  formatDate,
  formatLandSize,
  formatYield,
  getFarmerStatusColor,
  getFarmerPhotoUrl,
  formatCount,
} from '@/lib/utils';

interface FarmerDetail {
  id: string;
  farmerId: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  photoUrl?: string;
  landSizeTimad?: number;
  landSizeHectare?: number;
  gpsLat?: number;
  gpsLng?: number;
  notes?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'FLAGGED' | 'PENDING';
  createdAt: string;
  updatedAt: string;
  kebele: {
    id: string;
    name: string;
    amharicName?: string;
    geoLat?: number;
    geoLng?: number;
    woreda: {
      id: string;
      name: string;
      zone: {
        id: string;
        name: string;
        region: { id: string; name: string };
      };
    };
  };
  primaryCrop?: {
    id: string;
    name: string;
    amharicName?: string;
    category: string;
  };
  farmerCrops: Array<{
    crop: { id: string; name: string; amharicName?: string; category: string };
    season: string;
    isPrimary: boolean;
  }>;
  registeredBy: { id: string; name: string; email: string };
  _count: { yieldReports: number; distributions: number };
}

interface FarmerHistory {
  farmerId: string;
  yieldReports: Array<{
    id: string;
    season: string;
    year: number;
    stage: string;
    quantityKg: number;
    notes?: string;
    createdAt: string;
    crop: { id: string; name: string; amharicName?: string };
    submittedBy: { id: string; name: string };
  }>;
  distributions: Array<{
    id: string;
    quantity: number;
    unit: string;
    season: string;
    year: number;
    createdAt: string;
    inputType: { id: string; name: string; category: string };
    organization: { id: string; name: string };
    distributedBy: { id: string; name: string };
  }>;
  totals: { yieldReports: number; distributions: number };
}

const stageColors: Record<string, string> = {
  PRE_HARVEST: '#fbbf24',
  HARVEST: '#00d4ff',
  FINAL: '#4ade80',
};

export default function FarmerProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const queryClient = useQueryClient();
  const permissions = usePermissions();
  const { downloadQRCode, downloadReceipt } = useExport();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<
    'overview' | 'yields' | 'distributions' | 'qrcode'
  >('overview');
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  const { data: farmer, isLoading } = useQuery({
    queryKey: queryKeys.farmers.detail(id),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: FarmerDetail;
      }>(`/farmers/${id}`);
      return res.data.data;
    },
    enabled: !!id,
  });

  const { data: history } = useQuery({
    queryKey: queryKeys.farmers.history(id),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: FarmerHistory;
      }>(`/farmers/${id}/history`);
      return res.data.data;
    },
    enabled: !!id && (activeTab === 'yields' || activeTab === 'distributions'),
  });

  const { data: qrData } = useQuery({
    queryKey: queryKeys.farmers.qrCode(id),
    queryFn: async () => {
      const res = await apiClient.get<{
        success: boolean;
        data: { farmerId: string; qrCode: string };
      }>(`/farmers/${id}/qrcode`);
      return res.data.data;
    },
    enabled: !!id && activeTab === 'qrcode',
  });

  const handlePhotoUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file || !farmer) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error('File too large', 'Photo must be under 5MB.');
      return;
    }

    setUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('photo', file);
      await apiClient.post(`/farmers/${id}/photo`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      await queryClient.invalidateQueries({
        queryKey: queryKeys.farmers.detail(id),
      });
      toast.success('Photo uploaded', 'Farmer photo updated successfully.');
    } catch {
      toast.error('Upload failed', 'Could not upload the photo. Please try again.');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      await apiClient.patch(`/farmers/${id}/status`, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.farmers.detail(id),
      });
      toast.success('Status updated', 'Farmer status has been updated.');
    },
    onError: () => {
      toast.error('Update failed', 'Could not update farmer status.');
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div
          className="h-8 w-48 rounded-xl shimmer"
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
        <div
          className="h-64 rounded-2xl shimmer"
          style={{ background: 'rgba(255,255,255,0.04)' }}
        />
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="text-center py-20">
        <User
          size={48}
          className="mx-auto mb-4"
          style={{ color: 'rgba(255,255,255,0.15)' }}
        />
        <p style={{ color: 'rgba(255,255,255,0.4)' }}>Farmer not found</p>
        <Link
          href="/farmers"
          className="mt-4 inline-block text-sm"
          style={{ color: '#00ff88' }}
        >
          Back to Farmer Registry
        </Link>
      </div>
    );
  }

  const statusColor = getFarmerStatusColor(farmer.status);

  const tabs = [
    { id: 'overview', label: 'Overview', icon: User },
    {
      id: 'yields',
      label: `Yields (${farmer._count.yieldReports})`,
      icon: BarChart3,
    },
    {
      id: 'distributions',
      label: `Distributions (${farmer._count.distributions})`,
      icon: Package,
    },
    { id: 'qrcode', label: 'QR Code', icon: QrCode },
  ];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-xl transition-colors"
          style={{
            background: 'rgba(255,255,255,0.05)',
            color: 'rgba(255,255,255,0.6)',
          }}
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <h1
            className="text-2xl font-bold"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {farmer.firstName} {farmer.lastName}
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            {farmer.farmerId}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="px-3 py-1 rounded-full text-xs font-semibold"
            style={{
              background: statusColor.bg,
              color: statusColor.text,
              border: `1px solid ${statusColor.border}`,
            }}
          >
            {farmer.status}
          </span>
          {permissions.canEditFarmers && (
            <Link
              href={`/farmers/${id}/edit`}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm font-medium"
              style={{
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.10)',
                color: 'rgba(255,255,255,0.7)',
              }}
            >
              <Edit size={14} />
              Edit
            </Link>
          )}
        </div>
      </div>

      {/* Profile Card */}
      <div
        className="p-6 rounded-2xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
        }}
      >
        <div className="flex items-start gap-6">
          {/* Photo */}
          <div className="relative shrink-0">
            <div
              className="w-24 h-24 rounded-2xl overflow-hidden flex items-center justify-center"
              style={{ background: 'rgba(0,255,136,0.1)' }}
            >
              {farmer.photoUrl ? (
                <Image
                  src={getFarmerPhotoUrl(farmer.photoUrl)}
                  alt={`${farmer.firstName} ${farmer.lastName}`}
                  width={96}
                  height={96}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span
                  className="text-2xl font-bold"
                  style={{ color: '#00ff88' }}
                >
                  {farmer.firstName[0]}
                  {farmer.lastName[0]}
                </span>
              )}
            </div>
            {permissions.canUploadFarmerPhoto && (
              <label
                className="absolute -bottom-2 -right-2 w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                }}
              >
                {uploadingPhoto ? (
                  <Loader2
                    size={14}
                    color="#001a0e"
                    className="animate-spin"
                  />
                ) : (
                  <Camera size={14} color="#001a0e" />
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                  disabled={uploadingPhoto}
                />
              </label>
            )}
          </div>

          {/* Info Grid */}
          <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-4">
            {farmer.phone && (
              <div className="flex items-start gap-2">
                <Phone
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                />
                <div>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Phone
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {farmer.phone}
                  </p>
                </div>
              </div>
            )}

            {farmer.gender && (
              <div className="flex items-start gap-2">
                <User
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                />
                <div>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Gender
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {farmer.gender}
                  </p>
                </div>
              </div>
            )}

            {farmer.dateOfBirth && (
              <div className="flex items-start gap-2">
                <Calendar
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                />
                <div>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Date of Birth
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {formatDate(farmer.dateOfBirth)}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <MapPin
                size={14}
                className="mt-0.5 shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              <div>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Location
                </p>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {farmer.kebele.name}, {farmer.kebele.woreda.name}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}
                >
                  {farmer.kebele.woreda.zone.name},{' '}
                  {farmer.kebele.woreda.zone.region.name}
                </p>
              </div>
            </div>

            <div className="flex items-start gap-2">
              <Wheat
                size={14}
                className="mt-0.5 shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              <div>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Land Size
                </p>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {formatLandSize(farmer.landSizeHectare, farmer.landSizeTimad)}
                </p>
              </div>
            </div>

            {farmer.primaryCrop && (
              <div className="flex items-start gap-2">
                <Tag
                  size={14}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'rgba(255,255,255,0.3)' }}
                />
                <div>
                  <p
                    className="text-xs"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    Primary Crop
                  </p>
                  <p
                    className="text-sm font-medium"
                    style={{ color: 'rgba(255,255,255,0.8)' }}
                  >
                    {farmer.primaryCrop.name}
                  </p>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2">
              <Clock
                size={14}
                className="mt-0.5 shrink-0"
                style={{ color: 'rgba(255,255,255,0.3)' }}
              />
              <div>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  Registered
                </p>
                <p
                  className="text-sm font-medium"
                  style={{ color: 'rgba(255,255,255,0.8)' }}
                >
                  {formatDate(farmer.createdAt)}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                >
                  by {farmer.registeredBy.name}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Status Change */}
        {permissions.canChangeFarmerStatus && (
          <div
            className="mt-6 pt-4 flex items-center gap-3"
            style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}
          >
            <span
              className="text-xs font-medium"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Change Status:
            </span>
            {(
              ['ACTIVE', 'INACTIVE', 'FLAGGED', 'PENDING'] as const
            ).map((s) => {
              const sc = getFarmerStatusColor(s);
              return (
                <button
                  key={s}
                  onClick={() => statusMutation.mutate(s)}
                  disabled={farmer.status === s || statusMutation.isPending}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold transition-all duration-200 disabled:opacity-40"
                  style={{
                    background: farmer.status === s ? sc.bg : 'rgba(255,255,255,0.05)',
                    color: farmer.status === s ? sc.text : 'rgba(255,255,255,0.5)',
                    border: `1px solid ${farmer.status === s ? sc.border : 'rgba(255,255,255,0.08)'}`,
                  }}
                >
                  {s}
                </button>
              );
            })}
          </div>
        )}

        {farmer.notes && (
          <div
            className="mt-4 p-3 rounded-xl"
            style={{ background: 'rgba(255,255,255,0.03)' }}
          >
            <p
              className="text-xs font-medium mb-1"
              style={{ color: 'rgba(255,255,255,0.35)' }}
            >
              Notes
            </p>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.6)' }}>
              {farmer.notes}
            </p>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1 rounded-xl"
        style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 flex-1 justify-center"
            style={{
              background:
                activeTab === tab.id ? 'rgba(0,255,136,0.1)' : 'transparent',
              color:
                activeTab === tab.id ? '#00ff88' : 'rgba(255,255,255,0.45)',
              border:
                activeTab === tab.id
                  ? '1px solid rgba(0,255,136,0.2)'
                  : '1px solid transparent',
            }}
          >
            <tab.icon size={14} />
            <span className="hidden sm:inline">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
      >
        {activeTab === 'overview' && (
          <div className="space-y-4">
            {farmer.farmerCrops.length > 0 && (
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
                  All Crops
                </h3>
                <div className="flex flex-wrap gap-2">
                  {farmer.farmerCrops.map((fc, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-lg text-xs font-medium"
                      style={{
                        background: fc.isPrimary
                          ? 'rgba(0,255,136,0.1)'
                          : 'rgba(255,255,255,0.05)',
                        color: fc.isPrimary
                          ? '#00ff88'
                          : 'rgba(255,255,255,0.6)',
                        border: `1px solid ${fc.isPrimary ? 'rgba(0,255,136,0.2)' : 'rgba(255,255,255,0.08)'}`,
                      }}
                    >
                      {fc.crop.name}{' '}
                      {fc.isPrimary ? '(Primary)' : `— ${fc.season}`}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {farmer.gpsLat && farmer.gpsLng && (
              <div
                className="p-5 rounded-2xl"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <h3
                  className="text-sm font-semibold mb-3"
                  style={{ color: 'rgba(255,255,255,0.7)' }}
                >
                  GPS Coordinates
                </h3>
                <div className="flex items-center gap-4">
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Latitude
                    </p>
                    <p
                      className="text-sm font-mono"
                      style={{ color: '#00ff88' }}
                    >
                      {farmer.gpsLat.toFixed(6)}
                    </p>
                  </div>
                  <div>
                    <p
                      className="text-xs"
                      style={{ color: 'rgba(255,255,255,0.35)' }}
                    >
                      Longitude
                    </p>
                    <p
                      className="text-sm font-mono"
                      style={{ color: '#00d4ff' }}
                    >
                      {farmer.gpsLng.toFixed(6)}
                    </p>
                  </div>

                  <a
                    href={`https://maps.google.com/?q=${farmer.gpsLat},${farmer.gpsLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium ml-auto"
                    style={{
                      background: 'rgba(0,212,255,0.1)',
                      color: '#00d4ff',
                      border: '1px solid rgba(0,212,255,0.2)',
                    }}
                  >
                    <MapPin size={12} />
                    View on Map
                  </a>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-3xl font-bold mb-1"
                  style={{ color: '#00ff88' }}
                >
                  {formatCount(farmer._count.yieldReports)}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  Yield Reports
                </p>
              </div>
              <div
                className="p-4 rounded-2xl text-center"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              >
                <p
                  className="text-3xl font-bold mb-1"
                  style={{ color: '#00d4ff' }}
                >
                  {formatCount(farmer._count.distributions)}
                </p>
                <p
                  className="text-xs"
                  style={{ color: 'rgba(255,255,255,0.45)' }}
                >
                  Distributions Received
                </p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'yields' && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {!history?.yieldReports.length ? (
              <div className="p-12 text-center">
                <BarChart3
                  size={36}
                  className="mx-auto mb-3"
                  style={{ color: 'rgba(255,255,255,0.15)' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>
                  No yield reports yet
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                {history.yieldReports.map((yr) => (
                  <div
                    key={yr.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-2 h-2 rounded-full"
                        style={{
                          background: stageColors[yr.stage] || '#00ff88',
                        }}
                      />
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                        >
                          {yr.crop.name} — {yr.season} {yr.year}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {yr.stage.replace('_', ' ')} •{' '}
                          {formatDate(yr.createdAt)} • by{' '}
                          {yr.submittedBy.name}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className="text-sm font-bold"
                        style={{ color: '#00ff88' }}
                      >
                        {formatYield(yr.quantityKg)}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.3)' }}
                      >
                        {formatYield(yr.quantityKg, 'tons')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'distributions' && (
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {!history?.distributions.length ? (
              <div className="p-12 text-center">
                <Package
                  size={36}
                  className="mx-auto mb-3"
                  style={{ color: 'rgba(255,255,255,0.15)' }}
                />
                <p style={{ color: 'rgba(255,255,255,0.35)' }}>
                  No distributions received yet
                </p>
              </div>
            ) : (
              <div
                className="divide-y"
                style={{ borderColor: 'rgba(255,255,255,0.05)' }}
              >
                {history.distributions.map((dist) => (
                  <div
                    key={dist.id}
                    className="p-4 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center"
                        style={{ background: 'rgba(0,212,255,0.1)' }}
                      >
                        <Package size={14} style={{ color: '#00d4ff' }} />
                      </div>
                      <div>
                        <p
                          className="text-sm font-medium"
                          style={{ color: 'rgba(255,255,255,0.8)' }}
                        >
                          {dist.inputType.name}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'rgba(255,255,255,0.35)' }}
                        >
                          {dist.organization.name} • {dist.season} {dist.year}
                        </p>
                        <p
                          className="text-xs"
                          style={{ color: 'rgba(255,255,255,0.25)' }}
                        >
                          by {dist.distributedBy.name} •{' '}
                          {formatDate(dist.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-right mr-2">
                        <p
                          className="text-sm font-bold"
                          style={{ color: '#00d4ff' }}
                        >
                          {dist.quantity} {dist.unit}
                        </p>
                      </div>
                      {permissions.canDownloadDistributionReceipt && (
                        <button
                          onClick={() => downloadReceipt(dist.id)}
                          className="p-1.5 rounded-lg transition-colors"
                          style={{
                            background: 'rgba(123,47,255,0.1)',
                            color: '#7b2fff',
                          }}
                          title="Download Receipt"
                        >
                          <Download size={13} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'qrcode' && (
          <div
            className="p-8 rounded-2xl text-center"
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <h3
              className="text-lg font-bold mb-2"
              style={{ color: 'rgba(255,255,255,0.9)' }}
            >
              Farmer QR Code
            </h3>
            <p
              className="text-sm mb-6"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              Scan to identify this farmer quickly during field operations
            </p>

            {qrData ? (
              <div className="inline-block">
                <div className="p-4 rounded-2xl mb-4" style={{ background: '#fff' }}>
                  <Image
                    src={qrData.qrCode}
                    alt={`QR Code for ${farmer.firstName} ${farmer.lastName}`}
                    width={200}
                    height={200}
                  />
                </div>
                <p
                  className="text-sm font-mono mb-6"
                  style={{ color: 'rgba(255,255,255,0.5)' }}
                >
                  {qrData.farmerId}
                </p>
                <button
                  onClick={() =>
                    downloadQRCode(
                      farmer.id,
                      `${farmer.firstName} ${farmer.lastName}`,
                    )
                  }
                  className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold mx-auto"
                  style={{
                    background: 'linear-gradient(135deg, #00ff88, #00d4ff)',
                    color: '#001a0e',
                  }}
                >
                  <Download size={15} />
                  Download QR Code
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-center py-8">
                <Loader2
                  size={24}
                  className="animate-spin"
                  style={{ color: '#00ff88' }}
                />
              </div>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}
