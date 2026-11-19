import { route, fail } from '@/lib/api';
import { query } from '@/lib/db';

// Alur: Pending -> (Supplier) Confirmed/Rejected -> (Manager) In Transit -> Received
export const PUT = route(['manager', 'supplier'], async ({ user, body, params }) => {
  const [r] = await query('SELECT * FROM restock_orders WHERE id = ?', [params.id]);
  if (!r) fail(404, 'Restock order tidak ditemukan');
  const { action } = body;
  const note = String(body.note || '').trim();
  let status;

  if (user.role === 'supplier') {
    if (r.supplier_id !== user.id) fail(403, 'Order ini bukan milik Anda');
    if (r.status !== 'pending') fail(400, 'Hanya order berstatus Pending yang dapat dikonfirmasi atau ditolak');
    if (action === 'confirm') status = 'confirmed';
    else if (action === 'reject') {
      if (!note) fail(400, 'Catatan alasan wajib diisi saat menolak order');
      status = 'rejected';
    } else fail(400, 'Aksi tidak valid');
  } else {
    if (action === 'transit' && r.status === 'confirmed') status = 'in_transit';
    else if (action === 'receive' && r.status === 'in_transit') status = 'received';
    else fail(400, 'Perubahan status tidak valid untuk status order saat ini');
  }
  // Status Received tidak mengubah stok; stok bertambah saat Incoming Transaction di-approve
  await query('UPDATE restock_orders SET status = ?, status_note = ? WHERE id = ?', [status, note || r.status_note, params.id]);
  return { message: 'Status order diperbarui' };
});
