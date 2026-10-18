import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Inventory & Kardex Suite', () => {
  let authHeaders: Record<string, string> = {};

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;
  });

  it('Debe listar los registros de inventario con stock', async () => {
    const res = await request(app)
      .get('/api/inventories')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstItem = res.body.data[0];
    expect(firstItem).toHaveProperty('currentQuantity');
    expect(firstItem).toHaveProperty('product');
    expect(firstItem).toHaveProperty('location');
  });

  it('Debe consultar los movimientos del Kardex', async () => {
    const res = await request(app)
      .get('/api/inventories/movements')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);

    const firstKardex = res.body.data[0];
    expect(firstKardex).toHaveProperty('movementType');
    expect(firstKardex).toHaveProperty('previousStock');
    expect(firstKardex).toHaveProperty('resultingStock');
  });

  it('Debe realizar un ajuste positivo de inventario y asentar Kardex', async () => {
    // 1. Obtener un inventario existente
    const invRes = await request(app)
      .get('/api/inventories')
      .set(authHeaders);

    const targetInventory = invRes.body.data[0];
    const initialQty = Number(targetInventory.currentQuantity);

    // 2. Realizar ajuste positivo de +5 unidades
    const adjustRes = await request(app)
      .post('/api/inventories/adjust')
      .set(authHeaders)
      .send({
        productId: targetInventory.productId,
        locationId: targetInventory.locationId,
        type: 'POSITIVE_ADJUSTMENT',
        quantity: 5,
        reason: 'Ajuste de prueba automatizada',
      });

    expect(adjustRes.status).toBe(200);
    expect(adjustRes.body.success).toBe(true);
    expect(Number(adjustRes.body.data.inventory.currentQuantity)).toBe(
      initialQty + 5
    );
  });
});
