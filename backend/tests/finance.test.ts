import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Finances & Treasury Integration Suite', () => {
  let authHeaders: Record<string, string> = {};
  let baseCurrencyId = '';
  let targetCurrencyId = '';
  let testAccountId = '';
  let paymentMethodId = '';
  let transactionId = '';

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;

    // Obtener monedas para pruebas
    const currRes = await request(app)
      .get('/api/currencies')
      .set(authHeaders);

    expect(currRes.status).toBe(200);
    const currencies = currRes.body.data;
    const baseCur = currencies.find((c: any) => c.isBase || c.code === 'USD');
    const vesCur = currencies.find((c: any) => c.code === 'VES');

    baseCurrencyId = baseCur?.id || currencies[0].id;
    targetCurrencyId = vesCur?.id || currencies[1]?.id || baseCurrencyId;

    // Obtener un método de pago existente
    const pmRes = await request(app)
      .get('/api/payment-methods')
      .set(authHeaders);

    expect(pmRes.status).toBe(200);
    expect(pmRes.body.data.length).toBeGreaterThan(0);
    paymentMethodId = pmRes.body.data[0].id;
  });

  it('1. Debe listar cuentas financieras existentes', async () => {
    const res = await request(app)
      .get('/api/financial-accounts')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  it('2. Debe crear una nueva cuenta financiera (Billetera Digital)', async () => {
    const res = await request(app)
      .post('/api/financial-accounts')
      .set(authHeaders)
      .send({
        name: 'Billetera Binance Test Suite',
        type: 'DIGITAL_WALLET',
        bankName: 'Binance P2P',
        accountNumber: 'test-pay@binance.com',
        holderName: 'Tesorería Central',
        currencyId: baseCurrencyId,
        initialBalance: 500.0,
        paymentMethodIds: [paymentMethodId],
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(Number(res.body.data.currentBalance)).toBe(500.0);

    testAccountId = res.body.data.id;
  });

  it('3. Debe ajustar el saldo de la cuenta financiera con auditoría', async () => {
    const res = await request(app)
      .post(`/api/financial-accounts/${testAccountId}/adjust-balance`)
      .set(authHeaders)
      .send({
        newBalance: 650.0,
        reason: 'Arqueo de prueba e ingreso de capital',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.currentBalance)).toBe(650.0);
  });

  it('4. Debe listar y fijar una tasa de cambio', async () => {
    const res = await request(app)
      .post('/api/exchange-rates')
      .set(authHeaders)
      .send({
        sourceCurrencyId: baseCurrencyId,
        targetCurrencyId: targetCurrencyId,
        rate: 55.25,
        source: 'Prueba Automatizada Suite',
        effectiveFrom: new Date().toISOString(),
        isActive: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(Number(res.body.data.rate)).toBe(55.25);
  });

  it('5. Debe registrar un movimiento de pago manual (INFLOW)', async () => {
    const res = await request(app)
      .post('/api/payment-transactions')
      .set(authHeaders)
      .send({
        flowType: 'INFLOW',
        financialAccountId: testAccountId,
        paymentMethodId: paymentMethodId,
        amount: 150.0,
        reference: 'REF-TEST-9988',
        notes: 'Ingreso extraordinario por servicios adicionales',
        paidAt: new Date().toISOString(),
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('id');
    expect(res.body.data.flowType).toBe('INFLOW');

    transactionId = res.body.data.id;

    // Verificar que el saldo de la cuenta aumentó de 650 a 800
    const accRes = await request(app)
      .get(`/api/financial-accounts/${testAccountId}`)
      .set(authHeaders);

    expect(accRes.status).toBe(200);
    expect(Number(accRes.body.data.currentBalance)).toBe(800.0);
  });

  it('6. Debe anular la transacción de pago y revertir el saldo de la cuenta', async () => {
    const res = await request(app)
      .post(`/api/payment-transactions/${transactionId}/void`)
      .set(authHeaders)
      .send({
        reason: 'Reverso por error en comprobante de pago',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);

    // Verificar que el saldo de la cuenta volvió a 650
    const accRes = await request(app)
      .get(`/api/financial-accounts/${testAccountId}`)
      .set(authHeaders);

    expect(accRes.status).toBe(200);
    expect(Number(accRes.body.data.currentBalance)).toBe(650.0);
  });
});
