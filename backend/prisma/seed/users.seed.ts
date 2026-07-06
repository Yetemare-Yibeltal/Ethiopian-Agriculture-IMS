import { PrismaClient } from '@prisma/client';
import argon2 from 'argon2';

export const seedUsers = async (db: PrismaClient) => {
  console.log('👥 Seeding users...');

  // ─── Hash password helper ─────────────────────────────
  const hashPassword = async (password: string): Promise<string> => {
    return argon2.hash(password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 4,
    });
  };

  // ─── Get or create a sample NGO organization ─────────
  let sampleOrg = await db.organization.findFirst({
    where: { name: 'World Food Programme Ethiopia' },
  });

  if (!sampleOrg) {
    sampleOrg = await db.organization.create({
      data: {
        name: 'World Food Programme Ethiopia',
        type: 'INTERNATIONAL',
        description:
          'WFP Ethiopia office providing food assistance and agricultural support',
        website: 'https://www.wfp.org/countries/ethiopia',
        email: 'wfp.ethiopia@wfp.org',
        focusAreas: ['Food Security', 'Nutrition', 'Agriculture'],
        activeRegions: ['Oromia', 'Amhara', 'Tigray', 'Somali'],
        isActive: true,
      },
    });
    console.log('✅ Created sample WFP organization');
  }

  // ─── Get a sample kebele for field agent assignment ───
  const sampleKebele = await db.kebele.findFirst({
    select: { id: true, name: true },
  });

  // ─── Users to seed ────────────────────────────────────
  const usersData = [
    // Super Admin — full system access
    {
      name: 'Super Admin',
      email:
        process.env.SEED_ADMIN_EMAIL ||
        'admin@agroethiopia.gov.et',
      password:
        process.env.SEED_ADMIN_PASSWORD || 'Admin@123456',
      role: 'SUPER_ADMIN' as const,
      orgId: null,
      language: 'en',
      isActive: true,
    },

    // Ministry Admin — regional management
    {
      name: 'Abebe Girma',
      email: 'abebe.girma@moa.gov.et',
      password: 'Admin@123456',
      role: 'ADMIN' as const,
      orgId: null,
      language: 'am',
      isActive: true,
    },

    // Field Agent — registers farmers in kebele
    {
      name: 'Tigist Haile',
      email: 'tigist.haile@moa.gov.et',
      password: 'Agent@123456',
      role: 'FIELD_AGENT' as const,
      orgId: null,
      language: 'am',
      isActive: true,
    },

    // Second Field Agent
    {
      name: 'Bekele Tadesse',
      email: 'bekele.tadesse@moa.gov.et',
      password: 'Agent@123456',
      role: 'FIELD_AGENT' as const,
      orgId: null,
      language: 'am',
      isActive: true,
    },

    // NGO Partner — WFP
    {
      name: 'Sarah Johnson',
      email: 'sarah.johnson@wfp.org',
      password: 'Partner@123456',
      role: 'NGO_PARTNER' as const,
      orgId: sampleOrg.id,
      language: 'en',
      isActive: true,
    },

    // Second NGO Partner
    {
      name: 'Dawit Bekele',
      email: 'dawit.bekele@wfp.org',
      password: 'Partner@123456',
      role: 'NGO_PARTNER' as const,
      orgId: sampleOrg.id,
      language: 'am',
      isActive: true,
    },

    // Read-only Viewer — donor/embassy staff
    {
      name: 'Emma Wilson',
      email: 'emma.wilson@usaid.gov',
      password: 'Viewer@123456',
      role: 'VIEWER' as const,
      orgId: null,
      language: 'en',
      isActive: true,
    },
  ];

  let seededCount = 0;

  for (const userData of usersData) {
    const existingUser = await db.user.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log(`   ⏭️  User already exists: ${userData.email}`);
      continue;
    }

    const hashedPassword = await hashPassword(userData.password);

    await db.user.create({
      data: {
        name: userData.name,
        email: userData.email,
        password: hashedPassword,
        role: userData.role,
        orgId: userData.orgId,
        language: userData.language,
        isActive: userData.isActive,
      },
    });

    seededCount++;
    console.log(
      `   ✅ Created user: ${userData.name} (${userData.role})`,
    );
  }

  console.log(`✅ Seeded ${seededCount} new users`);
  console.log('');
  console.log('─────────────────────────────────────────');
  console.log('📋 Login Credentials:');
  console.log('─────────────────────────────────────────');
  console.log(
    `Super Admin : ${process.env.SEED_ADMIN_EMAIL || 'admin@agroethiopia.gov.et'}`,
  );
  console.log(
    `Password    : ${process.env.SEED_ADMIN_PASSWORD || 'Admin@123456'}`,
  );
  console.log('─────────────────────────────────────────');
  console.log(
    'Field Agent : tigist.haile@moa.gov.et / Agent@123456',
  );
  console.log(
    'NGO Partner : sarah.johnson@wfp.org / Partner@123456',
  );
  console.log(
    'Viewer      : emma.wilson@usaid.gov / Viewer@123456',
  );
  console.log('─────────────────────────────────────────');

  // Warn about changing default passwords
  console.log('');
  console.log(
    '⚠️  IMPORTANT: Change all default passwords after first login!',
  );
};
