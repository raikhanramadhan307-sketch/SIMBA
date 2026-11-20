'use client';
import { useCallback, useEffect, useState } from 'react';
import { api, qs } from '@/lib/client';
import { todayStr } from '@/lib/utils';
import { useUser } from '@/components/UserContext';
import { Badge, Modal, Pagination, PageHeader, Field, ItemsEditor, ItemsTable, Empty, useToast } from '@/components/ui';

const LIMIT = 10;
const BLANK = { type: 'incoming', trx_date: todayStr(), po_id: '', supplier_id: '', customer_name: '', notes: '', items: [{ product_id: '', quantity: '' }] };

export default function TransactionsPage() {
  const toast = useToast();
  const user = useUser();
  const role = user.role;
  const [data, setData] = useState(null);
  const [page, setPage] = useState(1);
  const [f, setF] = useState({ type: '', status: '', from: '', to: '', q: '' });
  const [form, setForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [pos, setPos] = useState([]);

  const load = useCallback(() => {
    api(`/api/transactions?${qs({ ...f, page, limit: LIMIT })}`).then(setData).catch((e) => toast(e.message, 'error'));
  }, [f, page, toast]);
  useEffect(() => { const t = setTimeout(load, 250); return () => clearTimeout(t); }, [load]);

  // Data pendukung form (hanya staff yang membuat/mengubah transaksi)
  useEffect(() => {
    if (role === 'supplier') return;
    api('/api/products?limit=500').then((d) => setProducts(d.rows)).catch(() => {});
    if (role === 'staff') {
      api('/api/suppliers').then(setSuppliers).catch(() => {});
    }
  }, [role]);

  const setFilter = (k, v) => { setF({ ...f, [k]: v }); setPage(1); };
  const openCreate = async () => {
    setPos(await api('/api/restock?available=1').catch(() => []));
    setForm({ ...BLANK });
  };
  const openEdit = (t) => setForm({ ...t, po_id: t.po_id || '', items: t.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) });

  // Pilih PO: supplier dan daftar produk terisi otomatis
  function pickPo(id) {
    const po = pos.find((p) => String(p.id) === String(id));
    if (!po) return setForm({ ...form, po_id: '', supplier_id: '', items: [{ product_id: '', quantity: '' }] });
    setForm({ ...form, po_id: po.id, supplier_id: po.supplier_id, items: po.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api(form.id ? `/api/transactions/${form.id}` : '/api/transactions', { method: form.id ? 'PUT' : 'POST', body: form });
      toast(res.message);
      setForm(null);
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  async function act(t, action, extra = {}) {
    try {
      toast((await api(`/api/transactions/${t.id}/action`, { method: 'POST', body: { action, ...extra } })).message);
      setRejecting(null); setReason(''); setDetail(null);
      load();
    } catch (err) { toast(err.message, 'error'); }
  }

  async function remove() {
    try { toast((await api(`/api/transactions/${del.id}`, { method: 'DELETE' })).message); setDel(null); load(); }
    catch (err) { toast(err.message, 'error'); setDel(null); }
  }

  const mine = (t) => role === 'manager' || t.created_by === user.id;
  const editing = !!form?.id;

  return (
    <>
      <PageHeader title={role === 'supplier' ? 'Riwayat Transaksi' : 'Transaksi'}
        subtitle={role === 'supplier' ? 'Barang yang Anda kirim ke gudang' : 'Barang masuk dan barang keluar'}>
        {role === 'staff' && <button className="btn-primary" onClick={openCreate}>Buat transaksi</button>}
      </PageHeader>

      <div className="card mb-4 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
        <input className="input" placeholder="Cari no. / supplier / customer" value={f.q} onChange={(e) => setFilter('q', e.target.value)} />
        {role !== 'supplier' && (
          <select className="input" value={f.type} onChange={(e) => setFilter('type', e.target.value)}>
            <option value="">Semua tipe</option><option value="incoming">Barang masuk</option><option value="outgoing">Barang keluar</option>
          </select>
        )}
        <select className="input" value={f.status} onChange={(e) => setFilter('status', e.target.value)}>
          <option value="">Semua status</option>
          {['pending', 'approved', 'rejected', 'shipped'].map((s) => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
        <input type="date" className="input" aria-label="Dari tanggal" value={f.from} onChange={(e) => setFilter('from', e.target.value)} />
        <input type="date" className="input" aria-label="Sampai tanggal" value={f.to} onChange={(e) => setFilter('to', e.target.value)} />
      </div>

      <div className="card overflow-x-auto">
        {!data ? <Empty>Memuat...</Empty> : data.rows.length === 0 ? <Empty>Belum ada transaksi yang cocok dengan filter.</Empty> : (
          <>
            <table className="rtable w-full">
              <thead><tr>
                <th className="th">No. transaksi</th><th className="th">Tipe</th><th className="th">Tanggal</th>
                <th className="th">Supplier / Customer</th><th className="th text-right">Item</th><th className="th">Status</th><th className="th" />
              </tr></thead>
              <tbody>
                {data.rows.map((t) => (
                  <tr key={t.id} className="border-t border-slate-100">
                    <td className="td font-medium" data-label="No. transaksi">{t.trx_number}</td>
                    <td className="td" data-label="Tipe"><Badge value={t.type} /></td>
                    <td className="td" data-label="Tanggal">{t.trx_date}</td>
                    <td className="td" data-label="Supplier / Customer">{t.type === 'incoming' ? t.supplier_name : t.customer_name}</td>
                    <td className="td text-right" data-label="Item">{t.items.length}</td>
                    <td className="td" data-label="Status"><Badge value={t.status} /></td>
                    <td className="td" data-label="">
                      <div className="flex flex-wrap justify-end gap-1.5">
                        <button className="btn-ghost btn-sm" onClick={() => setDetail(t)}>Detail</button>
                        {t.status === 'pending' && role === 'manager' && <>
                          <button className="btn-primary btn-sm" onClick={() => act(t, 'approve')}>Approve</button>
                          <button className="btn-ghost btn-sm text-red-700" onClick={() => setRejecting(t)}>Reject</button>
                        </>}
                        {t.status === 'pending' && ['staff', 'manager'].includes(role) && mine(t) && <>
                          {role === 'staff' && <button className="btn-ghost btn-sm" onClick={() => openEdit(t)}>Edit</button>}
                          <button className="btn-ghost btn-sm text-red-700" onClick={() => setDel(t)}>Hapus</button>
                        </>}
                        {t.type === 'outgoing' && t.status === 'approved' && role === 'staff' && (
                          <button className="btn-primary btn-sm" onClick={() => act(t, 'ship')}>Tandai Shipped</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <Pagination page={data.page} total={data.total} limit={LIMIT} onChange={setPage} />
          </>
        )}
      </div>

      {form && (
        <Modal wide title={editing ? `Edit ${form.trx_number}` : 'Buat transaksi'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            {!editing && (
              <Field label="Tipe transaksi" className="sm:col-span-2">
                <div className="flex gap-2">
                  {[['incoming', 'Barang masuk'], ['outgoing', 'Barang keluar']].map(([v, l]) => (
                    <button type="button" key={v} className={form.type === v ? 'btn-primary' : 'btn-ghost'}
                      onClick={() => setForm({ ...BLANK, type: v })}>{l}</button>
                  ))}
                </div>
              </Field>
            )}
            <Field label={form.type === 'incoming' ? 'Tanggal penerimaan' : 'Tanggal pengiriman'}>
              <input required type="date" className="input" disabled={editing} value={form.trx_date} onChange={(e) => setForm({ ...form, trx_date: e.target.value })} />
            </Field>
            {form.type === 'incoming' ? (<>
              <Field label="Nomor PO (opsional, PO berstatus Received)">
                <select className="input" disabled={editing} value={form.po_id} onChange={(e) => pickPo(e.target.value)}>
                  <option value="">Tanpa PO</option>
                  {pos.map((p) => <option key={p.id} value={p.id}>{p.po_number} — {p.supplier_name}</option>)}
                  {editing && form.po_id && <option value={form.po_id}>{form.po_number}</option>}
                </select>
              </Field>
              <Field label="Supplier" className="sm:col-span-2">
                <select required className="input" disabled={editing || !!form.po_id} value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                  <option value="">Pilih supplier</option>
                  {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company}</option>)}
                  {editing && <option value={form.supplier_id}>{form.supplier_name}</option>}
                </select>
              </Field>
            </>) : (
              <Field label="Nama customer / tujuan">
                <input required className="input" disabled={editing} value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />
              </Field>
            )}
            <Field label="Daftar produk" className="sm:col-span-2">
              <ItemsEditor products={products} items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </Field>
            <Field label="Catatan" className="sm:col-span-2">
              <textarea required rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <p className="text-xs text-slate-500 sm:col-span-2">
              Stok {form.type === 'incoming' ? 'bertambah' : 'berkurang'} setelah transaksi di-approve Manager. Jika di-reject, stok tidak berubah.
            </p>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
              <button className="btn-primary" disabled={busy}>Simpan transaksi</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.trx_number} onClose={() => setDetail(null)}>
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Tipe</dt><dd><Badge value={detail.type} /></dd>
            <dt className="text-slate-500">Status</dt><dd><Badge value={detail.status} /></dd>
            <dt className="text-slate-500">Tanggal</dt><dd>{detail.trx_date}</dd>
            <dt className="text-slate-500">{detail.type === 'incoming' ? 'Supplier' : 'Customer / tujuan'}</dt>
            <dd>{detail.type === 'incoming' ? detail.supplier_name : detail.customer_name}</dd>
            {detail.po_number && <><dt className="text-slate-500">Nomor PO</dt><dd>{detail.po_number}</dd></>}
            <dt className="text-slate-500">Dibuat oleh</dt><dd>{detail.created_by_name}</dd>
            <dt className="text-slate-500">Catatan</dt><dd>{detail.notes}</dd>
            {detail.reject_reason && <><dt className="text-slate-500">Alasan penolakan</dt><dd className="text-red-700">{detail.reject_reason}</dd></>}
          </dl>
          <ItemsTable items={detail.items} />
        </Modal>
      )}

      {rejecting && (
        <Modal title={`Tolak ${rejecting.trx_number}`} onClose={() => { setRejecting(null); setReason(''); }}
          footer={<><button className="btn-ghost" onClick={() => setRejecting(null)}>Batal</button>
            <button className="btn-danger" disabled={!reason.trim()} onClick={() => act(rejecting, 'reject', { reason })}>Tolak transaksi</button></>}>
          <Field label="Alasan penolakan (wajib)"><textarea rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
        </Modal>
      )}

      {del && (
        <Modal title="Hapus transaksi" onClose={() => setDel(null)}
          footer={<><button className="btn-ghost" onClick={() => setDel(null)}>Batal</button><button className="btn-danger" onClick={remove}>Hapus transaksi</button></>}>
          <p className="text-sm">Hapus transaksi <b>{del.trx_number}</b>? Hanya transaksi Pending yang dapat dihapus.</p>
        </Modal>
      )}
    </>
  );
}
