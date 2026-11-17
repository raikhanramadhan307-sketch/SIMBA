import { NextResponse } from 'next/server';
import { getUser } from './auth';

export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export const fail = (status, message) => { throw new HttpError(status, message); };
const json = (data, status = 200) => NextResponse.json(data, { status });

// Pembungkus route: cek login + role, parse body JSON, tangani error seragam
export function route(roles, fn) {
  return async (req, ctx) => {
    try {
      const user = await getUser();
      if (!user) fail(401, 'Sesi tidak valid, silakan login ulang');
      if (roles && !roles.includes(user.role)) fail(403, 'Anda tidak memiliki akses');
      const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await req.json().catch(() => ({})) : {};
      return json(await fn({ req, user, body, params: ctx?.params || {}, url: new URL(req.url) }));
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message, ...(e.extra || {}) }, e.status);
      if (e.code === '23505') return json({ error: 'Data duplikat: nilai unik sudah dipakai' }, 409);
      if (e.code === '23503')
        return json({ error: 'Data masih dipakai oleh transaksi atau restock, tidak dapat dihapus' }, 409);
      console.error(e);
      return json({ error: 'Terjadi kesalahan pada server' }, 500);
    }
  };
}
