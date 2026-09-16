import request from 'supertest';
import { app } from '../app';
import { db } from '../lib/db';
import bcrypt from 'bcryptjs';

describe('Auth Routes', () => {
  let testUserId: string;
  let accessToken: string;

  beforeAll(async () => {
    // Create test user
    const hashedPassword = await bcrypt.hash('Test@123456', 12);
    const user = await db.user.create({
      data: {
        name: 'Test User',
        email: 'test@agroethiopia.gov.et',
        password: hashedPassword,
        role: 'ADMIN',
        language: 'en',
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    // Cleanup
    await db.user.delete({ where: { id: testUserId } });
    await db.$disconnect();
  });

  describe('POST /api/v1/auth/login', () => {
    it('should login with valid credentials', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@agroethiopia.gov.et',
          password: 'Test@123456',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.accessToken).toBeDefined();
      expect(res.body.data.user.email).toBe('test@agroethiopia.gov.et');
      accessToken = res.body.data.accessToken;
    });

    it('should reject invalid password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'test@agroethiopia.gov.et',
          password: 'wrongpassword',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should reject non-existent email', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({
          email: 'notexist@agroethiopia.gov.et',
          password: 'Test@123456',
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it('should require email and password', async () => {
      const res = await request(app)
        .post('/api/v1/auth/login')
        .send({});

      expect(res.status).toBe(400);
    });
  });

  describe('GET /api/v1/auth/me', () => {
    it('should return current user with valid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.email).toBe('test@agroethiopia.gov.et');
    });

    it('should reject request without token', async () => {
      const res = await request(app).get('/api/v1/auth/me');
      expect(res.status).toBe(401);
    });

    it('should reject invalid token', async () => {
      const res = await request(app)
        .get('/api/v1/auth/me')
        .set('Authorization', 'Bearer invalidtoken');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/v1/auth/logout', () => {
    it('should logout successfully', async () => {
      const res = await request(app)
        .post('/api/v1/auth/logout')
        .set('Authorization', `Bearer ${accessToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
    });
  });
});
