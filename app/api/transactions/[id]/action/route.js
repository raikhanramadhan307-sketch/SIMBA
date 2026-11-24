import { route, fail } from '@/lib/api';
import { tx } from '@/lib/db';

// Aturan perubahan stok (mutlak):
//  + Barang masuk : bertambah saat Incoming Transaction di-APPROVE Manager. PO terkait otomatis menjadi Received.
//  - Barang keluar: berkurang saat Outgoing Transaction ditandai SHIPPED oleh Staff (Approved belum mengubah stok).
export const POST = route(['manager', 'staff'], async ({ user, body, params }) => {
  const { action } = body;
  const reason = String(body.reason || '').trim();
  const allowed = { approve: 'manager', reject: 'manager', ship: 'staff' };
  if (allowed[action] !== user.role) fail(403, 'Anda tidak berhak melakukan aksi ini');
  if (action === 'reject' && !reason) fail(400, 'Alasan wajib diisi saat menolak transaksi');

  return tx(async (c) => {
    const [[t]] = await c.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [params.id]);
    if (!t) fail(404, 'Transaksi tidak ditemukan');
    const [items] = await c.query('SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ? ORDER BY product_id', [t.id]);

    // ---- Shipped (Staff): stok berkurang, alur selesai ----
    if (action === 'ship') {
      if (t.type !== 'outgoing' || t.status !== 'approved') fail(400, 'Hanya barang keluar berstatus Approved yang dapat dikirim (Shipped)');
      for (const it of items) {
        const [[p]] = await c.query('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [it.product_id]);
        if (p.stock < it.quantity) fail(400, `Stok ${p.name} tidak cukup untuk dikirim (tersedia ${p.stock}, diminta ${it.quantity})`);
        await c.query('UPDATE products SET stock = stock - ? WHERE id = ?', [it.quantity, it.product_id]);
      }
      await c.query(`UPDATE transactions SET status = 'shipped' WHERE id = ?`, [t.id]);
      return { message: 'Barang dikirim (Shipped). Stok berkurang dan transaksi selesai' };
    }

    if (t.status !== 'pending') fail(400, 'Hanya transaksi Pending yang dapat diproses');

    // ---- Reject (Manager): alasan wajib, stok tidak berubah ----
    if (action === 'reject') {
      await c.query(`UPDATE transactions SET status = 'rejected', reject_reason = ?, approved_by = ? WHERE id = ?`, [reason, user.id, t.id]);
      return { message: 'Transaksi ditolak. Stok tidak berubah' };
    }

    // ---- Approve barang keluar: hanya lampu hijau untuk packing, stok belum berubah ----
    if (t.type === 'outgoing') {
      await c.query(`UPDATE transactions SET status = 'approved', approved_by = ? WHERE id = ?`, [user.id, t.id]);
      return { message: 'Transaksi disetujui. Staff dapat melakukan packing; stok berkurang saat barang dikirim (Shipped)' };
    }

    // ---- Approve barang masuk: stok bertambah + PO menjadi Received dalam satu transaksi database ----
    if (!t.po_id) fail(400, 'Transaksi barang masuk harus berasal dari sebuah PO');
    const [[po]] = await c.query('SELECT * FROM restock_orders WHERE id = ? FOR UPDATE', [t.po_id]);
    if (!po || po.status !== 'inspecting') fail(400, 'PO terkait tidak lagi berstatus Inspecting');
    const [[report]] = await c.query('SELECT is_match FROM inspection_reports WHERE restock_id = ?', [po.id]);
    if (!report) fail(400, 'Laporan pemeriksaan untuk PO ini belum ada');
    if (!report.is_match) fail(400, 'Laporan pemeriksaan menyatakan barang tidak sesuai. Tolak transaksi ini atau kembalikan PO (Returned)');

    for (const it of items) {
      await c.query('SELECT id FROM products WHERE id = ? FOR UPDATE', [it.product_id]);
      await c.query('UPDATE products SET stock = stock + ? WHERE id = ?', [it.quantity, it.product_id]);
    }
    await c.query(`UPDATE transactions SET status = 'approved', approved_by = ? WHERE id = ?`, [user.id, t.id]);
    await c.query(`UPDATE restock_orders SET status = 'received' WHERE id = ?`, [po.id]);
    return { message: 'Transaksi disetujui. Stok bertambah dan PO menjadi Received' };
  });
});
