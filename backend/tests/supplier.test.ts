import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Suppliers Directory & Product Catalog Suite', () => {
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;
  });

  it('1. Debe listar proveedores con paginación y estructura de metadatos', async () => {
    const res = await request(app)
      .get('/api/suppliers?page=1&limit=10')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.meta).toHaveProperty('total');
    expect(res.body.meta).toHaveProperty('totalPages');
  });

  it('2. Debe crear un proveedor, consultar su ficha detallada y alternar su estado', async () => {
    const uniqueTaxId = `J-${Date.now().toString().slice(-8)}-0`;
    const uniqueLegalName = `Distribuidora Automatizada ${Date.now()}`;

    // Crear proveedor
    const createRes = await request(app)
      .post('/api/suppliers')
      .set(authHeaders)
      .send({
        legalName: uniqueLegalName,
        tradeName: 'Comercializadora Prueba',
        taxId: uniqueTaxId,
        contactName: 'Gerente Compras',
        phone: '+58412999999',
        email: `proveedor_${Date.now()}@test.com`,
        address: 'Zona Industrial Caracas',
        notes: 'Condiciones de pago a 15 días',
        isActive: true,
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.legalName).toBe(uniqueLegalName);

    const supplierId = createRes.body.data.id;

    // Consultar detalle completo
    const detailRes = await request(app)
      .get(`/api/suppliers/${supplierId}`)
      .set(authHeaders);

    expect(detailRes.status).toBe(200);
    expect(detailRes.body.success).toBe(true);
    expect(detailRes.body.data.id).toBe(supplierId);
    expect(Array.isArray(detailRes.body.data.products)).toBe(true);
    expect(Array.isArray(detailRes.body.data.purchases)).toBe(true);

    // Alternar estado activo / inactivo
    const toggleRes = await request(app)
      .patch(`/api/suppliers/${supplierId}/status`)
      .set(authHeaders);

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.success).toBe(true);
    expect(toggleRes.body.data.isActive).toBe(false);

    // Eliminar proveedor de prueba (sin compras = eliminación física)
    const deleteRes = await request(app)
      .delete(`/api/suppliers/${supplierId}`)
      .set(authHeaders);

    expect(deleteRes.status).toBe(200);
    expect(deleteRes.body.success).toBe(true);
  });
});
