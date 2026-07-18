'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiClient, downloadFile } from '@/lib/apiClient';
import { queryKeys } from '@/lib/queryKeys';
import { useToast } from '@/providers/ToastProvider';

export type ExportFormat = 'excel' | 'pdf';

export interface ExportFarmersParams {
  regionId?: string;
  zoneId?: string;
  woredaId?: string;
  status?: 'ACTIVE' | 'INACTIVE' | 'FLAGGED' | 'PENDING';
  format?: ExportFormat;
}

export interface ExportYieldsParams {
  season?: 'Meher' | 'Belg';
  year?: number;
  regionId?: string;
  stage?: 'PRE_HARVEST' | 'HARVEST' | 'FINAL';
}

export interface ExportDistributionsParams {
  season?: 'Meher' | 'Belg';
  year?: number;
  orgId?: string;
  regionId?: string;
}

export interface ExportJob {
  id: string;
  type: string;
  format: string;
  status: 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  fileUrl?: string;
  filters?: Record<string, unknown>;
  createdAt: string;
  completedAt?: string;
  user: {
    id: string;
    name: string;
  };
}

export function useExport() {
  const [isExporting, setIsExporting] = useState(false);
  const [exportingType, setExportingType] = useState<string | null>(null);
  const { toast } = useToast();

  const exportFarmers = useCallback(
    async (params: ExportFarmersParams = {}) => {
      const format = params.format || 'excel';
      const filename = `farmer-registry-${Date.now()}.${format === 'excel' ? 'xlsx' : 'pdf'}`;
      setIsExporting(true);
      setExportingType('farmers');
      try {
        toast.info(
          'Generating export',
          'Your farmer registry export is being prepared...',
        );
        await downloadFile('/exports/farmers', filename, 'POST', {
          ...params,
          format,
        });
        toast.success(
          'Export complete',
          `Farmer registry downloaded as ${filename}`,
        );
      } catch (error) {
        console.error('Export failed:', error);
        toast.error(
          'Export failed',
          'Could not generate the farmer registry export. Please try again.',
        );
      } finally {
        setIsExporting(false);
        setExportingType(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  const exportYields = useCallback(
    async (params: ExportYieldsParams = {}) => {
      const currentYear = new Date().getFullYear();
      const season = params.season || 'Meher';
      const year = params.year || currentYear;
      const filename = `yield-report-${season}-${year}-${Date.now()}.xlsx`;
      setIsExporting(true);
      setExportingType('yields');
      try {
        toast.info(
          'Generating export',
          'Your yield report export is being prepared...',
        );
        await downloadFile('/exports/yields', filename, 'POST', params);
        toast.success(
          'Export complete',
          `Yield report downloaded as ${filename}`,
        );
      } catch (error) {
        console.error('Export failed:', error);
        toast.error(
          'Export failed',
          'Could not generate the yield report export. Please try again.',
        );
      } finally {
        setIsExporting(false);
        setExportingType(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  const exportDistributions = useCallback(
    async (params: ExportDistributionsParams = {}) => {
      const currentYear = new Date().getFullYear();
      const season = params.season || 'Meher';
      const year = params.year || currentYear;
      const filename = `distributions-${season}-${year}-${Date.now()}.xlsx`;
      setIsExporting(true);
      setExportingType('distributions');
      try {
        toast.info(
          'Generating export',
          'Your distribution export is being prepared...',
        );
        await downloadFile('/exports/distributions', filename, 'POST', params);
        toast.success(
          'Export complete',
          `Distribution report downloaded as ${filename}`,
        );
      } catch (error) {
        console.error('Export failed:', error);
        toast.error(
          'Export failed',
          'Could not generate the distribution export. Please try again.',
        );
      } finally {
        setIsExporting(false);
        setExportingType(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  const downloadReceipt = useCallback(
    async (distributionId: string) => {
      const filename = `receipt-${distributionId}.pdf`;
      setIsExporting(true);
      setExportingType('receipt');
      try {
        await downloadFile(
          `/distributions/${distributionId}/receipt`,
          filename,
          'GET',
        );
        toast.success(
          'Receipt downloaded',
          `Distribution receipt saved as ${filename}`,
        );
      } catch (error) {
        console.error('Receipt download failed:', error);
        toast.error(
          'Download failed',
          'Could not download the distribution receipt.',
        );
      } finally {
        setIsExporting(false);
        setExportingType(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  const downloadQRCode = useCallback(
    async (farmerId: string, farmerName: string) => {
      setIsExporting(true);
      setExportingType('qrcode');
      try {
        const response = await apiClient.get<{
          success: boolean;
          data: { farmerId: string; qrCode: string };
        }>(`/farmers/${farmerId}/qrcode`);

        if (response.data.success) {
          const qrDataUrl = response.data.data.qrCode;
          const link = document.createElement('a');
          link.href = qrDataUrl;
          link.download = `farmer-qr-${response.data.data.farmerId}.png`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          toast.success(
            'QR code downloaded',
            `QR code for ${farmerName} saved successfully.`,
          );
        }
      } catch (error) {
        console.error('QR code download failed:', error);
        toast.error(
          'Download failed',
          'Could not download the farmer QR code.',
        );
      } finally {
        setIsExporting(false);
        setExportingType(null);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [toast],
  );

  return {
    isExporting,
    exportingType,
    exportFarmers,
    exportYields,
    exportDistributions,
    downloadReceipt,
    downloadQRCode,
    isExportingFarmers: isExporting && exportingType === 'farmers',
    isExportingYields: isExporting && exportingType === 'yields',
    isExportingDistributions: isExporting && exportingType === 'distributions',
    isDownloadingReceipt: isExporting && exportingType === 'receipt',
    isDownloadingQR: isExporting && exportingType === 'qrcode',
  };
}

export function useExportHistory() {
  return useQuery({
    queryKey: queryKeys.exports.history(),
    queryFn: async () => {
      const response = await apiClient.get<{
        success: boolean;
        data: ExportJob[];
      }>('/exports/history');
      return response.data.data;
    },
    staleTime: 2 * 60 * 1000,
  });
}

export default useExport;
