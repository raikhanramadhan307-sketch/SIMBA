import { route } from '@/lib/api';
import { query } from '@/lib/db';
import { STOCK_STATUS_SQL, parseJson } from '@/lib/utils';
import { TRX_SELECT } from '@/lib/transactions';

export const GET = route(null, async ({ user }) => {
  if (user.role === 'supplier') {
    const byStatus = await query('SELECT status, COUNT(*) AS n FROM restock_orders WHERE supplier_id = ? GROUP BY status', [user.id]);
    const recent = await query(
      `SELECT po_number, status, order_date, expected_date FROM restock_orders WHERE supplier_id = ? ORDER BY id DESC LIMIT 6`, [user.id]);
    return { role: 'supplier', restock: byStatus, recent };
  }

  const base = `SELECT p.*, ${STOCK_STATUS_SQL} AS stock_status FROM products p`;
  const stockCounts = await query(`SELECT stock_status, COUNT(*) AS n FROM (${base}) t GROUP BY stock_status`);
  const alerts = await query(
    `SELECT id, name, sku, stock, unit, min_stock, low_stock, stock_status, image FROM (${base}) t
     WHERE stock_status <> 'Normal' ORDER BY stock ASC LIMIT 8`);
  const [{ pending }] = await query(`SELECT COUNT(*) AS pending FROM transactions WHERE status = 'pending'`);
  const restock = await query('SELECT status, COUNT(*) AS n FROM restock_orders GROUP BY status');
  const [{ pending_suppliers: pendingSuppliers }] = await query(`SELECT COUNT(*) AS pending_suppliers FROM users WHERE role = 'supplier' AND status = 'pending'`);
  const recent = (await query(`${TRX_SELECT} ORDER BY t.id DESC LIMIT 6`)).map((r) => ({ ...r, items: parseJson(r.items) }));
  const [{ value, units }] = await query('SELECT COALESCE(SUM(stock * buy_price), 0) AS value, COALESCE(SUM(stock), 0) AS units FROM products');

  // Barang masuk/keluar yang sudah disetujui: 6 bulan terakhir dan 14 hari terakhir
  const monthly = await query(`
    SELECT to_char(m, 'YYYY-MM') AS ym,
      COALESCE(SUM(ti.quantity) FILTER (WHERE t.type = 'incoming'), 0) AS incoming,
      COALESCE(SUM(ti.quantity) FILTER (WHERE t.type = 'outgoing'), 0) AS outgoing
    FROM generate_series(date_trunc('month', CURRENT_DATE) - interval '5 months', date_trunc('month', CURRENT_DATE), interval '1 month') m
    LEFT JOIN transactions t ON date_trunc('month', t.trx_date) = m AND ((t.type = 'incoming' AND t.status = 'approved') OR (t.type = 'outgoing' AND t.status = 'shipped'))
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    GROUP BY m ORDER BY m`);
  const daily = await query(`
    SELECT d::date::text AS day,
      COALESCE(SUM(ti.quantity) FILTER (WHERE t.type = 'incoming'), 0) AS incoming,
      COALESCE(SUM(ti.quantity) FILTER (WHERE t.type = 'outgoing'), 0) AS outgoing
    FROM generate_series(CURRENT_DATE - 13, CURRENT_DATE, interval '1 day') d
    LEFT JOIN transactions t ON t.trx_date = d::date AND ((t.type = 'incoming' AND t.status = 'approved') OR (t.type = 'outgoing' AND t.status = 'shipped'))
    LEFT JOIN transaction_items ti ON ti.transaction_id = t.id
    GROUP BY d ORDER BY d`);
  const activeDays = (await query(
    `SELECT DISTINCT trx_date::text AS day FROM transactions
     WHERE date_trunc('month', trx_date) = date_trunc('month', CURRENT_DATE)`)).map((r) => r.day);

  return { role: user.role, stockCounts, alerts, pendingTransactions: pending, restock, pendingSuppliers, recent,
    inventoryValue: value, totalUnits: units, monthly, daily, activeDays };
});
