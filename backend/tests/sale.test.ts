import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Sales, Billing & Kardex Integration Suite', () => {
  let authHeaders: Record<string, string> = {};

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;
  });

  it('Debe consultar las métricas consolidadas de ventas', async () => {
    const res = await request(app).get('/api/sales/stats').set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalSales');
    expect(res.body.data).toHaveProperty('totalInvoiced');
    expect(res.body.data).toHaveProperty('totalCollected');
  });

  it('Debe emitir una venta con descuento de stock, Kardex y cobro, y luego anularla', async () => {
    // 1. Obtener datos necesarios para la venta (Producto, Almacén, Moneda, Cuenta y Método)
    const [invRes, curRes, accRes, pmRes, custRes] = await Promise.all([
      request(app).get('/api/inventories').set(authHeaders),
      request(app).get('/api/currencies').set(authHeaders),
      request(app).get('/api/financial-accounts').set(authHeaders),
      request(app).get('/api/payment-methods').set(authHeaders),
      request(app).get('/api/customers').set(authHeaders),
    ]);

    const targetInventory = invRes.body.data[0];
    const initialProductStock = Number(targetInventory.currentQuantity);
    expect(initialProductStock).toBeGreaterThanOrEqual(2);

    const currencyList = curRes.body.data || curRes.body.items || [];
    const currencyUsd = currencyList.find((c: any) => c.code === 'USD');
    expect(currencyUsd).toBeDefined();

    const accountList = accRes.body.data || accRes.body.items || [];
    const financialAccount = accountList.find(
      (a: any) => a.currencyId === currencyUsd.id
    );
    expect(financialAccount).toBeDefined();
    const initialAccountBalance = Number(financialAccount.currentBalance);

    const paymentMethodList = pmRes.body.data || pmRes.body.items || [];
    const paymentMethod = paymentMethodList[0];
    expect(paymentMethod).toBeDefined();

    const customerList = custRes.body.items || custRes.body.data || [];
    const customer = customerList[0];
    expect(customer).toBeDefined();

    const saleQty = 2;
    const unitPrice = 20.0;
    const saleTotal = saleQty * unitPrice;

    // 2. Crear la venta con pago completo
    const createRes = await request(app)
      .post('/api/sales')
      .set(authHeaders)
      .send({
        customerId: customer.id,
        currencyId: currencyUsd.id,
        items: [
          {
            itemType: 'PRODUCT',
            productId: targetInventory.productId,
            inventoryId: targetInventory.id,
            quantity: saleQty,
            unitPrice: unitPrice,
          },
        ],
        payments: [
          {
            financialAccountId: financialAccount.id,
            paymentMethodId: paymentMethod.id,
            amount: saleTotal,
            reference: 'TEST-PAY-001',
          },
        ],
      });

    expect(createRes.status).toBe(201);
    expect(createRes.body.success).toBe(true);
    expect(createRes.body.data.status).toBe('COMPLETED');
    expect(Number(createRes.body.data.total)).toBe(saleTotal);
    expect(Number(createRes.body.data.totalCollected)).toBe(saleTotal);

    const saleId = createRes.body.data.id;

    // 3. Verificar que el stock de inventario se haya descontado
    const checkInv = await request(app)
      .get(`/api/inventories/${targetInventory.id}`)
      .set(authHeaders);

    expect(Number(checkInv.body.data.currentQuantity)).toBe(
      initialProductStock - saleQty
    );

    // 4. Verificar que el saldo de la cuenta financiera receptora haya aumentado
    const checkAcc = await request(app)
      .get(`/api/financial-accounts/${financialAccount.id}`)
      .set(authHeaders);

    expect(Number(checkAcc.body.data.currentBalance)).toBeCloseTo(
      initialAccountBalance + saleTotal,
      2
    );

    // 5. Anular la venta
    const voidRes = await request(app)
      .post(`/api/sales/${saleId}/void`)
      .set(authHeaders)
      .send({ reason: 'Anulación de prueba automatizada' });

    expect(voidRes.status).toBe(200);
    expect(voidRes.body.data.status).toBe('VOIDED');

    // 6. Verificar reintegro del stock a su valor original
    const restoredInv = await request(app)
      .get(`/api/inventories/${targetInventory.id}`)
      .set(authHeaders);

    expect(Number(restoredInv.body.data.currentQuantity)).toBe(
      initialProductStock
    );

    // 7. Verificar reembolso del saldo de la cuenta financiera
    const restoredAcc = await request(app)
      .get(`/api/financial-accounts/${financialAccount.id}`)
      .set(authHeaders);

    expect(Number(restoredAcc.body.data.currentBalance)).toBeCloseTo(
      initialAccountBalance,
      2
    );
  });
});
