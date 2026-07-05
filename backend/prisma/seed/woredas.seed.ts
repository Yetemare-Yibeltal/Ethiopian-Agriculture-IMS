import { PrismaClient } from '@prisma/client';

export const seedWoredas = async (db: PrismaClient) => {
  console.log('🏘️  Seeding woredas...');

  const woredasData: Record
    string,
    Record<string, { name: string; amharicName: string }[]>
  > = {
    Tigray: {
      'Central Tigray': [
        { name: 'Adwa', amharicName: 'አድዋ' },
        { name: 'Ahferom', amharicName: 'አህፈሮም' },
        { name: 'Degua Temben', amharicName: 'ደጓ ተምቤን' },
        { name: 'Hawzen', amharicName: 'ሓውዜን' },
        { name: 'Klite Awlalo', amharicName: 'ክልተ አውላሎ' },
        { name: 'Naeder Adet', amharicName: 'ናይደር አደት' },
        { name: 'Tanqua Abergele', amharicName: 'ታንቆ አበርጌሌ' },
      ],
      'Southern Tigray': [
        { name: 'Alamata', amharicName: 'አላማጣ' },
        { name: 'Endamohoni', amharicName: 'እንዳሞሆኒ' },
        { name: 'Hintalo Wajirat', amharicName: 'ሕንጣሎ ወጅራት' },
        { name: 'Ofla', amharicName: 'ዖፍላ' },
        { name: 'Raya Azebo', amharicName: 'ራያ አዘቦ' },
      ],
    },
    Amhara: {
      'East Gojjam': [
        { name: 'Awabel', amharicName: 'አዋቤል' },
        { name: 'Baso Liben', amharicName: 'ባሶ ሊበን' },
        { name: 'Debre Elias', amharicName: 'ደብረ ኤልያስ' },
        { name: 'Enemay', amharicName: 'ኤነሜይ' },
        { name: 'Gozamen', amharicName: 'ጎዛምን' },
        { name: 'Hulet Ej Enese', amharicName: 'ሁለት እጅ ኤጀነሴ' },
        { name: 'Machakel', amharicName: 'ማቻኬል' },
      ],
      'South Wollo': [
        { name: 'Amhara Saint', amharicName: 'አምሐራ ሳይንት' },
        { name: 'Ambassel', amharicName: 'አምባሰል' },
        { name: 'Angot', amharicName: 'አንጎት' },
        { name: 'Debub Wollo', amharicName: 'ደቡብ ወሎ' },
        { name: 'Dessie Zuria', amharicName: 'ደሴ ዙሪያ' },
        { name: 'Kalu', amharicName: 'ካሉ' },
        { name: 'Kombolcha', amharicName: 'ኮምቦልቻ' },
      ],
      'North Gondar': [
        { name: 'Dabat', amharicName: 'ዳባት' },
        { name: 'Debark', amharicName: 'ደባርቅ' },
        { name: 'Gondar Zuria', amharicName: 'ጎንደር ዙሪያ' },
        { name: 'Janamora', amharicName: 'ጃናሞራ' },
        { name: 'Lay Armachiho', amharicName: 'ላይ አርማቺሆ' },
        { name: 'Tach Armachiho', amharicName: 'ታች አርማቺሆ' },
        { name: 'Wogera', amharicName: 'ወገራ' },
      ],
    },
    Oromia: {
      Jimma: [
        { name: 'Agaro', amharicName: 'አጋሮ' },
        { name: 'Gomma', amharicName: 'ጎማ' },
        { name: 'Jimma Geneti', amharicName: 'ጅማ ጀነቲ' },
        { name: 'Kersa', amharicName: 'ከርሳ' },
        { name: 'Limu Kosa', amharicName: 'ሊሙ ኮሳ' },
        { name: 'Mana', amharicName: 'ማና' },
        { name: 'Nono Benja', amharicName: 'ኖኖ ቤንጃ' },
        { name: 'Omo Nada', amharicName: 'ኦሞ ናዳ' },
        { name: 'Seka Chekorsa', amharicName: 'ሴካ ቸኮርሳ' },
        { name: 'Shebe Sombo', amharicName: 'ሸቤ ሶምቦ' },
      ],
      Arsi: [
        { name: 'Aseko', amharicName: 'አሴኮ' },
        { name: 'Digeluna Tijo', amharicName: 'ዲጌሉና ቲጆ' },
        { name: 'Dodola', amharicName: 'ዶዶላ' },
        { name: 'Hetosa', amharicName: 'ሄቶሳ' },
        { name: 'Jeju', amharicName: 'ጄጁ' },
        { name: 'Lemu Bilbilo', amharicName: 'ሌሙ ቢልቢሎ' },
        { name: 'Merti', amharicName: 'መርቲ' },
        { name: 'Munesa', amharicName: 'ሙነሳ' },
        { name: 'Shirka', amharicName: 'ሽርካ' },
        { name: 'Tiyo', amharicName: 'ቲዮ' },
      ],
      'East Hararghe': [
        { name: 'Babile', amharicName: 'ባቢሌ' },
        { name: 'Chinaksen', amharicName: 'ቺናክሰን' },
        { name: 'Fedis', amharicName: 'ፌዲስ' },
        { name: 'Girawa', amharicName: 'ጊራዋ' },
        { name: 'Goro Gutu', amharicName: 'ጎሮ ጉቱ' },
        { name: 'Haramaya', amharicName: 'ሐራማያ' },
        { name: 'Jarso', amharicName: 'ጃርሶ' },
        { name: 'Kersa', amharicName: 'ከርሳ' },
        { name: 'Kombolcha', amharicName: 'ኮምቦልቻ' },
        { name: 'Meta', amharicName: 'ሜታ' },
      ],
    },
    'South Ethiopia': {
      Wolayita: [
        { name: 'Boloso Bombe', amharicName: 'ቦሎሶ ቦምቤ' },
        { name: 'Boloso Sore', amharicName: 'ቦሎሶ ሶሬ' },
        { name: 'Damot Gale', amharicName: 'ዳሞት ጋሌ' },
        { name: 'Damot Pulasa', amharicName: 'ዳሞት ፑላሳ' },
        { name: 'Damot Sore', amharicName: 'ዳሞት ሶሬ' },
        { name: 'Humbo', amharicName: 'ሁምቦ' },
        { name: 'Kindo Didaye', amharicName: 'ኪንዶ ዲዳዬ' },
        { name: 'Offa', amharicName: 'ኦፋ' },
        { name: 'Sodo Zuria', amharicName: 'ሶዶ ዙሪያ' },
      ],
      Gamo: [
        { name: 'Arba Minch Zuria', amharicName: 'አርባ ምንጭ ዙሪያ' },
        { name: 'Bonke', amharicName: 'ቦንኬ' },
        { name: 'Chencha', amharicName: 'ቼንቻ' },
        { name: 'Demba Gofa', amharicName: 'ደምባ ጎፋ' },
        { name: 'Kucha', amharicName: 'ኩቻ' },
        { name: 'Mirab Abaya', amharicName: 'ምዕራብ አባያ' },
      ],
    },
    Somali: {
      Fafan: [
        { name: 'Babile', amharicName: 'ባቢሌ' },
        { name: 'Gursum', amharicName: 'ጉርሱም' },
        { name: 'Jigjiga Zuria', amharicName: 'ጅጅጋ ዙሪያ' },
        { name: 'Kebribeyah', amharicName: 'ከብሪቤያህ' },
        { name: 'Meyumuluk', amharicName: 'ሜዩሙሉክ' },
      ],
      Shabelle: [
        { name: 'Adadle', amharicName: 'አዳድሌ' },
        { name: 'Aware', amharicName: 'አዋሬ' },
        { name: 'Danan', amharicName: 'ዳናን' },
        { name: 'Gode', amharicName: 'ጎዴ' },
        { name: 'Imey', amharicName: 'ኢሜይ' },
      ],
    },
    Afar: {
      'Zone 1': [
        { name: 'Awash Fentale', amharicName: 'አዋሽ ፈንታሌ' },
        { name: 'Gewane', amharicName: 'ጌዋኔ' },
        { name: 'Mille', amharicName: 'ሚሌ' },
      ],
      'Zone 3': [
        { name: 'Amibara', amharicName: 'አምይባራ' },
        { name: 'Assaita', amharicName: 'አሳይታ' },
        { name: 'Chifra', amharicName: 'ቺፍራ' },
        { name: 'Dulecha', amharicName: 'ዱለቻ' },
      ],
    },
    'Benishangul-Gumuz': {
      Asosa: [
        { name: 'Asosa', amharicName: 'አሶሳ' },
        { name: 'Bambasi', amharicName: 'ባምባሲ' },
        { name: 'Mao Komo', amharicName: 'ማኦ ኮሞ' },
        { name: 'Oda Buldigilu', amharicName: 'ኦዳ ቡልዲጊሉ' },
      ],
      Metekel: [
        { name: 'Bulen', amharicName: 'ቡለን' },
        { name: 'Dangur', amharicName: 'ዳንጉር' },
        { name: 'Guba', amharicName: 'ጉባ' },
        { name: 'Mandura', amharicName: 'ማንዱራ' },
        { name: 'Wenbera', amharicName: 'ወምቤራ' },
      ],
    },
    Gambela: {
      Agnewak: [
        { name: 'Abobo', amharicName: 'አቦቦ' },
        { name: 'Gambela Zuria', amharicName: 'ጋምቤላ ዙሪያ' },
        { name: 'Gog', amharicName: 'ጎግ' },
        { name: 'Jor', amharicName: 'ጆር' },
      ],
      Nuer: [
        { name: 'Jikawo', amharicName: 'ጂካዎ' },
        { name: 'Lare', amharicName: 'ላሬ' },
        { name: 'Wantawo', amharicName: 'ዋንታዎ' },
      ],
    },
    Harari: {
      Harari: [
        { name: 'Abadir', amharicName: 'አባዲር' },
        { name: 'Erer', amharicName: 'ኤረር' },
        { name: 'Harar Zuria', amharicName: 'ሐረር ዙሪያ' },
        { name: 'Jile Timuga', amharicName: 'ጂሌ ቲሙጋ' },
      ],
    },
    Sidama: {
      Sidama: [
        { name: 'Aleta Chuko', amharicName: 'አሌታ ቹኮ' },
        { name: 'Boricha', amharicName: 'ቦሪቻ' },
        { name: 'Dale', amharicName: 'ዳሌ' },
        { name: 'Hawassa Zuria', amharicName: 'ሐዋሳ ዙሪያ' },
        { name: 'Loka Abaya', amharicName: 'ሎካ አባያ' },
        { name: 'Shebedino', amharicName: 'ሸቤዲኖ' },
        { name: 'Wondo Genet', amharicName: 'ወንዶ ጌነት' },
      ],
    },
    'Addis Ababa': {
      'Addis Ababa City': [
        { name: 'Arada', amharicName: 'አራዳ' },
        { name: 'Bole', amharicName: 'ቦሌ' },
        { name: 'Gulele', amharicName: 'ጉለሌ' },
        { name: 'Kirkos', amharicName: 'ቂርቆስ' },
        { name: 'Kolfe Keranio', amharicName: 'ቆልፌ ቀራኒዮ' },
        { name: 'Lideta', amharicName: 'ልደታ' },
        { name: 'Nifas Silk Lafto', amharicName: 'ንፋስ ስልክ ልፍቶ' },
        { name: 'Yeka', amharicName: 'የካ' },
      ],
    },
    'Dire Dawa': {
      'Dire Dawa City': [
        { name: 'Bikilal', amharicName: 'ቢኪላል' },
        { name: 'Chilanko', amharicName: 'ቺላንኮ' },
        { name: 'Dechatu', amharicName: 'ደቻቱ' },
        { name: 'Dire Dawa Ketema', amharicName: 'ድሬ ዳዋ ከተማ' },
        { name: 'Gurgura', amharicName: 'ጉርጉራ' },
      ],
    },
  };

  let totalWoredas = 0;

  for (const [regionName, zones] of Object.entries(woredasData)) {
    const region = await db.region.findUnique({
      where: { name: regionName },
    });

    if (!region) {
      console.warn(`⚠️  Region not found: ${regionName}`);
      continue;
    }

    for (const [zoneName, woredas] of Object.entries(zones)) {
      const zone = await db.zone.findFirst({
        where: {
          name: zoneName,
          regionId: region.id,
        },
      });

      if (!zone) {
        console.warn(
          `⚠️  Zone not found: ${zoneName} in ${regionName}`,
        );
        continue;
      }

      for (const woreda of woredas) {
        await db.woreda.upsert({
          where: {
            name_zoneId: {
              name: woreda.name,
              zoneId: zone.id,
            },
          },
          update: {},
          create: {
            name: woreda.name,
            amharicName: woreda.amharicName,
            zoneId: zone.id,
          },
        });
        totalWoredas++;
      }
    }
  }

  console.log(`✅ Seeded ${totalWoredas} woredas`);
};
