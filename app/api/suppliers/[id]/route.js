import { route, fail } from '@/lib/api';
import { query } from '@/lib/db';

export const PUT = route(['admin'], async ({ body, params }) => {
  if (!['approved', 'rejected'].includes(body.status)) fail(400, 'Status harus approved atau rejected');
  const reason = String(body.reason || '').trim();
  if (body.status === 'rejected' && !reason) fail(400, 'Alasan penolakan supplier wajib diisi');
  const r = await query(`UPDATE users SET status = ?, status_note = ? WHERE id = ? AND role = 'supplier' RETURNING id`,
    [body.status, body.status === 'rejected' ? reason : null, params.id]);
  if (!r.length) fail(404, 'Supplier tidak ditemukan');
  return { message: `Supplier ${body.status === 'approved' ? 'disetujui' : 'ditolak'}` };
});
