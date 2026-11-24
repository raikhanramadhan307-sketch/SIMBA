import { route, fail } from '@/lib/api';
import { query, tx } from '@/lib/db';
import { normalizeItems } from '@/lib/validators';
import { assertStock } from '@/lib/transactions';

async function loadPending(id, user, verb) {
  const [t] = await query('SELECT * FROM transactions WHERE id = ?', [id]);
  if (!t) fail(404, 'Transaksi tidak ditemukan');
  if (t.status !== 'pending') fail(400, `Hanya transaksi Pending yang dapat ${verb}`);
  if (user.role === 'staff' && t.created_by !== user.id) fail(403, `Staff hanya dapat ${verb} transaksi miliknya sendiri`);
  return t;
}

// Edit (hanya Pending). Barang keluar: produk, quantity, catatan. Barang masuk: hanya catatan,
// karena produk dan quantity mengikuti PO.
export const PUT = route(['staff', 'manager'], async ({ user, body, params }) => {
  const t = await loadPending(params.id, user, 'diedit');
  if (!String(body.notes || '').trim()) fail(400, 'Catatan wajib diisi');
  if (t.type === 'incoming') {
    await query('UPDATE transactions SET notes = ? WHERE id = ?', [body.notes.trim(), t.id]);
    return { message: 'Catatan transaksi berhasil diperbarui' };
  }
  const items = normalizeItems(body.items);
  await assertStock(items);
  await tx(async (c) => {
    await c.query('UPDATE transactions SET notes = ? WHERE id = ?', [body.notes.trim(), t.id]);
    await c.query('DELETE FROM transaction_items WHERE transaction_id = ?', [t.id]);
    for (const it of items)
      await c.query('INSERT INTO transaction_items (transaction_id, product_id, quantity) VALUES (?,?,?)', [t.id, it.product_id, it.quantity]);
  });
  return { message: 'Transaksi berhasil diperbarui' };
});

export const DELETE = route(['staff', 'manager'], async ({ user, params }) => {
  const t = await loadPending(params.id, user, 'dihapus');
  await query('DELETE FROM transactions WHERE id = ?', [t.id]);
  return { message: 'Transaksi berhasil dihapus' };
});
