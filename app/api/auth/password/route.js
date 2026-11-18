import bcrypt from 'bcryptjs';
import { route, fail } from '@/lib/api';
import { query } from '@/lib/db';

// Ubah password milik akun yang sedang login (semua peran).
// Catatan: kegagalan memakai status 400 (bukan 401) agar klien tidak dianggap sesi habis.
export const PUT = route(null, async ({ user, body }) => {
  const current = String(body.current_password ?? '');
  const next = String(body.new_password ?? '');
  const confirm = String(body.confirm_password ?? '');

  if (!current || !next || !confirm) fail(400, 'Semua field wajib diisi');
  const [row] = await query('SELECT password FROM users WHERE id = ?', [user.id]);
  if (!row || !(await bcrypt.compare(current, row.password))) fail(400, 'Password saat ini salah');
  if (next.length < 8) fail(400, 'Password baru minimal 8 karakter');
  if (next.length > 72) fail(400, 'Password baru maksimal 72 karakter');
  if (next !== confirm) fail(400, 'Konfirmasi password tidak cocok');
  if (next === current) fail(400, 'Password baru harus berbeda dari password saat ini');

  await query('UPDATE users SET password = ? WHERE id = ?', [await bcrypt.hash(next, 10), user.id]);
  return { message: 'Password berhasil diubah' };
});
