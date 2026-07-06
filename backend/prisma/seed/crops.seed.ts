import { PrismaClient } from '@prisma/client';

export const seedCrops = async (db: PrismaClient) => {
  console.log('🌾 Seeding crops...');

  const crops = [
    // ─── Cereals ─────────────────────────────────────────
    {
      name: 'Teff',
      amharicName: 'ጤፍ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Wheat',
      amharicName: 'ስንዴ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Maize',
      amharicName: 'ቆሎ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Sorghum',
      amharicName: 'ማሽላ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Barley',
      amharicName: 'ገብስ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Millet',
      amharicName: 'ዳጉሳ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Oats',
      amharicName: 'ኦትስ',
      category: 'CEREAL' as const,
    },
    {
      name: 'Rice',
      amharicName: 'ሩዝ',
      category: 'CEREAL' as const,
    },

    // ─── Pulses ───────────────────────────────────────────
    {
      name: 'Faba Bean',
      amharicName: 'ባቄላ',
      category: 'PULSE' as const,
    },
    {
      name: 'Chickpea',
      amharicName: 'ሽምብራ',
      category: 'PULSE' as const,
    },
    {
      name: 'Lentil',
      amharicName: 'ምስር',
      category: 'PULSE' as const,
    },
    {
      name: 'Field Pea',
      amharicName: 'አተር',
      category: 'PULSE' as const,
    },
    {
      name: 'Haricot Bean',
      amharicName: 'ፈሰሉያ',
      category: 'PULSE' as const,
    },
    {
      name: 'Soybean',
      amharicName: 'ሶያ ባቄላ',
      category: 'PULSE' as const,
    },
    {
      name: 'Grass Pea',
      amharicName: 'ጉዊያ',
      category: 'PULSE' as const,
    },

    // ─── Oilseeds ─────────────────────────────────────────
    {
      name: 'Sesame',
      amharicName: 'ሰሊጥ',
      category: 'OILSEED' as const,
    },
    {
      name: 'Linseed',
      amharicName: 'ተልባ',
      category: 'OILSEED' as const,
    },
    {
      name: 'Niger Seed',
      amharicName: 'ኑግ',
      category: 'OILSEED' as const,
    },
    {
      name: 'Sunflower',
      amharicName: 'ሱፍ',
      category: 'OILSEED' as const,
    },
    {
      name: 'Groundnut',
      amharicName: 'ኦቾሎኒ',
      category: 'OILSEED' as const,
    },
    {
      name: 'Rapeseed',
      amharicName: 'ጎመን ዘር',
      category: 'OILSEED' as const,
    },

    // ─── Cash Crops ───────────────────────────────────────
    {
      name: 'Coffee',
      amharicName: 'ቡና',
      category: 'CASH_CROP' as const,
    },
    {
      name: 'Chat (Khat)',
      amharicName: 'ጫት',
      category: 'CASH_CROP' as const,
    },
    {
      name: 'Cotton',
      amharicName: 'ጥጥ',
      category: 'CASH_CROP' as const,
    },
    {
      name: 'Sugarcane',
      amharicName: 'ሸንኮራ አገዳ',
      category: 'CASH_CROP' as const,
    },
    {
      name: 'Tea',
      amharicName: 'ሻይ',
      category: 'CASH_CROP' as const,
    },

    // ─── Vegetables ───────────────────────────────────────
    {
      name: 'Potato',
      amharicName: 'ድንች',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Sweet Potato',
      amharicName: 'ስኳር ድንች',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Onion',
      amharicName: 'ሽንኩርት',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Tomato',
      amharicName: 'ቲማቲም',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Cabbage',
      amharicName: 'ጎመን',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Carrot',
      amharicName: 'ካሮት',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Garlic',
      amharicName: 'ነጭ ሽንኩርት',
      category: 'VEGETABLE' as const,
    },
    {
      name: 'Pepper',
      amharicName: 'ቃሪያ',
      category: 'VEGETABLE' as const,
    },

    // ─── Fruits ───────────────────────────────────────────
    {
      name: 'Banana',
      amharicName: 'ሙዝ',
      category: 'FRUIT' as const,
    },
    {
      name: 'Mango',
      amharicName: 'ማንጎ',
      category: 'FRUIT' as const,
    },
    {
      name: 'Avocado',
      amharicName: 'አቮካዶ',
      category: 'FRUIT' as const,
    },
    {
      name: 'Papaya',
      amharicName: 'ፓፓያ',
      category: 'FRUIT' as const,
    },
    {
      name: 'Orange',
      amharicName: 'ብርቱካን',
      category: 'FRUIT' as const,
    },
    {
      name: 'Lemon',
      amharicName: 'ሎሚ',
      category: 'FRUIT' as const,
    },

    // ─── Fodder ───────────────────────────────────────────
    {
      name: 'Alfalfa',
      amharicName: 'አልፋልፋ',
      category: 'FODDER' as const,
    },
    {
      name: 'Napier Grass',
      amharicName: 'ናፒየር ሣር',
      category: 'FODDER' as const,
    },
    {
      name: 'Rhodes Grass',
      amharicName: 'ሮድስ ሣር',
      category: 'FODDER' as const,
    },
  ];

  for (const crop of crops) {
    await db.crop.upsert({
      where: { name: crop.name },
      update: {},
      create: crop,
    });
  }

  console.log(`✅ Seeded ${crops.length} crops`);
};
