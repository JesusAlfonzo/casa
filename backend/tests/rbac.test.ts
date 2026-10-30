import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('RBAC & Administration Suite', () => {
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;
  });

  it('1. Debe listar usuarios del sistema con paginación y roles', async () => {
    const res = await request(app)
      .get('/api/users?page=1&limit=10')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(res.body.total).toBeGreaterThanOrEqual(1);
    expect(res.body.items[0]).toHaveProperty('roles');
  });

  it('2. Debe registrar un nuevo usuario desde el endpoint administrativo POST /api/users', async () => {
    const uniqueEmail = `operador_${Date.now()}@erphibrido.com`;
    const uniqueUsername = `op_${Date.now()}`;

    const res = await request(app)
      .post('/api/users')
      .set(authHeaders)
      .send({
        name: 'Operador',
        lastName: 'Prueba',
        email: uniqueEmail,
        username: uniqueUsername,
        phone: '+58412000000',
        password: 'Password123!',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.email).toBe(uniqueEmail);

    const createdUserId = res.body.data.id;

    // 3. Alternar estado activo / suspendido
    const toggleRes = await request(app)
      .patch(`/api/users/${createdUserId}/status`)
      .set(authHeaders);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.success).toBe(true);
    expect(toggleRes.body.data.isActive).toBe(false);
  });

  it('4. Debe consultar el catálogo de permisos agrupado por módulo', async () => {
    const res = await request(app)
      .get('/api/permissions/by-module')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
    expect(res.body.data[0]).toHaveProperty('module');
    expect(res.body.data[0]).toHaveProperty('permissions');
  });

  it('5. Debe crear, consultar y eliminar un rol personalizado', async () => {
    const uniqueRoleName = `TEST_ROLE_${Date.now()}`;

    // Crear rol
    const createRes = await request(app)
      .post('/api/roles')
      .set(authHeaders)
      .send({
        name: uniqueRoleName,
        description: 'Rol de prueba automatizada',
        isActive: true,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.name).toBe(uniqueRoleName);

    const roleId = createRes.body.data.id;

    // Eliminar rol
    const deleteRes = await request(app)
      .delete(`/api/roles/${roleId}`)
      .set(authHeaders);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
