import { Router } from 'express';
import { z } from 'zod';
import path from 'path';
import fs from 'fs';
import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';

import { authenticate } from '../middleware/authenticate';
import { authorize, UserRole } from '../middleware/authorize';
import { asyncHandler } from '../lib/asyncHandler';
import { ApiResponse } from '../lib/ApiResponse';
import { ApiError } from '../lib/ApiError';
import { db } from '../lib/db';
import { config } from '../config/env';

export const exportRouter = Router();

// ─── All export routes require authentication ─────────────
exportRouter.use(authenticate);

// ─── Ensure export directory exists ──────────────────────
const exportDir = path.join(process.cwd(), config.EXPORT_DIR);
if (!fs.existsSync(exportDir)) {
  fs.mkdirSync(exportDir, { recursive: true });
}

// ─── POST /api/v1/exports/farmers ────────────────────────
// Export full farmer registry to Excel
exportRouter.post(
  '/farmers',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      regionId: z.string().optional(),
      zoneId: z.string().optional(),
      woredaId: z.string().optional(),
      status: z.enum(['ACTIVE', 'INACTIVE', 'FLAGGED', 'PENDING']).optional(),
      format: z.enum(['excel', 'pdf']).default('excel'),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const { regionId, zoneId, woredaId, status, format } = parsed.data;

    // Create export job record
    const exportJob = await db.exportJob.create({
      data: {
        userId: req.user?.id ?? '',
        type: 'FARMER_REGISTRY',
        format: format.toUpperCase() as 'EXCEL' | 'PDF',
        status: 'PROCESSING',
        filters: JSON.stringify({
          regionId,
          zoneId,
          woredaId,
          status,
        }),
      },
    });

    // Fetch farmers
    const farmers = await db.farmer.findMany({
      where: {
        ...(status && { status }),
        ...(woredaId && { kebele: { woredaId } }),
        ...(zoneId && {
          kebele: { woreda: { zoneId } },
        }),
        ...(regionId && {
          kebele: { woreda: { zone: { regionId } } },
        }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        farmerId: true,
        firstName: true,
        lastName: true,
        phone: true,
        gender: true,
        landSizeHectare: true,
        landSizeTimad: true,
        gpsLat: true,
        gpsLng: true,
        status: true,
        createdAt: true,
        kebele: {
          select: {
            name: true,
            woreda: {
              select: {
                name: true,
                zone: {
                  select: {
                    name: true,
                    region: { select: { name: true } },
                  },
                },
              },
            },
          },
        },
        primaryCrop: {
          select: { name: true },
        },
        registeredBy: {
          select: { name: true },
        },
      },
      take: 50000,
    });

    if (format === 'excel') {
      // Generate Excel file
      const workbook = new ExcelJS.Workbook();
      workbook.creator = 'AgroEthiopia MIS';
      workbook.created = new Date();

      const sheet = workbook.addWorksheet('Farmer Registry', {
        pageSetup: { paperSize: 9, orientation: 'landscape' },
      });

      // Style header row
      sheet.columns = [
        { header: 'Farmer ID', key: 'farmerId', width: 18 },
        { header: 'First Name', key: 'firstName', width: 16 },
        { header: 'Last Name', key: 'lastName', width: 16 },
        { header: 'Phone', key: 'phone', width: 16 },
        { header: 'Gender', key: 'gender', width: 10 },
        { header: 'Region', key: 'region', width: 16 },
        { header: 'Zone', key: 'zone', width: 16 },
        { header: 'Woreda', key: 'woreda', width: 16 },
        { header: 'Kebele', key: 'kebele', width: 16 },
        {
          header: 'Land Size (ha)',
          key: 'landHectare',
          width: 15,
        },
        {
          header: 'Land Size (timad)',
          key: 'landTimad',
          width: 16,
        },
        { header: 'Primary Crop', key: 'crop', width: 16 },
        { header: 'GPS Latitude', key: 'lat', width: 14 },
        { header: 'GPS Longitude', key: 'lng', width: 14 },
        { header: 'Status', key: 'status', width: 12 },
        {
          header: 'Registered By',
          key: 'registeredBy',
          width: 18,
        },
        {
          header: 'Registration Date',
          key: 'createdAt',
          width: 18,
        },
      ];

      // Style header
      const headerRow = sheet.getRow(1);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F4E79' },
      };
      headerRow.alignment = { vertical: 'middle', horizontal: 'center' };
      headerRow.height = 20;

      // Add data rows
      farmers.forEach((farmer) => {
        sheet.addRow({
          farmerId: farmer.farmerId,
          firstName: farmer.firstName,
          lastName: farmer.lastName,
          phone: farmer.phone ?? '',
          gender: farmer.gender ?? '',
          region: farmer.kebele.woreda.zone.region.name,
          zone: farmer.kebele.woreda.zone.name,
          woreda: farmer.kebele.woreda.name,
          kebele: farmer.kebele.name,
          landHectare: farmer.landSizeHectare ?? '',
          landTimad: farmer.landSizeTimad ?? '',
          crop: farmer.primaryCrop?.name ?? '',
          lat: farmer.gpsLat ?? '',
          lng: farmer.gpsLng ?? '',
          status: farmer.status,
          registeredBy: farmer.registeredBy?.name ?? '',
          createdAt: new Date(farmer.createdAt).toLocaleDateString(),
        });
      });

      // Add borders to all cells
      sheet.eachRow((row, rowNumber) => {
        row.eachCell((cell) => {
          cell.border = {
            top: { style: 'thin' },
            left: { style: 'thin' },
            bottom: { style: 'thin' },
            right: { style: 'thin' },
          };
          if (rowNumber % 2 === 0) {
            cell.fill = {
              type: 'pattern',
              pattern: 'solid',
              fgColor: { argb: 'FFF2F2F2' },
            };
          }
        });
      });

      // Auto filter
      sheet.autoFilter = {
        from: 'A1',
        to: `Q${farmers.length + 1}`,
      };

      const filename = `farmer-registry-${Date.now()}.xlsx`;
      const filePath = path.join(exportDir, filename);

      await workbook.xlsx.writeFile(filePath);

      // Update export job
      await db.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: 'COMPLETED',
          fileUrl: filename,
          completedAt: new Date(),
        },
      });

      // Set download headers
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      );
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);

      readStream.on('end', () => {
        fs.unlink(filePath, () => {});
      });
    } else {
      // Generate PDF
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40,
        layout: 'landscape',
      });

      const filename = `farmer-registry-${Date.now()}.pdf`;
      const filePath = path.join(exportDir, filename);
      const writeStream = fs.createWriteStream(filePath);
      doc.pipe(writeStream);

      // PDF header
      doc
        .fontSize(18)
        .font('Helvetica-Bold')
        .text('AgroEthiopia MIS — Farmer Registry Report', {
          align: 'center',
        });

      doc
        .fontSize(10)
        .font('Helvetica')
        .text(
          `Generated: ${new Date().toLocaleDateString()} | Total Farmers: ${farmers.length}`,
          { align: 'center' },
        );

      doc.moveDown();

      // Table headers
      const tableTop = doc.y;
      const colWidths = [80, 80, 80, 80, 80, 80, 80, 80];
      const headers = [
        'Farmer ID',
        'Name',
        'Region',
        'Woreda',
        'Kebele',
        'Land (ha)',
        'Crop',
        'Status',
      ];

      doc.font('Helvetica-Bold').fontSize(8);
      let xPos = 40;

      headers.forEach((header, i) => {
        doc.text(header, xPos, tableTop, {
          width: colWidths[i],
          align: 'left',
        });
        xPos += colWidths[i];
      });

      doc.moveDown();
      doc.font('Helvetica').fontSize(7);

      // Add farmer rows (limit for PDF)
      farmers.slice(0, 500).forEach((farmer) => {
        if (doc.y > 540) {
          doc.addPage({ layout: 'landscape' });
        }

        const rowTop = doc.y;
        xPos = 40;
        const rowData = [
          farmer.farmerId,
          `${farmer.firstName} ${farmer.lastName}`,
          farmer.kebele.woreda.zone.region.name,
          farmer.kebele.woreda.name,
          farmer.kebele.name,
          farmer.landSizeHectare?.toString() ?? '-',
          farmer.primaryCrop?.name ?? '-',
          farmer.status,
        ];

        rowData.forEach((data, i) => {
          doc.text(data, xPos, rowTop, {
            width: colWidths[i],
            align: 'left',
          });
          xPos += colWidths[i];
        });

        doc.moveDown(0.5);
      });

      if (farmers.length > 500) {
        doc.moveDown();
        doc.text(
          `Note: PDF shows first 500 records. Use Excel export for all ${farmers.length} records.`,
          { align: 'center' },
        );
      }

      doc.end();

      await new Promise<void>((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
      });

      await db.exportJob.update({
        where: { id: exportJob.id },
        data: {
          status: 'COMPLETED',
          fileUrl: filename,
          completedAt: new Date(),
        },
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );

      const readStream = fs.createReadStream(filePath);
      readStream.pipe(res);

      readStream.on('end', () => {
        fs.unlink(filePath, () => {});
      });
    }
  }),
);

