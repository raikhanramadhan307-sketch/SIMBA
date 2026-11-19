'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, qs, rupiah } from '@/lib/client';
import { stockStatus } from '@/lib/utils';
import { useUser } from '@/components/UserContext';
import Icon from '@/components/Icon';
import { Badge, Modal, Pagination, RowMenu, Field, ImageField, Empty, useToast } from '@/components/ui';

const EMPTY = {
  name: '', sku: '', category_id: '', description: '', buy_price: '', sell_price: '',
  min_stock: '', low_stock: '', stock: '', unit: '', rack_location: '', image: '',
};
const SIZES = [10, 20, 50];

export default function ProductsPage() {
  const toast = useToast();
  const user = useUser();
  const canEdit = ['admin', 'manager'].includes(user.role);
  const [data, setData] = useState(null);
  const [cats, setCats] = useState([]);
  const [f, setF] = useState({ search: '', category: '', status: '' });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [showFilter, setShowFilter] = useState(false);
  const [form, setForm] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api(`/api/products?${qs({ ...f, page, limit })}`).then(setData).catch((e) => toast(e.message, 'error'));
  }, [f, page, limit, toast]);

  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);
  useEffect(() => { api('/api/categories').then(setCats).catch(() => {}); }, []);

  const setFilter = (k, v) => { setF({ ...f, [k]: v }); setPage(1); };
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api(form.id ? `/api/products/${form.id}` : '/api/products', { method: form.id ? 'PUT' : 'POST', body: form });
      toast(res.message);
      setForm(null);
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  async function remove() {
    try {
      toast((await api(`/api/products/${del.id}?force=1`, { method: 'DELETE' })).message);
      setDel(null);
      load();
    } catch (err) { toast(err.message, 'error'); setDel(null); }
  }

  async function exportCsv() {
    try {
      const all = await api(`/api/products?${qs({ ...f, page: 1, limit: 500 })}`);
      // Awali sel yang berisi rumus dengan tanda petik agar aman dibuka di Excel
      const esc = (v) => { let t = String(v ?? ''); if (/^[=+\-@]/.test(t)) t = `'${t}`; return `"${t.replace(/"/g, '""')}"`; };
      const head = ['SKU', 'Nama', 'Kategori', 'Harga beli', 'Harga jual', 'Stok', 'Unit', 'Rak', 'Status'];
      const rows = all.rows.map((p) => [p.sku, p.name, p.category_name, p.buy_price, p.sell_price, p.stock, p.unit, p.rack_location, p.stock_status]);
      const csv = '\ufeff' + [head, ...rows].map((r) => r.map(esc).join(',')).join('\n');
      const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      const a = document.createElement('a');
      a.href = url; a.download = 'produk-simba.csv'; a.click();
      URL.revokeObjectURL(url);
      toast('Data produk berhasil diekspor');
    } catch (err) { toast(err.message, 'error'); }
  }

  const activeFilters = [f.category, f.status].filter(Boolean).length;
  const preview = form && form.stock !== '' && form.min_stock !== '' && form.low_stock !== '' ? stockStatus(form) : null;

  return (
    <>
      <div className="relative mb-6 max-w-md">
        <Icon name="search" className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input className="input rounded-full pl-11 shadow-sm" placeholder="Cari nama atau SKU" aria-label="Cari produk"
          value={f.search} onChange={(e) => setFilter('search', e.target.value)} />
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Produk</h1>
          <p className="text-xs text-slate-400">Stok terkini seluruh produk di gudang</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-slate-500">
            Menampilkan
            <select className="rounded-lg bg-brand-50 px-2.5 py-1.5 text-sm font-medium text-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-200"
              value={limit} onChange={(e) => { setLimit(+e.target.value); setPage(1); }}>
              {SIZES.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </label>
          <button className="btn-ghost" onClick={() => setShowFilter(!showFilter)} aria-expanded={showFilter}>
            <Icon name="filter" className="h-4 w-4" />Filter
            {activeFilters > 0 && <span className="rounded-full bg-brand-600 px-1.5 text-[10px] font-semibold text-white">{activeFilters}</span>}
          </button>
          <button className="btn-ghost" onClick={exportCsv}><Icon name="upload" className="h-4 w-4" />Ekspor</button>
          {canEdit && <button className="btn-primary" onClick={() => setForm(EMPTY)}><Icon name="plus" className="h-4 w-4" />Tambah Produk</button>}
        </div>
      </div>

      {showFilter && (
        <div className="mb-4 grid gap-3 rounded-3xl bg-white p-4 shadow-sm sm:grid-cols-2">
          <select className="input" aria-label="Filter kategori" value={f.category} onChange={(e) => setFilter('category', e.target.value)}>
            <option value="">Semua kategori</option>
            {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <select className="input" aria-label="Filter status stok" value={f.status} onChange={(e) => setFilter('status', e.target.value)}>
            <option value="">Semua status stok</option>
            {['Normal', 'Low', 'Severe', 'Out of Stock'].map((s) => <option key={s}>{s}</option>)}
          </select>
        </div>
      )}

      <div className="card">
        {!data ? <Empty>Memuat...</Empty> : data.rows.length === 0 ? <Empty>Produk tidak ditemukan. Ubah pencarian atau filter.</Empty> : (
          <>
            <div className="overflow-x-auto">
              <table className="rtable w-full">
                <thead><tr className="border-b border-slate-100">
                  <th className="th">Nama Produk</th><th className="th">SKU</th><th className="th">Harga Jual</th>
                  <th className="th">Stok</th><th className="th">Kategori</th><th className="th">Status</th>
                  {canEdit && <th className="th text-right">Aksi</th>}
                </tr></thead>
                <tbody>
                  {data.rows.map((p) => (
                    <tr key={p.id} className="border-b border-slate-100 last:border-0">
                      <td className="td" data-label="Produk">
                        <div className="flex items-center gap-3">
                          <img src={p.image || '/placeholder.svg'} alt="" className="h-9 w-9 rounded-full object-cover" />
                          <span className="font-semibold text-slate-900">{p.name}</span>
                        </div>
                      </td>
                      <td className="td text-slate-500" data-label="SKU">#{p.sku}</td>
                      <td className="td" data-label="Harga">{rupiah(p.sell_price)}</td>
                      <td className="td" data-label="Stok">{p.stock} {p.unit}</td>
                      <td className="td" data-label="Kategori">{p.category_name}</td>
                      <td className="td" data-label="Status"><Badge value={p.stock_status} /></td>
                      {canEdit && (
                        <td className="td text-right" data-label="">
                          <RowMenu items={[{ label: 'Edit', onClick: () => setForm(p) }, { label: 'Hapus', danger: true, onClick: () => setDel(p) }]} />
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={data.page} total={data.total} limit={limit} onChange={setPage} />
          </>
        )}
      </div>

      {form && (
        <Modal wide title={form.id ? `Edit produk ${form.sku}` : 'Tambah produk'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Nama produk"><input required className="input" value={form.name} onChange={set('name')} /></Field>
            <Field label="SKU (unik, tidak dapat diubah)"><input required className="input" disabled={!!form.id} value={form.sku} onChange={set('sku')} /></Field>
            <Field label="Kategori">
              <select required className="input" value={form.category_id} onChange={set('category_id')}>
                <option value="">Pilih kategori</option>
                {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </Field>
            <Field label="Unit (pcs, box, kg, liter, ...)"><input required className="input" value={form.unit} onChange={set('unit')} /></Field>
            <Field label="Harga beli (Rp)"><input required type="number" min="0" className="input" value={form.buy_price} onChange={set('buy_price')} /></Field>
            <Field label="Harga jual (Rp)"><input required type="number" min="0" className="input" value={form.sell_price} onChange={set('sell_price')} /></Field>
            <Field label="Stok minimum (batas Severe)"><input required type="number" min="0" className="input" value={form.min_stock} onChange={set('min_stock')} /></Field>
            <Field label="Stok Low (harus lebih besar dari minimum)"><input required type="number" min="0" className="input" value={form.low_stock} onChange={set('low_stock')} /></Field>
            <Field label="Jumlah stok saat ini"><input required type="number" min="0" className="input" value={form.stock} onChange={set('stock')} /></Field>
            <Field label="Lokasi rak"><input required className="input" value={form.rack_location} onChange={set('rack_location')} /></Field>
            <Field label="Deskripsi" className="sm:col-span-2"><textarea required rows={2} className="input" value={form.description} onChange={set('description')} /></Field>
            <Field label="Gambar produk" className="sm:col-span-2"><ImageField value={form.image} onChange={(url) => setForm({ ...form, image: url })} /></Field>
            <div className="flex items-center gap-2 text-sm sm:col-span-2">
              <span className="text-slate-600">Status stok (dihitung otomatis):</span>
              {preview ? <Badge value={preview} /> : <span className="text-slate-400">isi stok dan batas untuk melihat status</span>}
            </div>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
              <button className="btn-primary" disabled={busy}>Simpan produk</button>
            </div>
          </form>
        </Modal>
      )}

      {del && (
        <Modal title="Hapus produk" onClose={() => setDel(null)}
          footer={<><button className="btn-ghost" onClick={() => setDel(null)}>Batal</button><button className="btn-danger" onClick={remove}>Hapus produk</button></>}>
          <p className="text-sm">Hapus produk <b>{del.name}</b> ({del.sku})?</p>
          {del.stock > 0 && (
            <p className="mt-3 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900">
              Peringatan: produk ini masih memiliki stok {del.stock} {del.unit}. Stok akan ikut hilang jika dihapus.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
