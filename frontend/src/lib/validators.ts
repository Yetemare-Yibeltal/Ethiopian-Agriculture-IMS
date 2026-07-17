import { z } from 'zod';

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type LoginFormData = z.infer<typeof loginSchema>;
export type ChangePasswordFormData = z.infer<typeof changePasswordSchema>;

export const farmerSchema = z.object({
  firstName: z
    .string()
    .min(2, 'First name must be at least 2 characters')
    .max(100)
    .trim(),
  lastName: z
    .string()
    .min(2, 'Last name must be at least 2 characters')
    .max(100)
    .trim(),
  phone: z
    .string()
    .regex(/^(\+251|0)[0-9]{9}$/, 'Invalid Ethiopian phone number')
    .optional()
    .or(z.literal('')),
  dateOfBirth: z.string().optional(),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  regionId: z.string().min(1, 'Region is required'),
  zoneId: z.string().min(1, 'Zone is required'),
  woredaId: z.string().min(1, 'Woreda is required'),
  kebeleId: z.string().min(1, 'Kebele is required'),
  landSizeHectare: z.coerce.number().min(0).optional(),
  landSizeTimad: z.coerce.number().min(0).optional(),
  gpsLat: z.coerce.number().min(-90).max(90).optional(),
  gpsLng: z.coerce.number().min(-180).max(180).optional(),
  primaryCropId: z.string().optional(),
  secondaryCropIds: z.array(z.string()).optional().default([]),
  notes: z.string().max(1000).optional(),
});

export type FarmerFormData = z.infer<typeof farmerSchema>;

export const yieldSchema = z.object({
  farmerId: z.string().min(1, 'Farmer is required'),
  cropId: z.string().min(1, 'Crop is required'),
  season: z.enum(['Meher', 'Belg'], {
    errorMap: () => ({ message: 'Season must be Meher or Belg' }),
  }),
  year: z.coerce
    .number()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  stage: z.enum(['PRE_HARVEST', 'HARVEST', 'FINAL'], {
    errorMap: () => ({
      message: 'Stage must be PRE_HARVEST, HARVEST, or FINAL',
    }),
  }),
  quantityKg: z.coerce.number().min(0.01).max(1000000),
  notes: z.string().max(500).optional(),
});

export type YieldFormData = z.infer<typeof yieldSchema>;

export const distributionSchema = z.object({
  farmerId: z.string().min(1, 'Farmer is required'),
  inputTypeId: z.string().min(1, 'Input type is required'),
  orgId: z.string().min(1, 'Organization is required'),
  quantity: z.coerce.number().min(0.01).max(100000),
  unit: z.string().min(1, 'Unit is required'),
  season: z.enum(['Meher', 'Belg'], {
    errorMap: () => ({ message: 'Season must be Meher or Belg' }),
  }),
  year: z.coerce
    .number()
    .min(2000)
    .max(new Date().getFullYear() + 1),
  notes: z.string().max(500).optional(),
  distributionDate: z.string().optional(),
});

export type DistributionFormData = z.infer<typeof distributionSchema>;

export const organizationSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  type: z.enum(['NGO', 'GOVERNMENT', 'INTERNATIONAL', 'RESEARCH', 'OTHER'], {
    errorMap: () => ({ message: 'Please select an organization type' }),
  }),
  description: z.string().max(1000).optional(),
  website: z
    .string()
    .url('Please enter a valid website URL')
    .optional()
    .or(z.literal('')),
  email: z
    .string()
    .email('Please enter a valid email address')
    .optional()
    .or(z.literal('')),
  phone: z.string().optional(),
  address: z.string().optional(),
  focusAreas: z.array(z.string()).optional().default([]),
  activeRegions: z.array(z.string()).optional().default([]),
});

export type OrganizationFormData = z.infer<typeof organizationSchema>;

export const createUserSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  email: z
    .string()
    .min(1, 'Email is required')
    .email('Please enter a valid email address')
    .toLowerCase()
    .trim(),
  password: z
    .string()
    .min(8)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
      'Password must contain uppercase, lowercase, and number',
    ),
  role: z.enum(
    ['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'],
    { errorMap: () => ({ message: 'Please select a role' }) },
  ),
  orgId: z.string().optional(),
  language: z.enum(['en', 'am']).default('en'),
});

export const updateUserSchema = z.object({
  name: z.string().min(2).max(100).trim().optional(),
  role: z
    .enum(['SUPER_ADMIN', 'ADMIN', 'FIELD_AGENT', 'NGO_PARTNER', 'VIEWER'])
    .optional(),
  orgId: z.string().optional().nullable(),
  language: z.enum(['en', 'am']).optional(),
  isActive: z.boolean().optional(),
});

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(8)
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/,
        'Password must contain uppercase, lowercase, and number',
      ),
    confirmPassword: z.string().min(1, 'Please confirm the password'),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type CreateUserFormData = z.infer<typeof createUserSchema>;
export type UpdateUserFormData = z.infer<typeof updateUserSchema>;
export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

export const drawnZoneSchema = z.object({
  name: z.string().min(2).max(200).trim(),
  type: z.enum(
    ['IRRIGATION', 'DROUGHT_RISK', 'NGO_COVERAGE', 'FLOOD_RISK', 'CUSTOM'],
    { errorMap: () => ({ message: 'Please select a zone type' }) },
  ),
  geoJson: z.string().min(1, 'Zone boundary is required'),
});

export type DrawnZoneFormData = z.infer<typeof drawnZoneSchema>;

export const profileSchema = z.object({
  name: z.string().min(2).max(100).trim(),
  language: z.enum(['en', 'am']).default('en'),
});

export type ProfileFormData = z.infer<typeof profileSchema>;

export const searchSchema = z.object({
  query: z.string().min(2).max(100),
});

export type SearchFormData = z.infer<typeof searchSchema>;

export const exportSchema = z.object({
  type: z.enum([
    'FARMER_REGISTRY',
    'YIELD_REPORT',
    'DISTRIBUTION_SUMMARY',
    'ANALYTICS',
  ]),
  format: z.enum(['EXCEL', 'PDF']),
  season: z.enum(['Meher', 'Belg']).optional(),
  year: z.coerce.number().optional(),
  regionId: z.string().optional(),
  orgId: z.string().optional(),
});

export type ExportFormData = z.infer<typeof exportSchema>;
