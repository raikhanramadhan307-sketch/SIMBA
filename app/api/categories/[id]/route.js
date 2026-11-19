import { route, fail } from '@/lib/api';
import { query } from '@/lib/db';

export const PUT = route(['admin', 'manager'], async ({ body, params }) => {
  const name = String(body.name || '').trim(), description = String(body.description || '').trim();
  if (!name || !description) fail(400, 'Nama kategori dan deskripsi wajib diisi');
  const dup = await query('SELECT id FROM categories WHERE name = ? AND id <> ?', [name, params.id]);
  if (dup.length) fail(409, 'Nama kategori sudah dipakai');
  await query('UPDATE categories SET name=?, description=?, image=? WHERE id=?', [name, description, body.image || null, params.id]);
  return { message: 'Kategori berhasil diperbarui' };
});

export const DELETE = route(['admin', 'manager'], async ({ params }) => {
  const [{ n }] = await query('SELECT COUNT(*) AS n FROM products WHERE category_id = ?', [params.id]);
  if (n > 0) fail(409, `Kategori masih memiliki ${n} produk dan tidak dapat dihapus`);
  await query('DELETE FROM categories WHERE id = ?', [params.id]);
  return { message: 'Kategori berhasil dihapus' };
});
