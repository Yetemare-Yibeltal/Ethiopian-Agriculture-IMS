import { describe, it, expect } from 'vitest';
import {
  cn,
  formatNumber,
  formatCount,
  formatYield,
  formatLandSize,
  formatPercent,
  formatGPS,
  isValidEthiopianGPS,
  truncate,
  getInitials,
  titleCase,
  formatRole,
  formatEnum,
  isValidEthiopianPhone,
  isValidEmail,
  getPaginationInfo,
  formatFileSize,
  getFarmerStatusColor,
  getRoleColor,
  getCurrentSeason,
} from '@/lib/utils';

describe('cn', () => {
  it('merges conflicting tailwind classes', () => {
    expect(cn('px-2', 'px-4')).toBe('px-4');
  });

  it('ignores falsy values', () => {
    expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
  });
});

describe('number formatting', () => {
  it('abbreviates thousands and millions', () => {
    expect(formatNumber(1500)).toBe('1.5K');
    expect(formatNumber(15_000_000)).toBe('15M');
    expect(formatNumber(2_500_000)).toBe('2.5M');
  });

  it('handles null and undefined', () => {
    expect(formatNumber(null)).toBe('0');
    expect(formatNumber(undefined)).toBe('0');
    expect(formatCount(null)).toBe('0');
  });

  it('keeps small numbers as is', () => {
    expect(formatNumber(42)).toBe('42');
  });

  it('formats percent', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(null)).toBe('0%');
  });
});

describe('agriculture formatting', () => {
  it('formats yield in kg and tons', () => {
    expect(formatYield(null)).toBe('—');
    expect(formatYield(1500, 'tons')).toBe('1.50 tons');
    expect(formatYield(500)).toContain('kg');
  });

  it('prefers hectares over timad', () => {
    expect(formatLandSize(1.5, 4)).toBe('1.50 ha');
    expect(formatLandSize(null, 3.75)).toBe('3.75 timad');
    expect(formatLandSize(null, null)).toBe('—');
  });

  it('returns a valid season', () => {
    expect(['Meher', 'Belg']).toContain(getCurrentSeason());
  });
});

describe('GPS', () => {
  it('validates Ethiopian bounds', () => {
    expect(isValidEthiopianGPS(9.02, 38.74)).toBe(true);
    expect(isValidEthiopianGPS(51.5, -0.12)).toBe(false);
  });

  it('formats coordinates', () => {
    expect(formatGPS(9.02458, 38.747482)).toBe('9.024580°N, 38.747482°E');
    expect(formatGPS(null, null)).toBe('—');
  });
});

describe('string helpers', () => {
  it('truncates long strings', () => {
    expect(truncate('abcdefghij', 5)).toBe('abcde...');
    expect(truncate('abc', 5)).toBe('abc');
    expect(truncate(null)).toBe('');
  });

  it('gets initials', () => {
    expect(getInitials('Abebe Girma')).toBe('AG');
    expect(getInitials(null)).toBe('?');
  });

  it('title cases and formats enums', () => {
    expect(titleCase('hello WORLD')).toBe('Hello World');
    expect(formatRole('FIELD_AGENT')).toBe('Field Agent');
    expect(formatEnum('PRE_HARVEST')).toBe('Pre Harvest');
  });

  it('formats file sizes', () => {
    expect(formatFileSize(0)).toBe('0 Bytes');
    expect(formatFileSize(1024)).toBe('1 KB');
  });
});

describe('validation helpers', () => {
  it('validates Ethiopian phone numbers', () => {
    expect(isValidEthiopianPhone('+251911234567')).toBe(true);
    expect(isValidEthiopianPhone('0911234567')).toBe(true);
    expect(isValidEthiopianPhone('12345')).toBe(false);
  });

  it('validates emails', () => {
    expect(isValidEmail('admin@agroethiopia.gov.et')).toBe(true);
    expect(isValidEmail('not-an-email')).toBe(false);
  });
});

describe('pagination', () => {
  it('computes middle page info', () => {
    expect(getPaginationInfo(45, 2, 20)).toEqual({
      from: 21,
      to: 40,
      pageCount: 3,
      hasNext: true,
      hasPrev: true,
    });
  });

  it('handles empty results', () => {
    const info = getPaginationInfo(0, 1, 20);
    expect(info.from).toBe(0);
    expect(info.to).toBe(0);
    expect(info.hasNext).toBe(false);
    expect(info.hasPrev).toBe(false);
  });
});

describe('color helpers', () => {
  it('returns status colors with a default fallback', () => {
    expect(getFarmerStatusColor('ACTIVE').text).toBe('#4ade80');
    expect(getFarmerStatusColor('UNKNOWN').text).toBe('rgba(255,255,255,0.4)');
  });

  it('returns role colors', () => {
    expect(getRoleColor('SUPER_ADMIN').text).toBe('#f87171');
    expect(getRoleColor('VIEWER').text).toBe('#a78bfa');
  });
});
