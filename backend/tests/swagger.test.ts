import { describe, it, expect } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Swagger / OpenAPI 3.0 Integration Suite', () => {
  it('Debe exponer la especificación cruda OpenAPI 3.0 en /api/docs.json', async () => {
    const res = await request(app).get('/api/docs.json');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/application\/json/);
    expect(res.body).toHaveProperty('openapi', '3.0.3');
    expect(res.body.info).toHaveProperty('title', 'ERP Híbrido - API REST');
    expect(res.body.info).toHaveProperty('version', '1.0.0');

    // Comprobar esquema de seguridad Bearer
    expect(res.body.components.securitySchemes).toHaveProperty('bearerAuth');
    expect(res.body.components.securitySchemes.bearerAuth.type).toBe('http');
    expect(res.body.components.securitySchemes.bearerAuth.scheme).toBe('bearer');

    // Comprobar presencia de esquemas de los 8 módulos
    const schemas = res.body.components.schemas;
    expect(schemas).toHaveProperty('User');
    expect(schemas).toHaveProperty('Role');
    expect(schemas).toHaveProperty('Product');
    expect(schemas).toHaveProperty('Supplier');
    expect(schemas).toHaveProperty('Inventory');
    expect(schemas).toHaveProperty('InventoryMovement');
    expect(schemas).toHaveProperty('Currency');
    expect(schemas).toHaveProperty('FinancialAccount');
    expect(schemas).toHaveProperty('StreamingAccount');
    expect(schemas).toHaveProperty('StreamingProfile');
    expect(schemas).toHaveProperty('Customer');
    expect(schemas).toHaveProperty('Subscription');
    expect(schemas).toHaveProperty('Sale');

    // Comprobar presencia de endpoints clave en paths
    const paths = res.body.paths;
    expect(paths).toHaveProperty('/health');
    expect(paths).toHaveProperty('/api/auth/signin');
    expect(paths).toHaveProperty('/api/users');
    expect(paths).toHaveProperty('/api/products');
    expect(paths).toHaveProperty('/api/inventories');
    expect(paths).toHaveProperty('/api/currencies');
    expect(paths).toHaveProperty('/api/purchases');
    expect(paths).toHaveProperty('/api/streaming-accounts');
    expect(paths).toHaveProperty('/api/customers');
    expect(paths).toHaveProperty('/api/sales');
  });

  it('Debe servir la interfaz web de Swagger UI en /api/docs/', async () => {
    const res = await request(app).get('/api/docs/');

    expect(res.status).toBe(200);
    expect(res.headers['content-type']).toMatch(/text\/html/);
    expect(res.text).toContain('swagger-ui');
  });
});
