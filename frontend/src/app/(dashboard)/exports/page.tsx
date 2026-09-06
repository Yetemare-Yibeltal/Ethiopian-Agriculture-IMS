'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileDown,
  Users,
  Wheat,
  Package,
  BarChart3,
  Download,
  FileSpreadsheet,
  FileText,
  Clock,
  CheckCircle,
  Loader2,
  AlertCircle,
} from 'lucide-react';

import { usePermissions } from '@/hooks/usePermissions';
import { useExport, useExportHistory } from '@/hooks/useExport';
import { formatDateTime, getCurrentSeason } from '@/lib/utils';

// ─── Types ────────────────────────────────────────────────
type ExportType = 'farmers' | 'yields' | 'distributions';
type ExportFormat = 'excel' | 'pdf';

// ─── Export Card Component ────────────────────────────────
function ExportCard({
  title,
  description,
  icon: Icon,
  color,
  onExportExcel,
  onExportPDF,
  isExporting,
  disabled,
}: {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  onExportExcel: () => void;
  onExportPDF?: () => void;
  isExporting: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-5 rounded-2xl"
      style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        opacity: disabled ? 0.5 : 1,
      }}
    >
      <div className="flex items-start gap-4 mb-5">
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
          style={{ background: `${color}18` }}
        >
          <Icon size={20} style={{ color }} />
        </div>
        <div className="flex-1">
          <h3
            className="text-sm font-bold mb-1"
            style={{ color: 'rgba(255,255,255,0.9)' }}
          >
            {title}
          </h3>
          <p
            className="text-xs leading-relaxed"
            style={{ color: 'rgba(255,255,255,0.45)' }}
          >
            {description}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={onExportExcel}
          disabled={isExporting || disabled}
          className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50"
          style={{
            background: 'rgba(74,222,128,0.1)',
            border: '1px solid rgba(74,222,128,0.2)',
            color: '#4ade80',
          }}
        >
          {isExporting ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <FileSpreadsheet size={13} />
          )}
          {isExporting ? 'Exporting...' : 'Excel (.xlsx)'}
        </button>

        {onExportPDF && (
          <button
            onClick={onExportPDF}
            disabled={isExporting || disabled}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: 'rgba(96,165,250,0.1)',
              border: '1px solid rgba(96,165,250,0.2)',
              color: '#60a5fa',
            }}
          >
            {isExporting ? (
              <Loader2 size={13} className="animate-spin" />
            ) : (
              <FileText size={13} />
            )}
            {isExporting ? 'Exporting...' : 'PDF'}
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ─── Exports Page ─────────────────────────────────────────
export default function ExportsPage() {
  const permissions = usePermissions();
  const {
    exportFarmers,
    exportYields,
    exportDistributions,
    isExportingFarmers,
    isExportingYields,
    isExportingDistributions,
  } = useExport();
  const { data: exportHistory = [], isLoading: historyLoading } =
    useExportHistory();

  const currentSeason = getCurrentSeason();
  const currentYear = new Date().getFullYear();

  const [season, setSeason] = useState(currentSeason);
  const [year, setYear] = useState(currentYear);

  const statusIcons = {
    COMPLETED: <CheckCircle size={14} style={{ color: '#4ade80' }} />,
    PROCESSING: <Loader2 size={14} className="animate-spin" style={{ color: '#fbbf24' }} />,
    QUEUED: <Clock size={14} style={{ color: '#60a5fa' }} />,
    FAILED: <AlertCircle size={14} style={{ color: '#f87171' }} />,
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
            Data Exports
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>
            Download system data as Excel or PDF reports
          </p>
        </div>

        {/* Season & Year Filters */}
        <div className="flex items-center gap-2">
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
        </div>
      </div>

      {/* Info Banner */}
      <div
        className="flex items-start gap-3 p-4 rounded-2xl"
        style={{
          background: 'rgba(0,212,255,0.06)',
          border: '1px solid rgba(0,212,255,0.15)',
        }}
      >
        <Download
          size={16}
          className="mt-0.5 shrink-0"
          style={{ color: '#00d4ff' }}
        />
        <div>
          <p
            className="text-sm font-medium mb-1"
            style={{ color: 'rgba(255,255,255,0.8)' }}
          >
            Exporting for {season} {year} season
          </p>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            All exports are generated in real-time from the current database. Large exports may take a few seconds to generate. Files are downloaded directly to your browser.
          </p>
        </div>
      </div>

      {/* Export Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {permissions.canExportFarmers && (
          <ExportCard
            title="Farmer Registry"
            description="Complete list of all registered farmers with their personal details, GPS coordinates, land size, and crop information across all regions."
            icon={Users}
            color="#00ff88"
            onExportExcel={() => exportFarmers({ format: 'excel' })}
            onExportPDF={() => exportFarmers({ format: 'pdf' })}
            isExporting={isExportingFarmers}
          />
        )}

        {permissions.canExportYields && (
          <ExportCard
            title="Yield Reports"
            description="Yield data for the selected season and year including pre-harvest estimates, harvest quantities, and final production figures by crop and region."
            icon={Wheat}
            color="#00d4ff"
            onExportExcel={() => exportYields({ season, year })}
            isExporting={isExportingYields}
          />
        )}

        {permissions.canExportDistributions && (
          <ExportCard
            title="Distribution Summary"
            description="Complete aid distribution records for the selected season showing all inputs distributed, quantities, organizations, and farmers reached."
            icon={Package}
            color="#7b2fff"
            onExportExcel={() => exportDistributions({ season, year })}
            isExporting={isExportingDistributions}
          />
        )}
      </div>

      {/* Export History */}
      {permissions.canViewExportHistory && (
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
          }}
        >
          <div
            className="flex items-center gap-2 px-5 py-4"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
          >
            <Clock size={15} style={{ color: 'rgba(255,255,255,0.5)' }} />
            <h3
              className="text-sm font-semibold"
              style={{ color: 'rgba(255,255,255,0.8)' }}
            >
              Export History
            </h3>
          </div>

          {historyLoading ? (
            <div className="p-8 space-y-3">
              {[...Array(3)].map((_, i) => (
                <div
                  key={i}
                  className="h-12 rounded-xl shimmer"
                  style={{ background: 'rgba(255,255,255,0.04)' }}
                />
              ))}
            </div>
          ) : exportHistory.length === 0 ? (
            <div className="p-12 text-center">
              <FileDown
                size={36}
                className="mx-auto mb-3"
                style={{ color: 'rgba(255,255,255,0.15)' }}
              />
              <p style={{ color: 'rgba(255,255,255,0.35)' }}>
                No export history yet
              </p>
            </div>
          ) : (
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              {exportHistory.map((job) => (
                <div
                  key={job.id}
                  className="flex items-center justify-between px-5 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center"
                      style={{ background: 'rgba(255,255,255,0.05)' }}
                    >
                      {job.format === 'EXCEL' ? (
                        <FileSpreadsheet
                          size={14}
                          style={{ color: '#4ade80' }}
                        />
                      ) : (
                        <FileText
                          size={14}
                          style={{ color: '#60a5fa' }}
                        />
                      )}
                    </div>
                    <div>
                      <p
                        className="text-sm font-medium"
                        style={{ color: 'rgba(255,255,255,0.8)' }}
                      >
                        {job.type.replace(/_/g, ' ')}
                      </p>
                      <p
                        className="text-xs"
                        style={{ color: 'rgba(255,255,255,0.35)' }}
                      >
                        by {job.user.name} •{' '}
                        {formatDateTime(job.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1.5">
                      {statusIcons[job.status as keyof typeof statusIcons]}
                      <span
                        className="text-xs font-medium"
                        style={{ color: 'rgba(255,255,255,0.5)' }}
                      >
                        {job.status}
                      </span>
                    </div>
                    {job.status === 'COMPLETED' && job.fileUrl && (
                      <a
                        href={job.fileUrl}
                        download
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: 'rgba(0,255,136,0.08)',
                          border: '1px solid rgba(0,255,136,0.15)',
                          color: '#00ff88',
                        }}
                      >
                        <Download size={11} />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
