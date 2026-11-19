import { route, fail, HttpError } from '@/lib/api';
import { query } from '@/lib/db';
import { validateProduct } from '@/lib/validators';

export const PUT = route(['admin', 'manager'], async ({ body, params }) => {
  const [p] = await query('SELECT id FROM products WHERE id = ?', [params.id]);
  if (!p) fail(404, 'Produk tidak ditemukan');
  const d = validateProduct(body, true); // SKU tidak dapat diubah
  await query(
    `UPDATE products SET name=?, category_id=?, description=?, buy_price=?, sell_price=?, min_stock=?, low_stock=?,
     stock=?, unit=?, rack_location=?, image=? WHERE id=?`,
    [d.name, d.category_id, d.description, d.buy_price, d.sell_price, d.min_stock, d.low_stock, d.stock, d.unit, d.rack_location, d.image, params.id]
  );
  return { message: 'Produk berhasil diperbarui' };
});

export const DELETE = route(['admin', 'manager'], async ({ params, url }) => {
  const [p] = await query('SELECT id, name, stock FROM products WHERE id = ?', [params.id]);
  if (!p) fail(404, 'Produk tidak ditemukan');
  if (p.stock > 0 && url.searchParams.get('force') !== '1') {
    const e = new HttpError(409, `Produk "${p.name}" masih memiliki stok ${p.stock}. Konfirmasi untuk tetap menghapus.`);
    e.extra = { warning: true };
    throw e;
  }
  await query('DELETE FROM products WHERE id = ?', [params.id]);
  return { message: 'Produk berhasil dihapus' };
});
