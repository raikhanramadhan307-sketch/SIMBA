import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { dbErrorResponse } from '@/lib/dberror';

// Hanya Supplier yang dapat mendaftar sendiri; statusnya Pending sampai disetujui Admin
export async function POST(req) {
  const b = await req.json().catch(() => ({}));
  const name = String(b.name || '').trim(), company = String(b.company || '').trim();
  const email = String(b.email || '').trim().toLowerCase(), phone = String(b.phone || '').trim();
  const bad = (m) => NextResponse.json({ error: m }, { status: 400 });

  if (!name || !company || !email || !phone || !b.password) return bad('Semua field wajib diisi');
  if (!/^\S+@\S+\.\S+$/.test(email)) return bad('Format email tidak valid');
  if (String(b.password).length < 8) return bad('Password minimal 8 karakter');

  try {
  const exists = await query('SELECT id FROM users WHERE email = ?', [email]);
  if (exists.length) return NextResponse.json({ error: 'Email sudah terdaftar' }, { status: 409 });

  await query(
    `INSERT INTO users (name, email, password, role, status, company, phone) VALUES (?, ?, ?, 'supplier', 'pending', ?, ?)`,
    [name, email, await bcrypt.hash(b.password, 10), company, phone]
  );
  return NextResponse.json({ ok: true, message: 'Pendaftaran berhasil. Akun Anda akan ditinjau oleh admin.' }, { status: 201 });
  } catch (e) {
    return dbErrorResponse(e);
  }
}
