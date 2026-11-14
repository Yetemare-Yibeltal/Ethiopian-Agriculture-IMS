import { describe, it, expect } from 'vitest';
import {
  loginSchema,
  changePasswordSchema,
  farmerSchema,
  yieldSchema,
  createUserSchema,
} from '@/lib/validators';

describe('loginSchema', () => {
  it('accepts valid credentials and normalizes email', () => {
    const result = loginSchema.safeParse({
      email: ' Admin@AgroEthiopia.gov.et ',
      password: 'Admin@123456',
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.email).toBe('admin@agroethiopia.gov.et');
    }
  });

  it('rejects a bad email', () => {
    expect(
      loginSchema.safeParse({ email: 'nope', password: 'Admin@123456' }).success,
    ).toBe(false);
  });

  it('rejects a short password', () => {
    expect(
      loginSchema.safeParse({ email: 'a@b.et', password: '123' }).success,
    ).toBe(false);
  });
});

describe('changePasswordSchema', () => {
  const base = { currentPassword: 'Old@12345' };

  it('accepts matching strong passwords', () => {
    expect(
      changePasswordSchema.safeParse({
        ...base,
        newPassword: 'NewPass123',
        confirmPassword: 'NewPass123',
      }).success,
    ).toBe(true);
  });

  it('rejects mismatched confirmation', () => {
    const result = changePasswordSchema.safeParse({
      ...base,
      newPassword: 'NewPass123',
      confirmPassword: 'Different123',
    });
    expect(result.success).toBe(false);
  });

  it('rejects weak passwords', () => {
    expect(
      changePasswordSchema.safeParse({
        ...base,
        newPassword: 'alllowercase1',
        confirmPassword: 'alllowercase1',
      }).success,
    ).toBe(false);
  });
});

describe('farmerSchema', () => {
  const valid = {
    firstName: 'Abebe',
    lastName: 'Girma',
    regionId: 'r1',
    zoneId: 'z1',
    woredaId: 'w1',
    kebeleId: 'k1',
  };

  it('accepts the minimum required fields', () => {
    expect(farmerSchema.safeParse(valid).success).toBe(true);
  });

  it('accepts valid Ethiopian phone numbers', () => {
    expect(
      farmerSchema.safeParse({ ...valid, phone: '+251911234567' }).success,
    ).toBe(true);
  });

  it('rejects invalid phone numbers', () => {
    expect(farmerSchema.safeParse({ ...valid, phone: '12345' }).success).toBe(
      false,
    );
  });

  it('requires a kebele', () => {
    expect(farmerSchema.safeParse({ ...valid, kebeleId: '' }).success).toBe(
      false,
    );
  });

  it('rejects negative land size', () => {
    expect(
      farmerSchema.safeParse({ ...valid, landSizeHectare: -1 }).success,
    ).toBe(false);
  });
});

describe('yieldSchema', () => {
  const valid = {
    farmerId: 'f1',
    cropId: 'c1',
    season: 'Meher',
    year: 2026,
    stage: 'FINAL',
    quantityKg: 500,
  };

  it('accepts a valid report', () => {
    expect(yieldSchema.safeParse(valid).success).toBe(true);
  });

  it('rejects an unknown season', () => {
    expect(yieldSchema.safeParse({ ...valid, season: 'Summer' }).success).toBe(
      false,
    );
  });

  it('rejects zero quantity', () => {
    expect(yieldSchema.safeParse({ ...valid, quantityKg: 0 }).success).toBe(
      false,
    );
  });
});

describe('createUserSchema', () => {
  it('rejects an unknown role', () => {
    expect(
      createUserSchema.safeParse({
        name: 'Test User',
        email: 'test@agroethiopia.gov.et',
        password: 'Strong123',
        role: 'HACKER',
      }).success,
    ).toBe(false);
  });

  it('defaults language to en', () => {
    const result = createUserSchema.safeParse({
      name: 'Test User',
      email: 'test@agroethiopia.gov.et',
      password: 'Strong123',
      role: 'ADMIN',
    });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.language).toBe('en');
  });
});
