import { route } from '@/lib/api';
import { query } from '@/lib/db';
import { validateProduct } from '@/lib/validators';
import { STOCK_STATUS_SQL } from '@/lib/utils';

const BASE = `SELECT p.*, c.name AS category_name, ${STOCK_STATUS_SQL} AS stock_status
  FROM products p LEFT JOIN categories c ON c.id = p.category_id`;

export const GET = route(['admin', 'manager', 'staff'], async ({ url }) => {
  const sp = url.searchParams;
  const page = Math.max(1, +sp.get('page') || 1);
  const limit = Math.min(500, Math.max(1, +sp.get('limit') || 10));
  const where = [], params = [];
  if (sp.get('search')) { where.push('(t.name ILIKE ? OR t.sku ILIKE ?)'); params.push(`%${sp.get('search')}%`, `%${sp.get('search')}%`); }
  if (sp.get('category')) { where.push('t.category_id = ?'); params.push(+sp.get('category')); }
  if (sp.get('status')) { where.push('t.stock_status = ?'); params.push(sp.get('status')); }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [{ total }] = await query(`SELECT COUNT(*) AS total FROM (${BASE}) t ${w}`, params);
  const rows = await query(`SELECT * FROM (${BASE}) t ${w} ORDER BY t.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows, total, page, limit };
});

export const POST = route(['admin', 'manager'], async ({ body }) => {
  const d = validateProduct(body);
  const r = await query(
    `INSERT INTO products (name, sku, category_id, description, buy_price, sell_price, min_stock, low_stock, stock, unit, rack_location, image)
     VALUES (?,?,?,?,?,?,?,?,?,?,?,?) RETURNING id`,
    [d.name, d.sku, d.category_id, d.description, d.buy_price, d.sell_price, d.min_stock, d.low_stock, d.stock, d.unit, d.rack_location, d.image]
  );
  return { id: r[0].id, message: 'Produk berhasil ditambahkan' };
});
