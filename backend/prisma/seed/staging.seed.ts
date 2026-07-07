import { PrismaClient } from '@prisma/client';

export const seedStaging = async (db: PrismaClient) => {
  console.log('🧪 Seeding staging data...');
  console.log('⚠️  WARNING: Never run this on production!');

  // ─── Get reference data ───────────────────────────────
  const kebeles = await db.kebele.findMany({
    take: 50,
    select: { id: true, woredaId: true },
  });

  const crops = await db.crop.findMany({
    select: { id: true, name: true },
  });

  const inputTypes = await db.inputType.findMany({
    select: { id: true, name: true, unit: true },
  });

  const fieldAgent = await db.user.findFirst({
    where: { role: 'FIELD_AGENT' },
    select: { id: true },
  });

  const ngoPartner = await db.user.findFirst({
    where: { role: 'NGO_PARTNER' },
    select: { id: true, orgId: true },
  });

  if (!kebeles.length) {
    console.warn(
      '⚠️  No kebeles found. Run base seed first.',
    );
    return;
  }

  if (!fieldAgent) {
    console.warn(
      '⚠️  No field agent found. Run users seed first.',
    );
    return;
  }

  // ─── Seed 10 sample organizations ────────────────────
  console.log('🏢 Seeding sample organizations...');

  const orgNames = [
    {
      name: 'USAID Ethiopia',
      type: 'INTERNATIONAL' as const,
      email: 'ethiopia@usaid.gov',
    },
    {
      name: 'FAO Ethiopia',
      type: 'INTERNATIONAL' as const,
      email: 'fao.ethiopia@fao.org',
    },
    {
      name: 'REST Ethiopia',
      type: 'NGO' as const,
      email: 'info@rest.org.et',
    },
    {
      name: 'Save the Children Ethiopia',
      type: 'INTERNATIONAL' as const,
      email: 'ethiopia@savechildren.org',
    },
    {
      name: 'Samaritan\'s Purse Ethiopia',
      type: 'NGO' as const,
      email: 'ethiopia@samaritanspurse.org',
    },
    {
      name: 'Ethiopian Agricultural Transformation Institute',
      type: 'GOVERNMENT' as const,
      email: 'info@ati.gov.et',
    },
    {
      name: 'Oxfam Ethiopia',
      type: 'INTERNATIONAL' as const,
      email: 'ethiopia@oxfam.org',
    },
    {
      name: 'Care Ethiopia',
      type: 'NGO' as const,
      email: 'info@care-ethiopia.org',
    },
    {
      name: 'World Vision Ethiopia',
      type: 'NGO' as const,
      email: 'info@wvi.org.et',
    },
    {
      name: 'Action Against Hunger Ethiopia',
      type: 'INTERNATIONAL' as const,
      email: 'ethiopia@actionagainsthunger.org',
    },
  ];

  const createdOrgs = [];

  for (const org of orgNames) {
    const existing = await db.organization.findFirst({
      where: { name: org.name },
    });

    if (!existing) {
      const created = await db.organization.create({
        data: {
          name: org.name,
          type: org.type,
          email: org.email,
          focusAreas: [
            'Food Security',
            'Agriculture',
            'Nutrition',
          ],
          activeRegions: ['Oromia', 'Amhara', 'Tigray'],
          isActive: true,
        },
      });
      createdOrgs.push(created);
    } else {
      createdOrgs.push(existing);
    }
  }

  console.log(`✅ ${createdOrgs.length} organizations ready`);

  // ─── Seed 500 sample farmers ──────────────────────────
  console.log('👨‍🌾 Seeding 500 sample farmers...');

  const firstNames = [
    'Abebe', 'Tigist', 'Kebede', 'Almaz', 'Girma',
    'Selamawit', 'Tadesse', 'Mekdes', 'Haile', 'Yeshi',
    'Bekele', 'Hiwot', 'Tesfaye', 'Dinke', 'Mulugeta',
    'Tsega', 'Worku', 'Azeb', 'Demeke', 'Firehiwot',
    'Sisay', 'Meseret', 'Getachew', 'Liya', 'Dawit',
    'Birhan', 'Yonas', 'Selam', 'Mehari', 'Rahel',
  ];

  const lastNames = [
    'Tekle', 'Haile', 'Girma', 'Tadesse', 'Bekele',
    'Worku', 'Alemu', 'Tesfaye', 'Kebede', 'Molla',
    'Desta', 'Negash', 'Assefa', 'Demissie', 'Gebre',
    'Wolde', 'Tsegaye', 'Mulatu', 'Berhe', 'Kassa',
  ];

  const currentYear = new Date().getFullYear();
  let farmerCount = 0;

  for (let i = 0; i < 500; i++) {
    const firstName =
      firstNames[Math.floor(Math.random() * firstNames.length)];
    const lastName =
      lastNames[Math.floor(Math.random() * lastNames.length)];
    const kebele =
      kebeles[Math.floor(Math.random() * kebeles.length)];
    const crop =
      crops[Math.floor(Math.random() * crops.length)];

    const regionCode = 'ORM';
    const sequence = String(i + 1000).padStart(6, '0');
    const farmerId = `FRM-${regionCode}-${String(currentYear).substring(2)}-${sequence}`;

    const existing = await db.farmer.findUnique({
      where: { farmerId },
    });

    if (existing) {
      continue;
    }

    const gpsLat = 9.0 + (Math.random() - 0.5) * 8;
    const gpsLng = 38.7 + (Math.random() - 0.5) * 8;
    const landSize = parseFloat(
      (0.5 + Math.random() * 3).toFixed(2),
    );

    await db.farmer.create({
      data: {
        farmerId,
        firstName,
        lastName,
        phone: `+2519${Math.floor(10000000 + Math.random() * 89999999)}`,
        gender: Math.random() > 0.4 ? 'MALE' : 'FEMALE',
        kebeleId: kebele.id,
        landSizeHectare: landSize,
        landSizeTimad: parseFloat((landSize * 2.5).toFixed(2)),
        gpsLat: parseFloat(gpsLat.toFixed(6)),
        gpsLng: parseFloat(gpsLng.toFixed(6)),
        primaryCropId: crop.id,
        status: Math.random() > 0.1 ? 'ACTIVE' : 'INACTIVE',
        registeredById: fieldAgent.id,
        createdAt: new Date(
          Date.now() -
            Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000),
        ),
      },
    });

    farmerCount++;
  }

  console.log(`✅ Seeded ${farmerCount} sample farmers`);

  // ─── Seed yield reports for 2 seasons ────────────────
  console.log('🌾 Seeding yield reports...');

  const farmers = await db.farmer.findMany({
    take: 200,
    select: { id: true, primaryCropId: true },
    where: {
      status: 'ACTIVE',
      primaryCropId: { not: null },
    },
  });

  let yieldCount = 0;
  const seasons: Array<{ season: 'Meher' | 'Belg'; year: number }> = [
    { season: 'Meher', year: currentYear - 1 },
    { season: 'Belg', year: currentYear },
  ];

  const submitterId = fieldAgent.id;

  for (const farmer of farmers) {
    if (!farmer.primaryCropId) continue;

    for (const { season, year } of seasons) {
      // Only add FINAL stage to keep data clean
      const existing = await db.yieldReport.findFirst({
        where: {
          farmerId: farmer.id,
          cropId: farmer.primaryCropId,
          season,
          year,
          stage: 'FINAL',
        },
      });

      if (!existing) {
        const quantityKg = parseFloat(
          (200 + Math.random() * 1800).toFixed(2),
        );

        await db.yieldReport.create({
          data: {
            farmerId: farmer.id,
            cropId: farmer.primaryCropId,
            season,
            year,
            stage: 'FINAL',
            quantityKg,
            submittedById: submitterId,
          },
        });
        yieldCount++;
      }
    }
  }

  console.log(`✅ Seeded ${yieldCount} yield reports`);

  // ─── Seed distribution records ────────────────────────
  console.log('📦 Seeding distribution records...');

  const orgId =
    ngoPartner?.orgId ?? createdOrgs[0]?.id;
  const distributorId =
    ngoPartner?.id ?? fieldAgent.id;

  if (!orgId) {
    console.warn('⚠️  No org found for distributions');
    return;
  }

  let distCount = 0;
  const distributionFarmers = await db.farmer.findMany({
    take: 150,
    where: { status: 'ACTIVE' },
    select: { id: true },
  });

  const fertilizerType = inputTypes.find(
    (it) => it.name === 'DAP (Di-Ammonium Phosphate)',
  );
  const seedType = inputTypes.find(
    (it) => it.name === 'Improved Wheat Seed',
  );

  for (const farmer of distributionFarmers) {
    // DAP distribution — Meher season last year
    if (fertilizerType) {
      const existing = await db.distribution.findFirst({
        where: {
          farmerId: farmer.id,
          inputTypeId: fertilizerType.id,
          season: 'Meher',
          year: currentYear - 1,
        },
      });

      if (!existing) {
        await db.distribution.create({
          data: {
            farmerId: farmer.id,
            inputTypeId: fertilizerType.id,
            orgId,
            quantity: 50 + Math.floor(Math.random() * 50),
            unit: 'kg',
            season: 'Meher',
            year: currentYear - 1,
            distributedById: distributorId,
          },
        });
        distCount++;
      }
    }

    // Seed distribution — Belg season current year
    if (seedType) {
      const existing = await db.distribution.findFirst({
        where: {
          farmerId: farmer.id,
          inputTypeId: seedType.id,
          season: 'Belg',
          year: currentYear,
        },
      });

      if (!existing) {
        await db.distribution.create({
          data: {
            farmerId: farmer.id,
            inputTypeId: seedType.id,
            orgId,
            quantity: 10 + Math.floor(Math.random() * 15),
            unit: 'kg',
            season: 'Belg',
            year: currentYear,
            distributedById: distributorId,
          },
        });
        distCount++;
      }
    }
  }

  console.log(`✅ Seeded ${distCount} distribution records`);
  console.log('✅ Staging data seeded successfully');
};
