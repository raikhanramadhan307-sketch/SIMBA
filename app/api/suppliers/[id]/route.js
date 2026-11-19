import { route, fail } from '@/lib/api';
import { query } from '@/lib/db';

export const PUT = route(['admin'], async ({ body, params }) => {
  if (!['approved', 'rejected'].includes(body.status)) fail(400, 'Status harus approved atau rejected');
  const r = await query(`UPDATE users SET status = ? WHERE id = ? AND role = 'supplier' RETURNING id`, [body.status, params.id]);
  if (!r.length) fail(404, 'Supplier tidak ditemukan');
  return { message: `Supplier ${body.status === 'approved' ? 'disetujui' : 'ditolak'}` };
});
