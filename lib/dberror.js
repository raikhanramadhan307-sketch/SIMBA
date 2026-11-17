import { NextResponse } from 'next/server';

// Ubah error database menjadi pesan yang bisa ditindaklanjuti
export function dbErrorResponse(e) {
  console.error(e);
  const map = {
    ECONNREFUSED: 'Tidak dapat terhubung ke PostgreSQL. Pastikan server PostgreSQL berjalan dan DB_HOST/DB_PORT di .env.local benar.',
    '28P01': 'Password PostgreSQL salah. Periksa DB_USER dan DB_PASSWORD di .env.local.',
    '28000': 'Login PostgreSQL ditolak. Periksa DB_USER dan DB_PASSWORD di .env.local.',
    '3D000': 'Database belum ada. Buat database simba_db di pgAdmin atau jalankan: npm run db:init',
    '42P01': 'Tabel belum dibuat. Jalankan database/simba.sql di pgAdmin atau: npm run db:init',
    '42703': 'Struktur tabel tidak sesuai. Jalankan ulang database/simba.sql',
  };
  // Node 20+ membungkus ECONNREFUSED dalam AggregateError
  const code = e.code || e.errors?.[0]?.code;
  // DB_PASSWORD kosong / .env.local tidak terbaca -> driver pg menerima password bukan string
  if (/client password must be a/i.test(e.message || ''))
    return NextResponse.json({ error: 'DB_PASSWORD belum terbaca. Pastikan file .env.local ada di folder project (sejajar package.json), berisi DB_PASSWORD=password_postgres_anda, lalu restart npm run dev.' }, { status: 500 });
  return NextResponse.json({ error: map[code] || `Kesalahan server: ${e.message}` }, { status: 500 });
}
