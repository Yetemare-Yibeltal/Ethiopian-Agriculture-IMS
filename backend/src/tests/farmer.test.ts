import request from 'supertest';
import { app } from '../app';
import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

describe('Farmer Routes', () => {
  let accessToken: string;
  let testUserId: string;
  let testFarmerId: string;
  let testKebeleId: string;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('Test@123456', 12);
    const user = await db.user.create({
      data: {
        name: 'Test Field Agent',
        email: 'agent.test@agroethiopia.gov.et',
        password: hashedPassword,
        role: 'ADMIN',
        language: 'en',
      },
    });
    testUserId = user.id;

    // Login to get token
    const loginRes = await request(app)
      .post('/api/v1/auth/login')
      .send({
        email: 'agent.test@agroethiopia.gov.et',
        password: 'Test@123456',
      });
    accessToken = loginRes.body.data.accessToken;

    // Get a kebele for testing
    const kebele = await db.kebele.findFirst();
    if (kebele) testKebeleId = kebele.id;
  });

  afterAll(async () => {
    // Cleanup
    if (testFarmerId) {
      await db.farmer.delete({ where: { id: testFarmerId } });
    }
    await db.user.delete({ where: { id: testUserId } });
    await db.$disconnect();
  });

  describe('GET /api/v1/farmers', () => {
    it('should return paginated farmers list', async () => {
      const res = await request(app)
        .get('/api/v1/farmers')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.pagination).toBeDefined();
      expect(res.body.pagination.total).toBeGreaterThanOrEqual(0);
    });

    it('should filter farmers by status', async () => {
      const res = await request(app)
        .get('/api/v1/farmers?status=ACTIVE')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      res.body.data.forEach((farmer: { status: string }) => {
        expect(farmer.status).toBe('ACTIVE');
      });
    });

    it('should search farmers by name', async () => {
      const res = await request(app)
        .get('/api/v1/farmers?search=Abebe')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.data).toBeInstanceOf(Array);
    });

    it('should reject unauthenticated request', async () => {
      const res = await request(app).get('/api/v1/farmers');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/farmers', () => {
    it('should register a new farmer', async () => {
      if (!testKebeleId) {
        console.warn('No kebele found, skipping test');
        return;
      }

      const res = await request(app)
        .post('/api/v1/farmers')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Farmer',
          phone: '+251911234567',
          gender: 'MALE',
          kebeleId: testKebeleId,
          landSizeHectare: 1.5,
          notes: 'Test farmer for automated testing',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.firstName).toBe('Test');
      expect(res.body.data.farmerId).toBeDefined();
      testFarmerId = res.body.data.id;
    });

    it('should detect duplicate farmer', async () => {
      if (!testKebeleId || !testFarmerId) return;

      const res = await request(app)
        .post('/api/v1/farmers/check-duplicate')
        .set('Authorization', `Bearer ${accessToken}`)
        .send({
          firstName: 'Test',
          lastName: 'Farmer',
          kebeleId: testKebeleId,
        });

      expect(res.status).toBe(200);
      expect(res.body.data.hasDuplicates).toBe(true);
    });
  });

  describe('GET /api/v1/farmers/:id', () => {
    it('should return farmer details', async () => {
      if (!testFarmerId) return;

      const res = await request(app)
        .get(`/api/v1/farmers/${testFarmerId}`)
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBe(testFarmerId);
    });

    it('should return 404 for non-existent farmer', async () => {
      const res = await request(app)
        .get('/api/v1/farmers/nonexistentid123')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(404);
    });
  });

  describe('PATCH /api/v1/farmers/:id/status', () => {
    it('should update farmer status', async () => {
      if (!testFarmerId) return;

      const res = await request(app)
        .patch(`/api/v1/farmers/${testFarmerId}/status`)
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ status: 'INACTIVE' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('INACTIVE');
    });
  });
});
