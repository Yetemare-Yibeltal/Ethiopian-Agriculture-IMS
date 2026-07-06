import { PrismaClient } from '@prisma/client';

export const seedInputTypes = async (db: PrismaClient) => {
  console.log('📦 Seeding input types...');

  const inputTypes = [
    // ─── Fertilizers ─────────────────────────────────────
    {
      name: 'Urea',
      amharicName: 'ዩሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'DAP (Di-Ammonium Phosphate)',
      amharicName: 'ዳፕ ማዳበሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'NPS (Nitrogen Phosphorus Sulfur)',
      amharicName: 'ኤንፒኤስ ማዳበሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'NPSB (Nitrogen Phosphorus Sulfur Boron)',
      amharicName: 'ኤንፒኤስቢ ማዳበሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'Blended Fertilizer',
      amharicName: 'ቅይጥ ማዳበሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'Compost',
      amharicName: 'ኮምፖስት',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'Organic Fertilizer',
      amharicName: 'ኦርጋኒክ ማዳበሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'Lime',
      amharicName: 'ኖራ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'Gypsum',
      amharicName: 'ጂፕሰም',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },
    {
      name: 'Micro-nutrient Fertilizer',
      amharicName: 'ማይክሮ ኒውትሪየንት ማዳበሪያ',
      category: 'FERTILIZER' as const,
      unit: 'kg',
    },

    // ─── Improved Seeds ───────────────────────────────────
    {
      name: 'Improved Teff Seed',
      amharicName: 'የተሻሻለ ጤፍ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Wheat Seed',
      amharicName: 'የተሻሻለ ስንዴ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Maize Seed',
      amharicName: 'የተሻሻለ ቆሎ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Sorghum Seed',
      amharicName: 'የተሻሻለ ማሽላ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Barley Seed',
      amharicName: 'የተሻሻለ ገብስ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Faba Bean Seed',
      amharicName: 'የተሻሻለ ባቄላ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Chickpea Seed',
      amharicName: 'የተሻሻለ ሽምብራ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Lentil Seed',
      amharicName: 'የተሻሻለ ምስር ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Soybean Seed',
      amharicName: 'የተሻሻለ ሶያ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Sesame Seed',
      amharicName: 'የተሻሻለ ሰሊጥ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Sunflower Seed',
      amharicName: 'የተሻሻለ ሱፍ ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Potato Seed',
      amharicName: 'የተሻሻለ ድንች ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Onion Seed',
      amharicName: 'የተሻሻለ ሽንኩርት ዘር',
      category: 'SEED' as const,
      unit: 'kg',
    },
    {
      name: 'Improved Tomato Seed',
      amharicName: 'የተሻሻለ ቲማቲም ዘር',
      category: 'SEED' as const,
      unit: 'g',
    },
    {
      name: 'Coffee Seedling',
      amharicName: 'የቡና ችግኝ',
      category: 'SEED' as const,
      unit: 'seedling',
    },

    // ─── Pesticides ───────────────────────────────────────
    {
      name: 'Herbicide (Broadleaf)',
      amharicName: 'ሰፊ ቅጠል አረም ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },
    {
      name: 'Herbicide (Grass)',
      amharicName: 'ሣር አረም ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },
    {
      name: 'Fungicide',
      amharicName: 'የፈንገስ ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },
    {
      name: 'Insecticide',
      amharicName: 'ነፍሳት ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },
    {
      name: 'Rodenticide',
      amharicName: 'አይጥ ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'kg',
    },
    {
      name: 'Locust Control Chemical',
      amharicName: 'አንበጣ ማጥፊያ ኬሚካል',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },
    {
      name: 'Stem Borer Control',
      amharicName: 'ግንድ ቀዳሚ ተባይ ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },
    {
      name: 'Aphid Control',
      amharicName: 'አፊድ ማጥፊያ',
      category: 'PESTICIDE' as const,
      unit: 'liter',
    },

    // ─── Farm Tools ───────────────────────────────────────
    {
      name: 'Hand Hoe',
      amharicName: 'ዶማ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Plough',
      amharicName: 'ጥምር',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Sickle',
      amharicName: 'ማጭድ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Axe',
      amharicName: 'መጥረቢያ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Irrigation Pump',
      amharicName: 'የመስኖ ፓምፕ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Sprayer (Knapsack)',
      amharicName: 'ሽያጭ ስፕሬ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Thresher',
      amharicName: 'አውድማ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Harvesting Net',
      amharicName: 'የምርት መሰብሰቢያ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Storage Bag',
      amharicName: 'ማከማቻ ከረሜላ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Wheelbarrow',
      amharicName: 'ዊልባሮ',
      category: 'TOOL' as const,
      unit: 'piece',
    },
    {
      name: 'Watering Can',
      amharicName: 'ውሃ ማጠጫ',
      category: 'TOOL' as const,
      unit: 'piece',
    },

    // ─── Other ────────────────────────────────────────────
    {
      name: 'Plastic Mulch',
      amharicName: 'ፕላስቲክ መሸፈኛ',
      category: 'OTHER' as const,
      unit: 'meter',
    },
    {
      name: 'Drip Irrigation Kit',
      amharicName: 'ጠብታ መስኖ ኪት',
      category: 'OTHER' as const,
      unit: 'piece',
    },
    {
      name: 'Shade Net',
      amharicName: 'ጥላ መረብ',
      category: 'OTHER' as const,
      unit: 'meter',
    },
    {
      name: 'Greenhouse Plastic',
      amharicName: 'ግሪን ሃውስ ፕላስቲክ',
      category: 'OTHER' as const,
      unit: 'meter',
    },
  ];

  for (const inputType of inputTypes) {
    await db.inputType.upsert({
      where: { name: inputType.name },
      update: {},
      create: inputType,
    });
  }

  console.log(`✅ Seeded ${inputTypes.length} input types`);
};
