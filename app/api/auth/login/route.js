import { NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { query } from '@/lib/db';
import { signToken } from '@/lib/auth';
import { dbErrorResponse } from '@/lib/dberror';

export async function POST(req) {
  const { email, password } = await req.json().catch(() => ({}));
  if (!email || !password) return NextResponse.json({ error: 'Email dan password wajib diisi' }, { status: 400 });

  let user;
  try {
    [user] = await query('SELECT * FROM users WHERE email = ?', [String(email).trim().toLowerCase()]);
  } catch (e) {
    return dbErrorResponse(e);
  }
  if (!user)
    return NextResponse.json({ error: 'Email tidak terdaftar', field: 'email' }, { status: 401 });
  if (!(await bcrypt.compare(password, user.password)))
    return NextResponse.json({ error: 'Password salah', field: 'password' }, { status: 401 });

  if (user.role === 'supplier' && user.status === 'pending')
    return NextResponse.json({ error: 'Akun Anda sedang ditinjau oleh admin. Silakan coba lagi setelah akun disetujui.', code: 'pending' }, { status: 403 });
  if (user.role === 'supplier' && user.status === 'rejected')
    return NextResponse.json({ error: `Pendaftaran akun Anda ditolak oleh admin.${user.status_note ? ` Alasan: ${user.status_note}` : ''}`, code: 'rejected' }, { status: 403 });

  const token = await signToken({ id: user.id, role: user.role });
  const res = NextResponse.json({ ok: true, role: user.role });
  res.cookies.set('token', token, {
    httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24,
    secure: process.env.COOKIE_SECURE === 'true',
  });
  return res;
}
