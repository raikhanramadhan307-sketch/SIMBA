import { route, fail } from '@/lib/api';
import { tx } from '@/lib/db';

// Staff Gudang membuat/memperbarui laporan pemeriksaan fisik untuk PO berstatus Inspecting.
// Jumlah pesanan diambil dari PO (bukan dari input) agar tidak bisa dimanipulasi.
export const POST = route(['staff'], async ({ user, body, params }) => {
  const notes = String(body.notes || '').trim();
  const given = Array.isArray(body.items) ? body.items : [];

  return tx(async (c) => {
    const [[po]] = await c.query('SELECT * FROM restock_orders WHERE id = ? FOR UPDATE', [params.id]);
    if (!po) fail(404, 'Restock order tidak ditemukan');
    if (po.status !== 'inspecting') fail(400, 'Laporan pemeriksaan hanya dapat dibuat untuk PO berstatus Inspecting');
    const [used] = await c.query(`SELECT id FROM transactions WHERE po_id = ? AND status <> 'rejected'`, [po.id]);
    if (used.length) fail(409, 'PO ini sudah memiliki Incoming Transaction aktif, laporan tidak dapat diubah');

    const [ordered] = await c.query('SELECT product_id, quantity FROM restock_items WHERE restock_id = ? ORDER BY id', [po.id]);
    let match = true;
    const rows = ordered.map((o) => {
      const g = given.find((x) => Number(x.product_id) === o.product_id);
      if (!g) fail(400, 'Semua produk pada PO wajib diisi pada laporan pemeriksaan');
      const received = Number(g.received_qty);
      const damaged = Number(g.damaged_qty ?? 0);
      if (!Number.isInteger(received) || received < 0 || !Number.isInteger(damaged) || damaged < 0)
        fail(400, 'Jumlah diterima dan jumlah rusak harus bilangan bulat 0 atau lebih');
      if (damaged > received) fail(400, 'Jumlah rusak tidak boleh melebihi jumlah yang diterima');
      if (received !== o.quantity || damaged > 0) match = false;
      return [o.product_id, o.quantity, received, damaged];
    });
    if (!match && !notes) fail(400, 'Catatan ketidaksesuaian wajib diisi bila jumlah atau kondisi barang tidak sesuai');

    const [existing] = await c.query('SELECT id FROM inspection_reports WHERE restock_id = ?', [po.id]);
    let reportId;
    if (existing.length) {
      reportId = existing[0].id;
      await c.query('UPDATE inspection_reports SET inspected_by = ?, notes = ?, is_match = ?, created_at = NOW() WHERE id = ?',
        [user.id, notes || null, match, reportId]);
      await c.query('DELETE FROM inspection_items WHERE report_id = ?', [reportId]);
    } else {
      const [[ins]] = await c.query(
        'INSERT INTO inspection_reports (restock_id, inspected_by, notes, is_match) VALUES (?,?,?,?) RETURNING id',
        [po.id, user.id, notes || null, match]);
      reportId = ins.id;
    }
    for (const [pid, ord, rec, dam] of rows)
      await c.query('INSERT INTO inspection_items (report_id, product_id, ordered_qty, received_qty, damaged_qty) VALUES (?,?,?,?,?)', [reportId, pid, ord, rec, dam]);

    return {
      is_match: match,
      message: match
        ? 'Laporan disimpan: barang sesuai. Lanjutkan dengan membuat Incoming Transaction'
        : 'Laporan disimpan: barang tidak sesuai. Manager akan menolak penerimaan atau mengembalikan PO',
    };
  });
});
