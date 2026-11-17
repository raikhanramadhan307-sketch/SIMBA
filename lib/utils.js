// Status stok dihitung otomatis, tidak pernah diisi manual
export function stockStatus(p) {
  const stock = Number(p.stock), min = Number(p.min_stock), low = Number(p.low_stock);
  if (stock === 0) return 'Out of Stock';
  if (stock <= min) return 'Severe';
  if (stock <= low) return 'Low';
  return 'Normal';
}

export const STOCK_STATUS_SQL = `CASE
  WHEN p.stock = 0 THEN 'Out of Stock'
  WHEN p.stock <= p.min_stock THEN 'Severe'
  WHEN p.stock <= p.low_stock THEN 'Low'
  ELSE 'Normal' END`;

export const parseJson = (v) => (typeof v === 'string' ? JSON.parse(v) : v || []);
export const todayStr = () => new Date().toISOString().slice(0, 10);
