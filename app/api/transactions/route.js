import { route, fail } from '@/lib/api';
import { query, tx } from '@/lib/db';
import { normalizeItems } from '@/lib/validators';
import { parseJson } from '@/lib/utils';
import { TRX_SELECT, TRX_FROM, assertStock } from '@/lib/transactions';

export const GET = route(['admin', 'manager', 'staff', 'supplier'], async ({ user, url }) => {
  const sp = url.searchParams;
  const page = Math.max(1, +sp.get('page') || 1);
  const limit = Math.min(100, Math.max(1, +sp.get('limit') || 10));
  const where = [], params = [];

  // Supplier hanya melihat riwayat barang masuk dari dirinya sendiri
  if (user.role === 'supplier') { where.push(`t.supplier_id = ? AND t.type = 'incoming'`); params.push(user.id); }
  if (sp.get('type')) { where.push('t.type = ?'); params.push(sp.get('type')); }
  if (sp.get('status')) { where.push('t.status = ?'); params.push(sp.get('status')); }
  if (sp.get('from')) { where.push('t.trx_date >= ?'); params.push(sp.get('from')); }
  if (sp.get('to')) { where.push('t.trx_date <= ?'); params.push(sp.get('to')); }
  if (sp.get('q')) {
    where.push('(t.customer_name ILIKE ? OR COALESCE(s.company, s.name) ILIKE ? OR t.trx_number ILIKE ?)');
    params.push(`%${sp.get('q')}%`, `%${sp.get('q')}%`, `%${sp.get('q')}%`);
  }
  const w = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const [{ total }] = await query(`SELECT COUNT(*) AS total ${TRX_FROM} ${w}`, params);
  const rows = await query(`${TRX_SELECT} ${w} ORDER BY t.id DESC LIMIT ? OFFSET ?`, [...params, limit, (page - 1) * limit]);
  return { rows: rows.map((r) => ({ ...r, items: parseJson(r.items) })), total, page, limit };
});

export const POST = route(['staff'], async ({ user, body }) => {
  const type = body.type;
  if (!['incoming', 'outgoing'].includes(type)) fail(400, 'Tipe transaksi tidak valid');
  if (!body.trx_date) fail(400, type === 'incoming' ? 'Tanggal penerimaan wajib diisi' : 'Tanggal pengiriman wajib diisi');
  if (!String(body.notes || '').trim()) fail(400, 'Catatan wajib diisi');
  const items = normalizeItems(body.items);

  let supplier_id = null, po_id = null, customer = null;
  if (type === 'incoming') {
    if (body.po_id) {
      const [po] = await query('SELECT * FROM restock_orders WHERE id = ?', [body.po_id]);
      if (!po) fail(404, 'Restock order tidak ditemukan');
      if (po.status !== 'received') fail(400, 'Nomor PO harus berasal dari Restock Order berstatus Received');
      const used = await query(`SELECT id FROM transactions WHERE po_id = ? AND status <> 'rejected'`, [po.id]);
      if (used.length) fail(409, 'Restock Order ini sudah dipakai oleh Incoming Transaction lain');
      po_id = po.id;
      supplier_id = po.supplier_id; // supplier selalu mengikuti PO
    } else {
      const [s] = await query(`SELECT id FROM users WHERE id = ? AND role = 'supplier' AND status = 'approved'`, [Number(body.supplier_id) || 0]);
      if (!s) fail(400, 'Supplier wajib dipilih');
      supplier_id = s.id;
    }
  } else {
    customer = String(body.customer_name || '').trim();
    if (!customer) fail(400, 'Nama customer/tujuan wajib diisi');
    await assertStock(items);
  }

  const id = await tx(async (c) => {
    const prefix = `${type === 'incoming' ? 'IN' : 'OUT'}-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`;
    const [[{ n }]] = await c.query('SELECT COUNT(*) AS n FROM transactions WHERE trx_number ILIKE ?', [`${prefix}-%`]);
    const [[r]] = await c.query(
      `INSERT INTO transactions (trx_number, type, trx_date, po_id, supplier_id, customer_name, notes, status, created_by)
       VALUES (?,?,?,?,?,?,?, 'pending', ?) RETURNING id`,
      [`${prefix}-${String(n + 1).padStart(4, '0')}`, type, body.trx_date, po_id, supplier_id, customer, body.notes.trim(), user.id]
    );
    for (const it of items)
      await c.query('INSERT INTO transaction_items (transaction_id, product_id, quantity) VALUES (?,?,?)', [r.id, it.product_id, it.quantity]);
    return r.id;
  });
  return { id, message: 'Transaksi berhasil dibuat dan menunggu persetujuan Manager' };
});
