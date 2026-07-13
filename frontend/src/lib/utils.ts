import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNow, isValid, parseISO } from 'date-fns';

// ─── Class Name Helper ────────────────────────────────────
/**
 * Combines Tailwind CSS classes with proper merging.
 * Resolves conflicts between utility classes automatically.
 *
 * Usage:
 *   cn('px-4 py-2', isActive && 'bg-green-500', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

// ─── Date Formatting ──────────────────────────────────────
/**
 * Format a date string to a readable format
 */
export function formatDate(
  date: string | Date | null | undefined,
  formatStr = 'MMM dd, yyyy',
): string {
  if (!date) {
    return '—';
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return '—';
  }

  return format(dateObj, formatStr);
}

/**
 * Format date as relative time (e.g. "2 hours ago")
 */
export function formatRelativeTime(
  date: string | Date | null | undefined,
): string {
  if (!date) {
    return '—';
  }

  const dateObj = typeof date === 'string' ? parseISO(date) : date;

  if (!isValid(dateObj)) {
    return '—';
  }

  return formatDistanceToNow(dateObj, { addSuffix: true });
}

/**
 * Format date for display in tables
 */
export function formatTableDate(
  date: string | Date | null | undefined,
): string {
  return formatDate(date, 'dd MMM yyyy');
}

/**
 * Format date with time
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  return formatDate(date, 'dd MMM yyyy, HH:mm');
}

// ─── Number Formatting ────────────────────────────────────
/**
 * Format large numbers with abbreviations
 * e.g. 15000000 → "15M", 1500 → "1.5K"
 */
