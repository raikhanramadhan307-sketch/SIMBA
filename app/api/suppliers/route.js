import { route } from '@/lib/api';
import { query } from '@/lib/db';

// Admin: filter status (default pending). Manager/Staff: hanya supplier Approved (untuk dropdown).
export const GET = route(['admin', 'manager', 'staff'], async ({ user, url }) => {
  const status = user.role === 'admin' ? url.searchParams.get('status') || 'pending' : 'approved';
  return query(
    `SELECT id, name, email, company, phone, status, created_at FROM users
     WHERE role = 'supplier' AND status = ? ORDER BY created_at DESC`, [status]
  );
});
