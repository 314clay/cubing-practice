import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../app.js';

describe('Health Check', () => {
  it('GET /api/health returns ok status', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.timestamp).toBeDefined();
  });
});

describe('Scrambles API', () => {
  describe('GET /api/scrambles/random', () => {
    it('returns scrambles for valid moves parameter', async () => {
      const res = await request(app).get('/api/scrambles/random?moves=4');

      expect(res.status).toBe(200);
      expect(res.body.scrambles).toBeDefined();
      expect(Array.isArray(res.body.scrambles)).toBe(true);
    });

    it('returns 400 when moves parameter missing', async () => {
      const res = await request(app).get('/api/scrambles/random');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMS');
    });

    it('returns 400 when moves out of range', async () => {
      const res = await request(app).get('/api/scrambles/random?moves=10');

      expect(res.status).toBe(400);
      expect(res.body.error.code).toBe('INVALID_PARAMS');
    });

    it('respects count parameter', async () => {
      const res = await request(app).get('/api/scrambles/random?moves=4&count=5');

      expect(res.status).toBe(200);
      expect(res.body.scrambles.length).toBeLessThanOrEqual(5);
    });
  });

  describe('GET /api/scrambles/count', () => {
    it('returns scramble counts per difficulty', async () => {
      const res = await request(app).get('/api/scrambles/count');

      expect(res.status).toBe(200);
      expect(res.body.counts).toBeDefined();
      expect(typeof res.body.counts).toBe('object');
    });
  });
});

describe('404 Handler', () => {
  it('returns 404 for unknown routes', async () => {
    const res = await request(app).get('/api/nonexistent');

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });
});
