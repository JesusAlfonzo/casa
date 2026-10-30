import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Reports & Analytics Suite', () => {
  let authHeaders: Record<string, string>;

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;
  });

  it('1. Debe obtener el reporte consolidado de ventas y recaudación', async () => {
    const res = await request(app)
      .get('/api/reports/sales')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('totalInvoiced');
    expect(res.body.summary).toHaveProperty('totalCollected');
    expect(res.body.summary).toHaveProperty('averageTicket');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('2. Debe obtener el reporte de valoración de existencias e inventario', async () => {
    const res = await request(app)
      .get('/api/reports/inventory')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('totalStockUnits');
    expect(res.body.summary).toHaveProperty('totalCostValuation');
    expect(res.body.summary).toHaveProperty('totalRetailValuation');
    expect(Array.isArray(res.body.items)).toBe(true);
  });

  it('3. Debe obtener el reporte de flujo de fondos y saldos por cuenta', async () => {
    const res = await request(app)
      .get('/api/reports/cashflow')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.accountBalances)).toBe(true);
    expect(res.body).toHaveProperty('flowsByCurrency');
    expect(Array.isArray(res.body.recentTransactions)).toBe(true);
  });

  it('4. Debe obtener el reporte de parque streaming y suscripciones', async () => {
    const res = await request(app)
      .get('/api/reports/subscriptions')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('summary');
    expect(res.body.summary).toHaveProperty('totalActive');
    expect(res.body).toHaveProperty('capacity');
    expect(res.body.capacity).toHaveProperty('occupancyPercent');
    expect(Array.isArray(res.body.upcomingRenewals)).toBe(true);
  });
});
