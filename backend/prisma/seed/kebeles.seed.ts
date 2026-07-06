import { PrismaClient } from '@prisma/client';

export const seedKebeles = async (db: PrismaClient) => {
  console.log('📍 Seeding kebeles...');

  // Get all woredas
  const woredas = await db.woreda.findMany({
    select: {
      id: true,
      name: true,
      zone: {
        select: {
          name: true,
          region: {
            select: { name: true },
          },
        },
      },
    },
  });

  // GPS center coordinates per region for approximate placement
  const regionCenters: Record<string, { lat: number; lng: number }> = {
    Tigray: { lat: 14.0, lng: 38.5 },
    Amhara: { lat: 11.5, lng: 38.0 },
    Oromia: { lat: 8.0, lng: 38.5 },
    'South Ethiopia': { lat: 6.0, lng: 37.5 },
    Somali: { lat: 6.5, lng: 43.5 },
    Afar: { lat: 12.0, lng: 41.0 },
    'Benishangul-Gumuz': { lat: 10.5, lng: 35.5 },
    Gambela: { lat: 8.0, lng: 34.5 },
    Harari: { lat: 9.3, lng: 42.1 },
    Sidama: { lat: 6.8, lng: 38.4 },
    'Addis Ababa': { lat: 9.0, lng: 38.7 },
    'Dire Dawa': { lat: 9.6, lng: 41.9 },
  };

  // Sample kebele names to generate per woreda
  const kebeleNames = [
    'Kebele 01',
    'Kebele 02',
    'Kebele 03',
    'Kebele 04',
    'Kebele 05',
  ];

  let totalKebeles = 0;

  for (const woreda of woredas) {
    const regionName = woreda.zone.region.name;
    const center = regionCenters[regionName] || {
      lat: 9.0,
      lng: 38.7,
    };

    for (let i = 0; i < kebeleNames.length; i++) {
      const kebeleName = kebeleNames[i];

      // Add slight random offset for GPS coordinates
      const latOffset = (Math.random() - 0.5) * 0.5;
      const lngOffset = (Math.random() - 0.5) * 0.5;

      await db.kebele.upsert({
        where: {
          name_woredaId: {
            name: kebeleName,
            woredaId: woreda.id,
          },
        },
        update: {},
        create: {
          name: kebeleName,
          amharicName: `ቀበሌ 0${i + 1}`,
          woredaId: woreda.id,
          geoLat: parseFloat(
            (center.lat + latOffset).toFixed(6),
          ),
          geoLng: parseFloat(
            (center.lng + lngOffset).toFixed(6),
          ),
        },
      });
      totalKebeles++;
    }
  }

  console.log(`✅ Seeded ${totalKebeles} kebeles`);
};