export function formatNumber(num: number | null | undefined): string {
  if (num === null || num === undefined) {
    return '0';
  }

  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1).replace(/\.0$/, '')}K`;
  }
  return num.toLocaleString();
}

/**
 * Format number with commas
 * e.g. 15000 → "15,000"
 */
export function formatCount(num: number | null | undefined): string {
  if (num === null || num === undefined) {
    return '0';
  }
  return num.toLocaleString();
}

/**
 * Format yield quantity
 * e.g. 1500 → "1,500 kg" or "1.5 tons"
 */
export function formatYield(
  kg: number | null | undefined,
  unit: 'kg' | 'tons' = 'kg',
): string {
  if (kg === null || kg === undefined) {
    return '—';
  }

  if (unit === 'tons') {
    return `${(kg / 1000).toFixed(2)} tons`;
  }
  return `${kg.toLocaleString()} kg`;
}

/**
 * Format land size
 */
export function formatLandSize(
  hectares: number | null | undefined,
  timad: number | null | undefined,
): string {
  if (hectares) {
    return `${hectares.toFixed(2)} ha`;
  }
  if (timad) {
    return `${timad.toFixed(2)} timad`;
  }
  return '—';
}

/**
 * Format percentage
 */
export function formatPercent(
  value: number | null | undefined,
  decimals = 1,
): string {
  if (value === null || value === undefined) {
    return '0%';
  }
  return `${value.toFixed(decimals)}%`;
}

// ─── GPS Formatting ───────────────────────────────────────
/**
 * Format GPS coordinates for display
 */
export function formatGPS(
  lat: number | null | undefined,
  lng: number | null | undefined,
): string {
  if (!lat || !lng) {
    return '—';
  }
  return `${lat.toFixed(6)}°N, ${lng.toFixed(6)}°E`;
}

/**
 * Check if GPS coordinates are valid for Ethiopia
 * Ethiopia bounds: lat 3.4-15.0, lng 33.0-48.0
 */
export function isValidEthiopianGPS(lat: number, lng: number): boolean {
  return lat >= 3.4 && lat <= 15.0 && lng >= 33.0 && lng <= 48.0;
}

// ─── String Helpers ───────────────────────────────────────
/**
 * Truncate string to max length with ellipsis
 */
export function truncate(
  str: string | null | undefined,
  maxLength = 50,
): string {
  if (!str) {
    return '';
  }
  if (str.length <= maxLength) {
    return str;
  }
  return `${str.substring(0, maxLength)}...`;
}

/**
 * Get initials from full name
 * e.g. "Abebe Girma" → "AG"
 */
export function getInitials(name: string | null | undefined): string {
  if (!name) {
    return '?';
  }

  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .substring(0, 2);
}

/**
 * Capitalize first letter of each word
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) {
    return '';
  }
  return str
    .toLowerCase()
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Format role name for display
 * e.g. "FIELD_AGENT" → "Field Agent"
 */
export function formatRole(role: string | null | undefined): string {
  if (!role) {
    return '';
  }
  return role
    .split('_')
    .map((word) => titleCase(word))
    .join(' ');
}

/**
 * Format enum value for display
 * e.g. "PRE_HARVEST" → "Pre Harvest"
 */
export function formatEnum(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  return value
    .split('_')
    .map((word) => titleCase(word))
    .join(' ');
}

// ─── Debounce ─────────────────────────────────────────────
/**
 * Debounce a function call
 * Used for search inputs to avoid too many API calls
 */
export function debounce<T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number,
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout;

  return function (...args: Parameters<T>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

// ─── URL Helpers ──────────────────────────────────────────
/**
 * Build URL with query parameters
 */
export function buildUrl(
  base: string,
  params: Record<string, unknown>,
): string {
  const cleanParams = Object.entries(params)
    .filter(
      ([, value]) => value !== undefined && value !== null && value !== '',
    )
    .reduce(
      (acc, [key, value]) => {
        acc[key] = String(value);
        return acc;
      },
      {} as Record<string, string>,
    );

  const queryString = new URLSearchParams(cleanParams).toString();
  return queryString ? `${base}?${queryString}` : base;
}

/**
 * Get farmer photo URL
 */
export function getFarmerPhotoUrl(photoUrl: string | null | undefined): string {
  if (!photoUrl) {
    return '/images/farmer-placeholder.png';
  }

  if (photoUrl.startsWith('http')) {
    return photoUrl;
  }

  const apiBase =
    process.env.NEXT_PUBLIC_API_URL?.replace('/api/v1', '') ||
    'http://localhost:5000';

  return `${apiBase}/${photoUrl}`;
}

// ─── Season Helpers ───────────────────────────────────────
/**
 * Get current Ethiopian farming season
 */
export function getCurrentSeason(): 'Meher' | 'Belg' {
  const month = new Date().getMonth() + 1;
  // Belg: March-June (3-6), Meher: September-February (9-2)
  if (month >= 3 && month <= 6) {
    return 'Belg';
  }
  return 'Meher';
}

/**
 * Get season badge color
 */
export function getSeasonColor(season: string): { bg: string; text: string } {
  if (season === 'Meher') {
    return {
      bg: 'rgba(0, 255, 136, 0.1)',
      text: '#00ff88',
    };
  }
  return {
    bg: 'rgba(0, 212, 255, 0.1)',
    text: '#00d4ff',
  };
}

// ─── Status Helpers ───────────────────────────────────────
/**
 * Get farmer status color
 */
export function getFarmerStatusColor(status: string): {
  bg: string;
  text: string;
  border: string;
} {
  switch (status) {
    case 'ACTIVE':
      return {
        bg: 'rgba(74, 222, 128, 0.1)',
        text: '#4ade80',
        border: 'rgba(74, 222, 128, 0.2)',
      };
    case 'INACTIVE':
      return {
        bg: 'rgba(255, 255, 255, 0.06)',
        text: 'rgba(255,255,255,0.4)',
        border: 'rgba(255,255,255,0.1)',
      };
    case 'FLAGGED':
      return {
        bg: 'rgba(248, 113, 113, 0.1)',
        text: '#f87171',
        border: 'rgba(248, 113, 113, 0.2)',
      };
    case 'PENDING':
      return {
        bg: 'rgba(251, 191, 36, 0.1)',
        text: '#fbbf24',
        border: 'rgba(251, 191, 36, 0.2)',
      };
    default:
      return {
        bg: 'rgba(255, 255, 255, 0.06)',
        text: 'rgba(255,255,255,0.4)',
        border: 'rgba(255,255,255,0.1)',
      };
  }
}

/**
 * Get role badge color
 */
export function getRoleColor(role: string): {
  bg: string;
  text: string;
} {
  switch (role) {
    case 'SUPER_ADMIN':
      return { bg: 'rgba(248, 113, 113, 0.12)', text: '#f87171' };
    case 'ADMIN':
      return { bg: 'rgba(251, 191, 36, 0.12)', text: '#fbbf24' };
    case 'FIELD_AGENT':
      return { bg: 'rgba(74, 222, 128, 0.12)', text: '#4ade80' };
    case 'NGO_PARTNER':
      return { bg: 'rgba(96, 165, 250, 0.12)', text: '#60a5fa' };
    case 'VIEWER':
      return { bg: 'rgba(167, 139, 250, 0.12)', text: '#a78bfa' };
    default:
      return {
        bg: 'rgba(255,255,255,0.06)',
        text: 'rgba(255,255,255,0.4)',
      };
  }
}

// ─── Validation Helpers ───────────────────────────────────
/**
 * Validate Ethiopian phone number
 */
export function isValidEthiopianPhone(phone: string): boolean {
  const pattern = /^(\+251|0)[0-9]{9}$/;
  return pattern.test(phone);
}

/**
 * Validate email address
 */
export function isValidEmail(email: string): boolean {
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return pattern.test(email);
}

// ─── Pagination Helpers ───────────────────────────────────
/**
 * Calculate pagination info
 */
export function getPaginationInfo(
  total: number,
  page: number,
  perPage: number,
): {
  from: number;
  to: number;
  pageCount: number;
  hasNext: boolean;
  hasPrev: boolean;
} {
  const pageCount = Math.ceil(total / perPage);
  const from = total === 0 ? 0 : (page - 1) * perPage + 1;
  const to = Math.min(page * perPage, total);

  return {
    from,
    to,
    pageCount,
    hasNext: page < pageCount,
    hasPrev: page > 1,
  };
}

// ─── File Size Helper ─────────────────────────────────────
/**
 * Format file size in human readable format
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
