'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { todayStr } from '@/lib/utils';
import { useUser } from '@/components/UserContext';
import { Badge, Modal, PageHeader, Field, ItemsEditor, ItemsTable, Empty, useToast } from '@/components/ui';

const BLANK = { supplier_id: '', order_date: todayStr(), expected_date: '', notes: '', items: [{ product_id: '', quantity: '' }] };
const STATUSES = ['pending', 'confirmed', 'rejected', 'in_transit', 'received'];

export default function RestockPage() {
  const toast = useToast();
  const { role } = useUser();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState('');
  const [form, setForm] = useState(null);
  const [detail, setDetail] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const load = useCallback(() => {
    api(`/api/restock${status ? `?status=${status}` : ''}`).then(setRows).catch((e) => toast(e.message, 'error'));
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  const openCreate = async () => {
    const [p, s] = await Promise.all([api('/api/products?limit=500'), api('/api/suppliers')]);
    setProducts(p.rows); setSuppliers(s); setForm({ ...BLANK });
  };

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      toast((await api('/api/restock', { method: 'POST', body: form })).message);
      setForm(null); load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  async function act(r, action, n = '') {
    try {
      toast((await api(`/api/restock/${r.id}`, { method: 'PUT', body: { action, note: n } })).message);
      setRejecting(null); setNote(''); load();
    } catch (err) { toast(err.message, 'error'); }
  }

  return (
    <>
      <PageHeader title="Restock Order" subtitle={role === 'supplier' ? 'Pesanan restock dari gudang untuk Anda' : 'Permintaan restock kepada supplier'}>
        {role === 'manager' && <button className="btn-primary" onClick={openCreate}>Buat restock order</button>}
      </PageHeader>

      <div className="mb-4 max-w-xs">
        <select className="input" aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s === 'in_transit' ? 'In Transit' : s[0].toUpperCase() + s.slice(1)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {!rows ? <Empty>Memuat...</Empty> : rows.length === 0 ? <Empty>Belum ada restock order.</Empty> : (
          <table className="rtable w-full">
            <thead><tr>
              <th className="th">Nomor PO</th>{role === 'manager' && <th className="th">Supplier</th>}
              <th className="th">Tanggal order</th><th className="th">Estimasi tiba</th><th className="th text-right">Item</th><th className="th">Status</th><th className="th" />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="td font-medium" data-label="Nomor PO">{r.po_number}</td>
                  {role === 'manager' && <td className="td" data-label="Supplier">{r.supplier_name}</td>}
                  <td className="td" data-label="Tanggal order">{r.order_date}</td><td className="td" data-label="Estimasi tiba">{r.expected_date}</td>
                  <td className="td text-right" data-label="Item">{r.items.length}</td>
                  <td className="td" data-label="Status"><Badge value={r.status} /></td>
                  <td className="td" data-label=""><div className="flex flex-wrap justify-end gap-1.5">
                    <button className="btn-ghost btn-sm" onClick={() => setDetail(r)}>Detail</button>
                    {role === 'supplier' && r.status === 'pending' && <>
                      <button className="btn-primary btn-sm" onClick={() => act(r, 'confirm')}>Konfirmasi</button>
                      <button className="btn-ghost btn-sm text-red-700" onClick={() => setRejecting(r)}>Tolak</button>
                    </>}
                    {role === 'manager' && r.status === 'confirmed' && <button className="btn-primary btn-sm" onClick={() => act(r, 'transit')}>Tandai In Transit</button>}
                    {role === 'manager' && r.status === 'in_transit' && <button className="btn-primary btn-sm" onClick={() => act(r, 'receive')}>Tandai Received</button>}
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {form && (
        <Modal wide title="Buat restock order" onClose={() => setForm(null)}>
          <form onSubmit={save} className="grid gap-4 sm:grid-cols-2">
            <Field label="Supplier" className="sm:col-span-2">
              <select required className="input" value={form.supplier_id} onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}>
                <option value="">Pilih supplier</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.company}</option>)}
              </select>
            </Field>
            <Field label="Tanggal order"><input required type="date" className="input" value={form.order_date} onChange={(e) => setForm({ ...form, order_date: e.target.value })} /></Field>
            <Field label="Expected delivery date"><input required type="date" min={form.order_date} className="input" value={form.expected_date} onChange={(e) => setForm({ ...form, expected_date: e.target.value })} /></Field>
            <Field label="Produk yang perlu direstock" className="sm:col-span-2">
              <ItemsEditor products={products} items={form.items} onChange={(items) => setForm({ ...form, items })} />
            </Field>
            <Field label="Catatan" className="sm:col-span-2"><textarea required rows={2} className="input" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></Field>
            <div className="flex justify-end gap-2 sm:col-span-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
              <button className="btn-primary" disabled={busy}>Kirim order</button>
            </div>
          </form>
        </Modal>
      )}

      {detail && (
        <Modal title={detail.po_number} onClose={() => setDetail(null)}>
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Badge value={detail.status} /></dd>
            <dt className="text-slate-500">Supplier</dt><dd>{detail.supplier_name}</dd>
            <dt className="text-slate-500">Tanggal order</dt><dd>{detail.order_date}</dd>
            <dt className="text-slate-500">Estimasi tiba</dt><dd>{detail.expected_date}</dd>
            <dt className="text-slate-500">Catatan</dt><dd>{detail.notes}</dd>
            {detail.status_note && <><dt className="text-slate-500">Catatan status</dt><dd>{detail.status_note}</dd></>}
          </dl>
          <ItemsTable items={detail.items} />
        </Modal>
      )}

      {rejecting && (
        <Modal title={`Tolak ${rejecting.po_number}`} onClose={() => { setRejecting(null); setNote(''); }}
          footer={<><button className="btn-ghost" onClick={() => setRejecting(null)}>Batal</button>
            <button className="btn-danger" disabled={!note.trim()} onClick={() => act(rejecting, 'reject', note)}>Tolak order</button></>}>
          <Field label="Alasan penolakan (wajib)"><textarea rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </Modal>
      )}
    </>
  );
}
