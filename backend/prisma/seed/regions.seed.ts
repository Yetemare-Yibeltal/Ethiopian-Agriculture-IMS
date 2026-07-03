import { PrismaClient } from '@prisma/client';

export const seedRegions = async (db: PrismaClient) => {
  console.log('🌍 Seeding regions...');

  const regions = [
    { name: 'Addis Ababa', amharicName: 'አዲስ አበባ' },
    { name: 'Afar', amharicName: 'አፋር' },
    { name: 'Amhara', amharicName: 'አማራ' },
    { name: 'Benishangul-Gumuz', amharicName: 'ቤኒሻንጉል-ጉሙዝ' },
    { name: 'Dire Dawa', amharicName: 'ድሬ ዳዋ' },
    { name: 'Gambela', amharicName: 'ጋምቤላ' },
    { name: 'Harari', amharicName: 'ሐረሪ' },
    { name: 'Oromia', amharicName: 'ኦሮሚያ' },
    { name: 'Sidama', amharicName: 'ሲዳማ' },
    { name: 'Somali', amharicName: 'ሶማሌ' },
    { name: 'South Ethiopia', amharicName: 'ደቡብ ኢትዮጵያ' },
    { name: 'Tigray', amharicName: 'ትግራይ' },
  ];

  for (const region of regions) {
    await db.region.upsert({
      where: { name: region.name },
      update: {},
      create: region,
    });
  }

  console.log(`✅ Seeded ${regions.length} regions`);
};
