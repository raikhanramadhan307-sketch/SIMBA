import { route, fail } from '@/lib/api';
import { tx } from '@/lib/db';

const PHOTO = /^\/api\/files\/[\w.-]+\.(jpg|png|webp)$/;

// Siklus PO: Pending -> Confirmed/Rejected -> In Transit -> Inspecting -> Received/Returned
//  Supplier : confirm, reject (alasan wajib), ship (-> In Transit), arrive (bukti foto -> Inspecting)
//  Manager  : return (alasan wajib -> Returned), refund (ajukan klaim refund untuk PO Returned)
//  Received  terjadi otomatis saat Incoming Transaction milik PO ini di-approve (lihat transactions/[id]/action)
export const PUT = route(['manager', 'supplier'], async ({ user, body, params }) => {
  const { action } = body;
  const note = String(body.note || '').trim();

  return tx(async (c) => {
    const [[r]] = await c.query('SELECT * FROM restock_orders WHERE id = ? FOR UPDATE', [params.id]);
    if (!r) fail(404, 'Restock order tidak ditemukan');

    if (user.role === 'supplier') {
      if (r.supplier_id !== user.id) fail(403, 'Order ini bukan milik Anda');

      if (action === 'confirm' || action === 'reject') {
        if (r.status !== 'pending') fail(400, 'Hanya order berstatus Pending yang dapat dikonfirmasi atau ditolak');
        if (action === 'reject' && !note) fail(400, 'Catatan alasan wajib diisi saat menolak order');
        await c.query('UPDATE restock_orders SET status = ?, status_note = ? WHERE id = ?',
          [action === 'confirm' ? 'confirmed' : 'rejected', action === 'reject' ? note : null, r.id]);
        return { message: action === 'confirm' ? 'Order dikonfirmasi' : 'Order ditolak' };
      }
      if (action === 'ship') {
        if (r.status !== 'confirmed') fail(400, 'Hanya order berstatus Confirmed yang dapat dikirim');
        await c.query(`UPDATE restock_orders SET status = 'in_transit' WHERE id = ?`, [r.id]);
        return { message: 'Status order menjadi In Transit' };
      }
      if (action === 'arrive') {
        if (r.status !== 'in_transit') fail(400, 'Kedatangan hanya dapat dikonfirmasi untuk order berstatus In Transit');
        if (!PHOTO.test(String(body.photo || ''))) fail(400, 'Bukti foto dokumentasi kedatangan wajib diunggah');
        await c.query(`UPDATE restock_orders SET status = 'inspecting', arrival_photo = ?, arrival_note = ?, arrived_at = NOW() WHERE id = ?`,
          [body.photo, note || null, r.id]);
        return { message: 'Bukti kedatangan terkirim. Barang menunggu pemeriksaan gudang (Inspecting)' };
      }
      fail(400, 'Aksi tidak valid');
    }

    // Manager
    if (action === 'return') {
      if (r.status !== 'inspecting') fail(400, 'Hanya PO berstatus Inspecting yang dapat dikembalikan');
      if (!note) fail(400, 'Alasan pengembalian (Returned) wajib diisi');
      await c.query(`UPDATE restock_orders SET status = 'returned', status_note = ? WHERE id = ?`, [note, r.id]);
      // Incoming Transaction yang masih Pending untuk PO ini ikut ditolak; stok tidak berubah
      await c.query(
        `UPDATE transactions SET status = 'rejected', reject_reason = ?, approved_by = ?
         WHERE po_id = ? AND type = 'incoming' AND status = 'pending'`,
        [`PO dikembalikan: ${note}`, user.id, r.id]);
      return { message: 'PO dikembalikan (Returned). Stok tidak bertambah' };
    }
    if (action === 'refund') {
      if (r.status !== 'returned') fail(400, 'Klaim refund hanya dapat diajukan untuk PO berstatus Returned');
      if (r.refund_requested_at) fail(409, 'Klaim refund untuk PO ini sudah diajukan');
      await c.query('UPDATE restock_orders SET refund_requested_at = NOW(), refund_note = ? WHERE id = ?', [note || null, r.id]);
      return { message: 'Klaim refund diajukan kepada supplier' };
    }
    fail(400, 'Aksi tidak valid');
  });
});
