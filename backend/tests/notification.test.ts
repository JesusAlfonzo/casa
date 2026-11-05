import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Notification & Alert Suite', () => {
  let authHeaders: Record<string, string>;
  let createdNotificationId: string;

  beforeAll(async () => {
    const auth = await getAdminAuth();
    authHeaders = auth.headers;
  });

  it('1. Debe ejecutar el escaneo automático de alertas del ERP', async () => {
    const res = await request(app)
      .post('/api/notifications/scan')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body).toHaveProperty('createdCount');
    expect(res.body).toHaveProperty('details');
    expect(res.body.details).toHaveProperty('expiringSubscriptions');
    expect(res.body.details).toHaveProperty('upcomingCutoffs');
    expect(res.body.details).toHaveProperty('lowStockProducts');
    expect(res.body.details).toHaveProperty('outOfStockProducts');
    expect(res.body.details).toHaveProperty('overduePayments');
  });

  it('2. Debe listar las notificaciones con unreadCount y total', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.items)).toBe(true);
    expect(typeof res.body.unreadCount).toBe('number');
    expect(typeof res.body.total).toBe('number');

    if (res.body.items.length > 0) {
      createdNotificationId = res.body.items[0].id;
    }
  });

  it('3. Debe marcar una notificación específica como leída si existe', async () => {
    if (!createdNotificationId) {
      // Si no había alertas automáticas, creamos una manualmente para la prueba
      const scanRes = await request(app)
        .post('/api/notifications/scan')
        .set(authHeaders);
      expect(scanRes.status).toBe(200);
    }

    const listRes = await request(app)
      .get('/api/notifications')
      .set(authHeaders);

    if (listRes.body.items.length > 0) {
      const targetId = listRes.body.items[0].id;
      const res = await request(app)
        .patch(`/api/notifications/${targetId}/read`)
        .set(authHeaders);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isRead).toBe(true);
    }
  });

  it('4. Debe marcar todas las notificaciones como leídas', async () => {
    const res = await request(app)
      .post('/api/notifications/mark-all-read')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.updatedCount).toBe('number');

    // Verificar que unreadCount sea 0
    const checkRes = await request(app)
      .get('/api/notifications?isRead=false')
      .set(authHeaders);

    expect(checkRes.status).toBe(200);
    expect(checkRes.body.items.length).toBe(0);
    expect(checkRes.body.unreadCount).toBe(0);
  });
});
