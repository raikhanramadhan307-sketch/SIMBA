import { route, fail } from '@/lib/api';
import { query, tx } from '@/lib/db';
import { normalizeItems } from '@/lib/validators';
import { parseJson } from '@/lib/utils';
import { inspectionSql } from '@/lib/inspection';

const SELECT = `SELECT r.*, COALESCE(s.company, s.name) AS supplier_name,
  ${inspectionSql('r.id')} AS inspection,
  (SELECT json_agg(json_build_object('product_id', ri.product_id, 'name', p.name, 'sku', p.sku, 'unit', p.unit, 'quantity', ri.quantity))
   FROM restock_items ri JOIN products p ON p.id = ri.product_id WHERE ri.restock_id = r.id) AS items
  FROM restock_orders r LEFT JOIN users s ON s.id = r.supplier_id`;

export const GET = route(['admin', 'manager', 'staff', 'supplier'], async ({ user, url }) => {
  const sp = url.searchParams;
  const where = [], params = [];
  if (user.role === 'supplier') { where.push('r.supplier_id = ?'); params.push(user.id); }
  if (sp.get('status')) { where.push('r.status = ?'); params.push(sp.get('status')); }
  // PO yang siap dibuatkan Incoming Transaction: berstatus Inspecting, sudah ada laporan pemeriksaan,
  // dan belum dipakai Incoming Transaction lain (selain yang Rejected)
  if (sp.get('available') === '1')
    where.push(`r.status = 'inspecting'
      AND EXISTS (SELECT 1 FROM inspection_reports ir WHERE ir.restock_id = r.id)
      AND NOT EXISTS (SELECT 1 FROM transactions t WHERE t.po_id = r.id AND t.status <> 'rejected')`);
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const rows = await query(`${SELECT} ${w} ORDER BY r.id DESC LIMIT 200`, params);
  return rows.map((r) => ({ ...r, items: parseJson(r.items) }));
});

export const POST = route(['manager'], async ({ user, body }) => {
  const supplier_id = Number(body.supplier_id) || 0;
  if (!body.order_date || !body.expected_date) fail(400, 'Tanggal order dan expected delivery date wajib diisi');
  if (body.expected_date < body.order_date) fail(400, 'Expected delivery date tidak boleh sebelum tanggal order');
  if (!String(body.notes || '').trim()) fail(400, 'Catatan wajib diisi');
  const [sup] = await query(`SELECT id FROM users WHERE id = ? AND role = 'supplier' AND status = 'approved'`, [supplier_id]);
  if (!sup) fail(400, 'Supplier wajib dipilih dan harus berstatus Approved');
  const items = normalizeItems(body.items);

  const id = await tx(async (c) => {
    const prefix = `PO-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const [[{ n }]] = await c.query('SELECT COUNT(*) AS n FROM restock_orders WHERE po_number LIKE ?', [`${prefix}-%`]);
    const po = `${prefix}-${String(n + 1).padStart(4, '0')}`;
    const [[r]] = await c.query(
      `INSERT INTO restock_orders (po_number, supplier_id, order_date, expected_date, notes, status, created_by)
       VALUES (?,?,?,?,?, 'pending', ?) RETURNING id`,
      [po, supplier_id, body.order_date, body.expected_date, body.notes.trim(), user.id]
    );
    for (const it of items)
      await c.query('INSERT INTO restock_items (restock_id, product_id, quantity) VALUES (?,?,?)', [r.id, it.product_id, it.quantity]);
    return r.id;
  });
  return { id, message: 'Restock order berhasil dibuat' };
});
