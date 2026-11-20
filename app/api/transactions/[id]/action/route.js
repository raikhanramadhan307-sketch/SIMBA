import { route, fail } from '@/lib/api';
import { tx } from '@/lib/db';

// approve / reject (Manager) dan ship (Staff)
export const POST = route(['manager', 'staff'], async ({ user, body, params }) => {
  const { action } = body;
  const reason = String(body.reason || '').trim();
  const allowed = { approve: 'manager', reject: 'manager', ship: 'staff' };
  if (allowed[action] !== user.role) fail(403, 'Anda tidak berhak melakukan aksi ini');
  if (action === 'reject' && !reason) fail(400, 'Alasan wajib diisi saat menolak transaksi');

  await tx(async (c) => {
    const [[t]] = await c.query('SELECT * FROM transactions WHERE id = ? FOR UPDATE', [params.id]);
    if (!t) fail(404, 'Transaksi tidak ditemukan');

    if (action === 'ship') {
      if (t.type !== 'outgoing' || t.status !== 'approved') fail(400, 'Hanya barang keluar berstatus Approved yang dapat ditandai Shipped');
      await c.query(`UPDATE transactions SET status = 'shipped' WHERE id = ?`, [t.id]); // stok tidak berubah lagi
      return;
    }
    if (t.status !== 'pending') fail(400, 'Hanya transaksi Pending yang dapat diproses');

    if (action === 'reject') {
      await c.query(`UPDATE transactions SET status = 'rejected', reject_reason = ?, approved_by = ? WHERE id = ?`, [reason, user.id, t.id]);
      return; // stok tidak berubah
    }

    // approve: ubah stok + status dalam satu transaksi database
    const [items] = await c.query('SELECT product_id, quantity FROM transaction_items WHERE transaction_id = ?', [t.id]);
    for (const it of items) {
      const [[p]] = await c.query('SELECT name, stock FROM products WHERE id = ? FOR UPDATE', [it.product_id]);
      if (t.type === 'incoming') {
        await c.query('UPDATE products SET stock = stock + ? WHERE id = ?', [it.quantity, it.product_id]);
      } else {
        if (p.stock < it.quantity) fail(400, `Stok ${p.name} tidak cukup (tersedia ${p.stock}, diminta ${it.quantity})`);
        await c.query('UPDATE products SET stock = stock - ? WHERE id = ?', [it.quantity, it.product_id]);
      }
    }
    await c.query(`UPDATE transactions SET status = 'approved', approved_by = ? WHERE id = ?`, [user.id, t.id]);
  });
  return { message: 'Transaksi berhasil diproses' };
});
