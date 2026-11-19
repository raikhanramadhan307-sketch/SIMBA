import { route, fail } from '@/lib/api';
import { query } from '@/lib/db';

export const GET = route(['admin', 'manager', 'staff'], async () =>
  query(`SELECT c.*, (SELECT COUNT(*) FROM products p WHERE p.category_id = c.id) AS product_count
         FROM categories c ORDER BY c.name`)
);

export const POST = route(['admin', 'manager'], async ({ body }) => {
  const name = String(body.name || '').trim(), description = String(body.description || '').trim();
  if (!name || !description) fail(400, 'Nama kategori dan deskripsi wajib diisi');
  const dup = await query('SELECT id FROM categories WHERE name = ?', [name]);
  if (dup.length) fail(409, 'Nama kategori sudah dipakai');
  const r = await query('INSERT INTO categories (name, description, image) VALUES (?,?,?) RETURNING id', [name, description, body.image || null]);
  return { id: r[0].id, message: 'Kategori berhasil ditambahkan' };
});
