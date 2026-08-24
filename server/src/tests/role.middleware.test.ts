import { randomUUID } from 'node:crypto';
import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { requireRole } from '../middleware/role.middleware.js';

describe('requireRole middleware', () => {
  it('blocks a customer from hitting an owner-only route', async () => {
    const app = express();

    app.post(
      '/dashboard/tables',
      (req, _res, next) => {
        req.user = { id: randomUUID(), role: 'customer' };
        next();
      },
      requireRole(['owner']),
      (_req, res) => {
        res.status(204).send();
      },
    );

    const response = await request(app).post('/dashboard/tables');

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      error: {
        code: 'FORBIDDEN',
        message: 'Insufficient role',
      },
    });
  });
});
