import request from 'supertest';
import app from '../src/app.js';

export async function getAdminAuth(): Promise<{
  token: string;
  cookies: string[];
  headers: Record<string, string>;
}> {
  const res = await request(app)
    .post('/api/auth/signin')
    .send({
      email: 'admin@erphibrido.com',
      password: 'AdminPassword123!',
    });

  const rawHeader = res.headers['set-cookie'];
  const rawCookies: string[] = Array.isArray(rawHeader)
    ? rawHeader
    : typeof rawHeader === 'string'
      ? [rawHeader]
      : [];
  const cookies = rawCookies.map((c) => c.split(';')[0]);
  const token =
    res.body?.token ||
    res.body?.data?.token ||
    res.body?.user?.token ||
    '';

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  if (cookies.length > 0) {
    headers['Cookie'] = cookies.join('; ');
  }

  return { token, cookies, headers };
}
