import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Authentication & RBAC Suite', () => {
  it('Debe rechazar solicitudes a rutas protegidas sin credenciales (401)', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
    expect(res.body).toHaveProperty('error');
  });

  it('Debe iniciar sesión exitosamente con el usuario administrador del seed', async () => {
    const res = await request(app).post('/api/auth/signin').send({
      email: 'admin@erphibrido.com',
      password: 'AdminPassword123!',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@erphibrido.com');
    expect(res.body.user.roles).toContain('ADMIN');
  });

  it('Debe consultar /api/auth/me autenticado mediante Bearer token o cookies', async () => {
    const { headers } = await getAdminAuth();

    const res = await request(app).get('/api/auth/me').set(headers);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe('admin@erphibrido.com');
    expect(res.body.roles).toContain('ADMIN');
    expect(Array.isArray(res.body.permissions)).toBe(true);
  });
});
