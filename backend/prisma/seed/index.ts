import { PrismaClient } from '@prisma/client';

import { seedRegions } from './regions.seed';
import { seedZones } from './zones.seed';
import { seedWoredas } from './woredas.seed';
import { seedKebeles } from './kebeles.seed';
import { seedCrops } from './crops.seed';
import { seedInputTypes } from './inputTypes.seed';
import { seedSystemSettings } from './systemSettings.seed';
import { seedUsers } from './users.seed';

const db = new PrismaClient();

const main = async () => {
  console.log('');
  console.log('═══════════════════════════════════════════════════');
  console.log('  🌾 AgroEthiopia MIS — Database Seeder');
  console.log('═══════════════════════════════════════════════════');
  console.log('');

  try {
    // ── Step 1: Regions ────────────────────────────────
    // Must be first — zones depend on regions
    await seedRegions(db);

    // ── Step 2: Zones ──────────────────────────────────
    // Must be after regions — woredas depend on zones
    await seedZones(db);

    // ── Step 3: Woredas ────────────────────────────────
    // Must be after zones — kebeles depend on woredas
    await seedWoredas(db);

    // ── Step 4: Kebeles ────────────────────────────────
    // Must be after woredas — farmers are assigned to kebeles
    await seedKebeles(db);

    // ── Step 5: Crops ──────────────────────────────────
    // Independent — can run any time after schema is created
    await seedCrops(db);

    // ── Step 6: Input Types ────────────────────────────
    // Independent — can run any time after schema is created
    await seedInputTypes(db);

    // ── Step 7: System Settings ────────────────────────
    // Independent — default configuration values
    await seedSystemSettings(db);

    // ── Step 8: Users ──────────────────────────────────
    // Must be last — NGO partner users need organization to exist
    await seedUsers(db);

    console.log('');
    console.log('═══════════════════════════════════════════════════');
    console.log('  ✅ Database seeded successfully!');
    console.log('═══════════════════════════════════════════════════');
    console.log('');
  } catch (error) {
    console.error('');
    console.error('❌ Seed failed:', error);
    console.error('');
    throw error;
  } finally {
    await db.$disconnect();
  }
};

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
