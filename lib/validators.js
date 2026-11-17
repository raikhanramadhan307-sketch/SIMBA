import { fail } from './api';

const LABEL = {
  name: 'Nama produk', sku: 'SKU', category_id: 'Kategori', description: 'Deskripsi',
  unit: 'Unit', rack_location: 'Lokasi rak', image: 'Gambar produk',
};

export function validateProduct(b, isEdit = false) {
  const errors = [];
  const required = ['name', 'category_id', 'description', 'unit', 'rack_location', 'image'];
  if (!isEdit) required.push('sku');
  for (const k of required) if (!String(b[k] ?? '').trim()) errors.push(`${LABEL[k]} wajib diisi`);

  const money = (k, label) => {
    const v = Number(b[k]);
    if (b[k] === '' || b[k] == null || Number.isNaN(v) || v < 0) errors.push(`${label} harus berupa angka valid (≥ 0)`);
  };
  money('buy_price', 'Harga beli');
  money('sell_price', 'Harga jual');

  const int = (k, label) => {
    const v = Number(b[k]);
    if (b[k] === '' || b[k] == null || !Number.isInteger(v) || v < 0) {
      errors.push(`${label} harus berupa bilangan bulat valid (≥ 0)`);
      return null;
    }
    return v;
  };
  const min = int('min_stock', 'Stok minimum');
  const low = int('low_stock', 'Stok Low');
  int('stock', 'Jumlah stok');
  if (min !== null && low !== null && low <= min) errors.push('Stok Low harus lebih besar dari stok minimum');

  if (errors.length) fail(400, errors.join('. '));
  return {
    name: b.name.trim(), sku: isEdit ? undefined : b.sku.trim().toUpperCase(),
    category_id: +b.category_id, description: b.description.trim(),
    buy_price: +b.buy_price, sell_price: +b.sell_price,
    min_stock: +b.min_stock, low_stock: +b.low_stock, stock: +b.stock,
    unit: b.unit.trim(), rack_location: b.rack_location.trim(), image: b.image,
  };
}

// Validasi daftar produk + quantity (dipakai transaksi dan restock)
export function normalizeItems(items) {
  if (!Array.isArray(items) || items.length === 0) fail(400, 'Daftar produk wajib diisi minimal 1 item');
  const seen = new Set();
  return items.map((it) => {
    const product_id = Number(it.product_id);
    const quantity = Number(it.quantity);
    if (!product_id) fail(400, 'Produk wajib dipilih pada semua baris');
    if (!Number.isInteger(quantity) || quantity <= 0) fail(400, 'Quantity harus bilangan bulat lebih dari 0');
    if (seen.has(product_id)) fail(400, 'Produk yang sama tidak boleh dipilih dua kali');
    seen.add(product_id);
    return { product_id, quantity };
  });
}
