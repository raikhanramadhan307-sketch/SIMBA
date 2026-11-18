import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { query } from './db';

const secret = () => new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret');

export const signToken = (payload) =>
  new SignJWT(payload).setProtectedHeader({ alg: 'HS256' }).setExpirationTime('1d').sign(secret());

export async function verifyToken(token) {
  try { return (await jwtVerify(token, secret())).payload; } catch { return null; }
}

// Ambil user aktif dari cookie. Supplier yang belum Approved dianggap tidak punya akses.
export async function getUser() {
  const token = cookies().get('token')?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload) return null;
  const rows = await query('SELECT id, name, email, role, status, company FROM users WHERE id = ?', [payload.id]);
  const user = rows[0];
  if (!user) return null;
  if (user.role === 'supplier' && user.status !== 'approved') return null;
  return user;
}
