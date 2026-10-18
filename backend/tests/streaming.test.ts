import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';
import { getAdminAuth } from './test-utils.js';

describe('Streaming Accounts & Profiles Suite', () => {
  let authHeaders: Record<string, string> = {};

  beforeAll(async () => {
    const { token, cookies } = await getAdminAuth();
    if (token) {
      authHeaders['Authorization'] = `Bearer ${token}`;
    }
    if (cookies.length > 0) {
      authHeaders['Cookie'] = cookies.join('; ');
    }
  });

  it('Debe consultar las métricas y estadísticas de streaming', async () => {
    const res = await request(app)
      .get('/api/streaming-accounts/stats')
      .set(authHeaders);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data).toHaveProperty('totalAccounts');
    expect(res.body.data).toHaveProperty('totalCapacity');
    expect(res.body.data).toHaveProperty('totalOccupiedProfiles');
  });

  it('Debe crear una cuenta maestra y autogenerar exactamente sus ranuras de perfil', async () => {
    // 1. Obtener un servicio de streaming existente (ej: Netflix)
    const srvRes = await request(app)
      .get('/api/services?requiresStreamingAccount=true')
      .set(authHeaders);

    expect(srvRes.body.items.length).toBeGreaterThan(0);
    const service = srvRes.body.items[0];

    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + 45);

    const email = `test.account.${Date.now()}@streamingtest.com`;

    // 2. Registrar cuenta de 4 pantallas
    const res = await request(app)
      .post('/api/streaming-accounts')
      .set(authHeaders)
      .send({
        serviceId: service.id,
        accessEmail: email,
        accessPassword: 'SecureTestPassword123!',
        securityPin: '9988',
        profileCapacity: 4,
        supplierCutoffDate: cutoffDate.toISOString(),
        notes: 'Cuenta creada por test automatizado',
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.profileCapacity).toBe(4);
    expect(res.body.data.occupiedProfiles).toBe(0);
    expect(res.body.data.status).toBe('AVAILABLE');

    // 3. Verificar que se hayan creado exactamente 4 perfiles
    expect(res.body.data.profiles.length).toBe(4);
    expect(res.body.data.profiles[0].slotNumber).toBe(1);
    expect(res.body.data.profiles[3].slotNumber).toBe(4);

    // 4. Alternar ocupación del primer perfil y verificar sincronización de la cuenta
    const profileId = res.body.data.profiles[0].id;
    const toggleRes = await request(app)
      .patch(`/api/streaming-profiles/${profileId}/toggle-occupied`)
      .set(authHeaders)
      .send({ isOccupied: true });

    expect(toggleRes.status).toBe(200);
    expect(toggleRes.body.data.isOccupied).toBe(true);

    // 5. Verificar que la cuenta maestra ahora tenga 1 perfil ocupado
    const accountCheck = await request(app)
      .get(`/api/streaming-accounts/${res.body.data.id}`)
      .set(authHeaders);

    expect(accountCheck.body.data.occupiedProfiles).toBe(1);
  });
});