// ─── POST /api/v1/exports/yields ─────────────────────────
// Export yield report to Excel
exportRouter.post(
  '/yields',
  authorize([UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.VIEWER]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      regionId: z.string().optional(),
      stage: z.enum(['PRE_HARVEST', 'HARVEST', 'FINAL']).optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
      regionId,
      stage,
    } = parsed.data;

    const yields = await db.yieldReport.findMany({
      where: {
        season,
        year,
        ...(stage && { stage }),
        ...(regionId && {
          farmer: {
            kebele: { woreda: { zone: { regionId } } },
          },
        }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        season: true,
        year: true,
        stage: true,
        quantityKg: true,
        notes: true,
        createdAt: true,
        farmer: {
          select: {
            farmerId: true,
            firstName: true,
            lastName: true,
            kebele: {
              select: {
                name: true,
                woreda: {
                  select: {
                    name: true,
                    zone: {
                      select: {
                        name: true,
                        region: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        crop: {
          select: { name: true, category: true },
        },
        submittedBy: {
          select: { name: true },
        },
      },
      take: 100000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgroEthiopia MIS';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Yield Report');

    sheet.columns = [
      { header: 'Farmer ID', key: 'farmerId', width: 18 },
      { header: 'Farmer Name', key: 'name', width: 20 },
      { header: 'Region', key: 'region', width: 16 },
      { header: 'Zone', key: 'zone', width: 16 },
      { header: 'Woreda', key: 'woreda', width: 16 },
      { header: 'Kebele', key: 'kebele', width: 16 },
      { header: 'Crop', key: 'crop', width: 16 },
      { header: 'Category', key: 'category', width: 14 },
      { header: 'Season', key: 'season', width: 10 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Stage', key: 'stage', width: 14 },
      { header: 'Quantity (kg)', key: 'quantityKg', width: 14 },
      {
        header: 'Quantity (tons)',
        key: 'quantityTons',
        width: 14,
      },
      { header: 'Submitted By', key: 'submittedBy', width: 18 },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1B5E20' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    headerRow.height = 20;

    yields.forEach((y) => {
      sheet.addRow({
        farmerId: y.farmer.farmerId,
        name: `${y.farmer.firstName} ${y.farmer.lastName}`,
        region: y.farmer.kebele.woreda.zone.region.name,
        zone: y.farmer.kebele.woreda.zone.name,
        woreda: y.farmer.kebele.woreda.name,
        kebele: y.farmer.kebele.name,
        crop: y.crop.name,
        category: y.crop.category,
        season: y.season,
        year: y.year,
        stage: y.stage,
        quantityKg: y.quantityKg,
        quantityTons: Math.round(y.quantityKg / 1000),
        submittedBy: y.submittedBy.name,
        date: new Date(y.createdAt).toLocaleDateString(),
        notes: y.notes ?? '',
      });
    });

    sheet.autoFilter = {
      from: 'A1',
      to: `P${yields.length + 1}`,
    };

    const filename = `yield-report-${season}-${year}-${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, filename);
    await workbook.xlsx.writeFile(filePath);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('end', () => {
      fs.unlink(filePath, () => {});
    });
  }),
);

// ─── POST /api/v1/exports/distributions ──────────────────
// Export distribution summary to Excel
exportRouter.post(
  '/distributions',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      season: z.enum(['Meher', 'Belg']).optional(),
      year: z.coerce.number().optional(),
      orgId: z.string().optional(),
      regionId: z.string().optional(),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw ApiError.badRequest('Invalid parameters', parsed.error.errors);
    }

    const currentYear = new Date().getFullYear();
    const {
      season = config.DEFAULT_SEASON as 'Meher' | 'Belg',
      year = currentYear,
      regionId,
    } = parsed.data;

    // NGO Partners can only export their own distributions
    const orgId =
      req.user?.role === UserRole.NGO_PARTNER
        ? (req.user.orgId ?? parsed.data.orgId)
        : parsed.data.orgId;

    const distributions = await db.distribution.findMany({
      where: {
        season,
        year,
        ...(orgId && { orgId }),
        ...(regionId && {
          farmer: {
            kebele: { woreda: { zone: { regionId } } },
          },
        }),
      },
      orderBy: { createdAt: 'asc' },
      select: {
        quantity: true,
        unit: true,
        season: true,
        year: true,
        notes: true,
        createdAt: true,
        farmer: {
          select: {
            farmerId: true,
            firstName: true,
            lastName: true,
            kebele: {
              select: {
                name: true,
                woreda: {
                  select: {
                    name: true,
                    zone: {
                      select: {
                        name: true,
                        region: { select: { name: true } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
        inputType: {
          select: {
            name: true,
            category: true,
            unit: true,
          },
        },
        organization: {
          select: { name: true },
        },
        distributedBy: {
          select: { name: true },
        },
      },
      take: 100000,
    });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'AgroEthiopia MIS';
    const sheet = workbook.addWorksheet('Distribution Report');

    sheet.columns = [
      { header: 'Farmer ID', key: 'farmerId', width: 18 },
      { header: 'Farmer Name', key: 'name', width: 20 },
      { header: 'Region', key: 'region', width: 16 },
      { header: 'Zone', key: 'zone', width: 16 },
      { header: 'Woreda', key: 'woreda', width: 16 },
      { header: 'Kebele', key: 'kebele', width: 16 },
      { header: 'Input Type', key: 'inputType', width: 18 },
      { header: 'Category', key: 'category', width: 14 },
      { header: 'Quantity', key: 'quantity', width: 12 },
      { header: 'Unit', key: 'unit', width: 10 },
      { header: 'Season', key: 'season', width: 10 },
      { header: 'Year', key: 'year', width: 8 },
      { header: 'Organization', key: 'org', width: 20 },
      {
        header: 'Distributed By',
        key: 'distributedBy',
        width: 18,
      },
      { header: 'Date', key: 'date', width: 14 },
      { header: 'Notes', key: 'notes', width: 25 },
    ];

    const headerRow = sheet.getRow(1);
    headerRow.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' },
    };
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4A148C' },
    };
    headerRow.alignment = {
      vertical: 'middle',
      horizontal: 'center',
    };
    headerRow.height = 20;

    distributions.forEach((d) => {
      sheet.addRow({
        farmerId: d.farmer.farmerId,
        name: `${d.farmer.firstName} ${d.farmer.lastName}`,
        region: d.farmer.kebele.woreda.zone.region.name,
        zone: d.farmer.kebele.woreda.zone.name,
        woreda: d.farmer.kebele.woreda.name,
        kebele: d.farmer.kebele.name,
        inputType: d.inputType.name,
        category: d.inputType.category,
        quantity: d.quantity,
        unit: d.unit,
        season: d.season,
        year: d.year,
        org: d.organization.name,
        distributedBy: d.distributedBy.name,
        date: new Date(d.createdAt).toLocaleDateString(),
        notes: d.notes ?? '',
      });
    });

    sheet.autoFilter = {
      from: 'A1',
      to: `P${distributions.length + 1}`,
    };

    const filename = `distributions-${season}-${year}-${Date.now()}.xlsx`;
    const filePath = path.join(exportDir, filename);
    await workbook.xlsx.writeFile(filePath);

    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    const readStream = fs.createReadStream(filePath);
    readStream.pipe(res);
    readStream.on('end', () => {
      fs.unlink(filePath, () => {});
    });
  }),
);

// ─── GET /api/v1/exports/history ─────────────────────────
// Get export job history for current user
exportRouter.get(
  '/history',
  authorize([
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN,
    UserRole.NGO_PARTNER,
    UserRole.VIEWER,
  ]),
  asyncHandler(async (req, res) => {
    const userId = req.user?.id ?? '';
    const isAdmin =
      req.user?.role === UserRole.SUPER_ADMIN ||
      req.user?.role === UserRole.ADMIN;

    const exports = await db.exportJob.findMany({
      where: {
        ...(isAdmin ? {} : { userId }),
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        type: true,
        format: true,
        status: true,
        fileUrl: true,
        filters: true,
        createdAt: true,
        completedAt: true,
        user: {
          select: { id: true, name: true },
        },
      },
    });

    return ApiResponse.ok(res, 'Export history fetched successfully', exports);
  }),
);

export default exportRouter;
