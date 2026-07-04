import { PrismaClient } from '@prisma/client';

export const seedZones = async (db: PrismaClient) => {
  console.log('🗺️  Seeding zones...');

  const zonesData: Record<string, { name: string; amharicName: string }[]> = {
    'Tigray': [
      { name: 'Central Tigray', amharicName: 'መካከለኛ ትግራይ' },
      { name: 'Eastern Tigray', amharicName: 'ምስራቅ ትግራይ' },
      { name: 'Northwestern Tigray', amharicName: 'ሰሜን ምዕራብ ትግራይ' },
      { name: 'Southern Tigray', amharicName: 'ደቡብ ትግራይ' },
      { name: 'Western Tigray', amharicName: 'ምዕራብ ትግራይ' },
    ],
    'Amhara': [
      { name: 'Awi', amharicName: 'አዊ' },
      { name: 'East Gojjam', amharicName: 'ምስራቅ ጎጃም' },
      { name: 'North Gondar', amharicName: 'ሰሜን ጎንደር' },
      { name: 'North Shewa', amharicName: 'ሰሜን ሸዋ' },
      { name: 'North Wollo', amharicName: 'ሰሜን ወሎ' },
      { name: 'Oromia Zone', amharicName: 'ኦሮሚያ ዞን' },
      { name: 'South Gondar', amharicName: 'ደቡብ ጎንደር' },
      { name: 'South Wollo', amharicName: 'ደቡብ ወሎ' },
      { name: 'Wag Hemra', amharicName: 'ዋግ ህምራ' },
      { name: 'West Gojjam', amharicName: 'ምዕራብ ጎጃም' },
    ],
    'Oromia': [
      { name: 'Arsi', amharicName: 'አርሲ' },
      { name: 'Bale', amharicName: 'ባሌ' },
      { name: 'Borena', amharicName: 'ቦረና' },
      { name: 'East Hararghe', amharicName: 'ምስራቅ ሐረርጌ' },
      { name: 'East Shewa', amharicName: 'ምስራቅ ሸዋ' },
      { name: 'East Welega', amharicName: 'ምስራቅ ወለጋ' },
      { name: 'Guji', amharicName: 'ጉጂ' },
      { name: 'Horo Guduru Welega', amharicName: 'ሆሮ ጉዱሩ ወለጋ' },
      { name: 'Illubabor', amharicName: 'ኢሉባቦር' },
      { name: 'Jimma', amharicName: 'ጅማ' },
      { name: 'Kelam Welega', amharicName: 'ቀለም ወለጋ' },
      { name: 'North Shewa', amharicName: 'ሰሜን ሸዋ' },
      { name: 'Southwest Shewa', amharicName: 'ደቡብ ምዕራብ ሸዋ' },
      { name: 'West Arsi', amharicName: 'ምዕራብ አርሲ' },
      { name: 'West Hararghe', amharicName: 'ምዕራብ ሐረርጌ' },
      { name: 'West Shewa', amharicName: 'ምዕራብ ሸዋ' },
      { name: 'West Welega', amharicName: 'ምዕራብ ወለጋ' },
    ],
    'South Ethiopia': [
      { name: 'Dawro', amharicName: 'ዳውሮ' },
      { name: 'Gamo', amharicName: 'ጋሞ' },
      { name: 'Gofa', amharicName: 'ጎፋ' },
      { name: 'Konso', amharicName: 'ኮንሶ' },
      { name: 'South Omo', amharicName: 'ደቡብ ኦሞ' },
      { name: 'Wolayita', amharicName: 'ወላይታ' },
    ],
    'Somali': [
      { name: 'Afder', amharicName: 'አፍዴር' },
      { name: 'Doolo', amharicName: 'ዶሎ' },
      { name: 'Erer', amharicName: 'ኤረር' },
      { name: 'Fafan', amharicName: 'ፋፋን' },
      { name: 'Jarar', amharicName: 'ጃራር' },
      { name: 'Korahe', amharicName: 'ቆራሄ' },
      { name: 'Liben', amharicName: 'ሊበን' },
      { name: 'Nogob', amharicName: 'ኖጎብ' },
      { name: 'Shabelle', amharicName: 'ሸበሌ' },
      { name: 'Siti', amharicName: 'ሲቲ' },
    ],
    'Afar': [
      { name: 'Zone 1', amharicName: 'ዞን 1' },
      { name: 'Zone 2', amharicName: 'ዞን 2' },
      { name: 'Zone 3', amharicName: 'ዞን 3' },
      { name: 'Zone 4', amharicName: 'ዞን 4' },
      { name: 'Zone 5', amharicName: 'ዞን 5' },
    ],
    'Benishangul-Gumuz': [
      { name: 'Asosa', amharicName: 'አሶሳ' },
      { name: 'Kamashi', amharicName: 'ካማሺ' },
      { name: 'Metekel', amharicName: 'መተከል' },
    ],
    'Gambela': [
      { name: 'Agnewak', amharicName: 'አኙዋክ' },
      { name: 'Mezhenger', amharicName: 'መዠንገር' },
      { name: 'Nuer', amharicName: 'ኑዌር' },
    ],
    'Harari': [
      { name: 'Harari', amharicName: 'ሐረሪ' },
    ],
    'Sidama': [
      { name: 'Sidama', amharicName: 'ሲዳማ' },
    ],
    'Addis Ababa': [
      { name: 'Addis Ababa City', amharicName: 'አዲስ አበባ ከተማ' },
    ],
    'Dire Dawa': [
      { name: 'Dire Dawa City', amharicName: 'ድሬ ዳዋ ከተማ' },
    ],
  };

  let totalZones = 0;

  for (const [regionName, zones] of Object.entries(zonesData)) {
    const region = await db.region.findUnique({
      where: { name: regionName },
    });

    if (!region) {
      console.warn(`⚠️  Region not found: ${regionName}`);
      continue;
    }

    for (const zone of zones) {
      await db.zone.upsert({
        where: {
          name_regionId: {
            name: zone.name,
            regionId: region.id,
          },
        },
        update: {},
        create: {
          name: zone.name,
          amharicName: zone.amharicName,
          regionId: region.id,
        },
      });
      totalZones++;
    }
  }

  console.log(`✅ Seeded ${totalZones} zones`);
};
