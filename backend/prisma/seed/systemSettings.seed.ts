import { PrismaClient } from '@prisma/client';

export const seedSystemSettings = async (db: PrismaClient) => {
  console.log('⚙️  Seeding system settings...');

  const settings = [
    // ─── Season Settings ─────────────────────────────────
    {
      key: 'DEFAULT_SEASON',
      value: 'Meher',
      description:
        'Default farming season for the system. Options: Meher, Belg',
    },
    {
      key: 'CURRENT_YEAR',
      value: new Date().getFullYear().toString(),
      description: 'Current farming year',
    },
    {
      key: 'MEHER_START_MONTH',
      value: '9',
      description:
        'Month when Meher season starts (1-12). Default: September',
    },
    {
      key: 'MEHER_END_MONTH',
      value: '2',
      description:
        'Month when Meher season ends (1-12). Default: February',
    },
    {
      key: 'BELG_START_MONTH',
      value: '3',
      description:
        'Month when Belg season starts (1-12). Default: March',
    },
    {
      key: 'BELG_END_MONTH',
      value: '6',
      description:
        'Month when Belg season ends (1-12). Default: June',
    },

    // ─── Food Security Alert Thresholds ──────────────────
    {
      key: 'YIELD_ALERT_THRESHOLD_PERCENT',
      value: '70',
      description:
        'Percentage below expected yield that triggers a food security alert. Default: 70%',
    },
    {
      key: 'YIELD_THRESHOLD_TEFF_KG_PER_HECTARE',
      value: '800',
      description:
        'Expected teff yield in kg per hectare. Below this triggers alert.',
    },
    {
      key: 'YIELD_THRESHOLD_WHEAT_KG_PER_HECTARE',
      value: '1500',
      description:
        'Expected wheat yield in kg per hectare. Below this triggers alert.',
    },
    {
      key: 'YIELD_THRESHOLD_MAIZE_KG_PER_HECTARE',
      value: '2000',
      description:
        'Expected maize yield in kg per hectare. Below this triggers alert.',
    },
    {
      key: 'YIELD_THRESHOLD_SORGHUM_KG_PER_HECTARE',
      value: '1200',
      description:
        'Expected sorghum yield in kg per hectare. Below this triggers alert.',
    },
    {
      key: 'YIELD_THRESHOLD_BARLEY_KG_PER_HECTARE',
      value: '1000',
      description:
        'Expected barley yield in kg per hectare. Below this triggers alert.',
    },

    // ─── Pagination Settings ─────────────────────────────
    {
      key: 'DEFAULT_PAGE_SIZE',
      value: '20',
      description:
        'Default number of records per page in list views',
    },
    {
      key: 'MAX_PAGE_SIZE',
      value: '100',
      description: 'Maximum allowed records per page',
    },
    {
      key: 'FARMER_LIST_PAGE_SIZE',
      value: '25',
      description: 'Default page size for farmer list view',
    },
    {
      key: 'AUDIT_LOG_PAGE_SIZE',
      value: '50',
      description: 'Default page size for audit log view',
    },

    // ─── Upload Settings ─────────────────────────────────
    {
      key: 'MAX_PHOTO_SIZE_MB',
      value: '5',
      description: 'Maximum farmer photo size in megabytes',
    },
    {
      key: 'PHOTO_RESIZE_WIDTH',
      value: '400',
      description: 'Width in pixels to resize farmer photos to',
    },
    {
      key: 'PHOTO_RESIZE_HEIGHT',
      value: '400',
      description: 'Height in pixels to resize farmer photos to',
    },
    {
      key: 'PHOTO_JPEG_QUALITY',
      value: '85',
      description:
        'JPEG compression quality for farmer photos (1-100)',
    },

    // ─── Export Settings ──────────────────────────────────
    {
      key: 'MAX_EXCEL_EXPORT_ROWS',
      value: '50000',
      description:
        'Maximum number of rows allowed in a single Excel export',
    },
    {
      key: 'MAX_PDF_EXPORT_ROWS',
      value: '500',
      description:
        'Maximum number of rows in a single PDF export. Use Excel for larger exports.',
    },
    {
      key: 'EXPORT_FILE_RETENTION_HOURS',
      value: '24',
      description:
        'Hours to keep exported files on server before automatic deletion',
    },

    // ─── Notification Settings ────────────────────────────
    {
      key: 'ENABLE_FOOD_SECURITY_ALERTS',
      value: 'true',
      description:
        'Enable automatic food security alerts when yield falls below threshold',
    },
    {
      key: 'ENABLE_DUPLICATE_NOTIFICATIONS',
      value: 'true',
      description:
        'Enable notifications when duplicate distributions are blocked',
    },
    {
      key: 'ENABLE_EXPORT_NOTIFICATIONS',
      value: 'true',
      description:
        'Enable notifications when export jobs complete',
    },
    {
      key: 'NOTIFICATION_RETENTION_DAYS',
      value: '90',
      description:
        'Days to keep read notifications before automatic deletion',
    },

    // ─── Map Settings ─────────────────────────────────────
    {
      key: 'MAP_DEFAULT_LAT',
      value: '9.0',
      description: 'Default map center latitude (Ethiopia center)',
    },
    {
      key: 'MAP_DEFAULT_LNG',
      value: '38.7',
      description:
        'Default map center longitude (Ethiopia center)',
    },
    {
      key: 'MAP_DEFAULT_ZOOM',
      value: '6',
      description: 'Default map zoom level (1-18)',
    },
    {
      key: 'MAP_MAX_FARMER_PINS',
      value: '5000',
      description:
        'Maximum number of farmer pins to show on map at once',
    },

    // ─── System Settings ──────────────────────────────────
    {
      key: 'SYSTEM_NAME',
      value: 'AgroEthiopia MIS',
      description: 'System display name shown in UI and reports',
    },
    {
      key: 'SYSTEM_NAME_AMHARIC',
      value: 'የኢትዮጵያ ግብርና ማስተዳደሪያ ስርዓት',
      description: 'System name in Amharic',
    },
    {
      key: 'MINISTRY_NAME',
      value: 'Ministry of Agriculture',
      description: 'Name of the government ministry using this system',
    },
    {
      key: 'MINISTRY_NAME_AMHARIC',
      value: 'የግብርና ሚኒስቴር',
      description: 'Ministry name in Amharic',
    },
    {
      key: 'SUPPORT_EMAIL',
      value: 'support@agroethiopia.gov.et',
      description: 'Support email address shown to users',
    },
    {
      key: 'DEFAULT_LANGUAGE',
      value: 'en',
      description:
        'Default system language for new users. Options: en, am',
    },

    // ─── Cache Settings ───────────────────────────────────
    {
      key: 'DASHBOARD_CACHE_TTL_SECONDS',
      value: '300',
      description:
        'Dashboard statistics cache duration in seconds. Default: 5 minutes',
    },
    {
      key: 'ANALYTICS_CACHE_TTL_SECONDS',
      value: '600',
      description:
        'Analytics data cache duration in seconds. Default: 10 minutes',
    },
    {
      key: 'REGION_DATA_CACHE_TTL_SECONDS',
      value: '3600',
      description:
        'Region/Zone/Woreda/Kebele dropdown cache duration. Default: 1 hour',
    },

    // ─── Security Settings ────────────────────────────────
    {
      key: 'MAX_LOGIN_ATTEMPTS',
      value: '5',
      description:
        'Maximum failed login attempts before account is temporarily locked',
    },
    {
      key: 'LOGIN_LOCKOUT_MINUTES',
      value: '15',
      description: 'Minutes to lock account after max failed login attempts',
    },
    {
      key: 'SESSION_TIMEOUT_MINUTES',
      value: '60',
      description:
        'Minutes of inactivity before user is automatically logged out',
    },
    {
      key: 'PASSWORD_MIN_LENGTH',
      value: '8',
      description: 'Minimum password length for user accounts',
    },
  ];

  for (const setting of settings) {
    await db.systemSetting.upsert({
      where: { key: setting.key },
      update: { description: setting.description },
      create: {
        key: setting.key,
        value: setting.value,
        description: setting.description,
      },
    });
  }

  console.log(`✅ Seeded ${settings.length} system settings`);
};
