import { fail } from './api';
import { query } from './db';

export const TRX_SELECT = `SELECT t.*, COALESCE(s.company, s.name) AS supplier_name, cu.name AS created_by_name, ro.po_number,
  (SELECT json_agg(json_build_object('product_id', ti.product_id, 'name', p.name, 'sku', p.sku, 'unit', p.unit, 'quantity', ti.quantity))
   FROM transaction_items ti JOIN products p ON p.id = ti.product_id WHERE ti.transaction_id = t.id) AS items
  FROM transactions t
  LEFT JOIN users s ON s.id = t.supplier_id
  LEFT JOIN users cu ON cu.id = t.created_by
  LEFT JOIN restock_orders ro ON ro.id = t.po_id`;

export const TRX_FROM = `FROM transactions t LEFT JOIN users s ON s.id = t.supplier_id`;

// Pastikan quantity barang keluar tidak melebihi stok tersedia
export async function assertStock(items) {
  const rows = await query('SELECT id, name, stock FROM products WHERE id = ANY(?)', [items.map((i) => i.product_id)]);
  const map = new Map(rows.map((r) => [r.id, r]));
  for (const it of items) {
    const p = map.get(it.product_id);
    if (!p) fail(400, 'Produk tidak ditemukan');
    if (it.quantity > p.stock) fail(400, `Quantity ${p.name} (${it.quantity}) melebihi stok tersedia (${p.stock})`);
  }
}
