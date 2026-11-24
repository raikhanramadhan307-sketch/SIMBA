'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { todayStr } from '@/lib/utils';
import { useUser } from '@/components/UserContext';
import InspectionReport from '@/components/InspectionReport';
import { Badge, Modal, PageHeader, Field, ImageField, ItemsEditor, ItemsTable, Empty, useToast } from '@/components/ui';

const BLANK = { supplier_id: '', order_date: todayStr(), expected_date: '', notes: '', items: [{ product_id: '', quantity: '' }] };
const STATUSES = ['pending', 'confirmed', 'rejected', 'in_transit', 'inspecting', 'received', 'returned'];
const statusLabel = (s) => (s === 'in_transit' ? 'In Transit' : s[0].toUpperCase() + s.slice(1));
const COPY = {
  admin: ['Restock Order', 'Pemantauan seluruh restock order (hanya lihat)'],
  manager: ['Restock Order', 'Permintaan restock kepada supplier dan tindak lanjut hasil pemeriksaan'],
  staff: ['Penerimaan Barang', 'PO yang tiba di gudang: periksa fisik barang dan buat laporan pemeriksaan'],
  supplier: ['Restock Order', 'Pesanan restock dari gudang untuk Anda'],
};

export default function RestockPage() {
  const toast = useToast();
  const { role } = useUser();
  const [rows, setRows] = useState(null);
  const [status, setStatus] = useState(role === 'staff' ? 'inspecting' : '');
  const [form, setForm] = useState(null);       // buat PO (manager)
  const [detail, setDetail] = useState(null);
  const [ask, setAsk] = useState(null);         // modal alasan/catatan
  const [note, setNote] = useState('');
  const [arrive, setArrive] = useState(null);   // modal bukti kedatangan (supplier)
  const [inspect, setInspect] = useState(null); // modal laporan pemeriksaan (staff)
  const [busy, setBusy] = useState(false);
  const [products, setProducts] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const load = useCallback(() => {
    api(`/api/restock${status ? `?status=${status}` : ''}`).then(setRows).catch((e) => toast(e.message, 'error'));
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  async function openCreate(prefill) {
    const [p, s] = await Promise.all([api('/api/products?limit=500'), api('/api/suppliers')]);
    setProducts(p.rows); setSuppliers(s);
    setForm(prefill
      ? { ...BLANK, supplier_id: prefill.supplier_id, notes: `Pengganti ${prefill.po_number}`, items: prefill.items.map((i) => ({ product_id: i.product_id, quantity: i.quantity })) }
      : { ...BLANK });
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      toast((await api('/api/restock', { method: 'POST', body: form })).message);
      setForm(null); load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  async function act(r, action, extra = {}) {
    setBusy(true);
    try {
      toast((await api(`/api/restock/${r.id}`, { method: 'PUT', body: { action, ...extra } })).message);
      setAsk(null); setNote(''); setArrive(null); setDetail(null); load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  function openInspect(r) {
    setInspect({
      po: r,
      notes: r.inspection?.notes || '',
      items: r.items.map((i) => {
        const prev = r.inspection?.items?.find((x) => x.product_id === i.product_id);
        return { product_id: i.product_id, name: i.name, unit: i.unit, ordered: i.quantity, received_qty: prev ? prev.received_qty : i.quantity, damaged_qty: prev ? prev.damaged_qty : 0 };
      }),
    });
  }
  const setIns = (idx, k, v) => setInspect({ ...inspect, items: inspect.items.map((it, i) => (i === idx ? { ...it, [k]: v } : it)) });
  const insMatch = inspect && inspect.items.every((i) => Number(i.received_qty) === i.ordered && Number(i.damaged_qty) === 0);

  async function saveInspect(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api(`/api/restock/${inspect.po.id}/inspection`, {
        method: 'POST',
        body: { notes: inspect.notes, items: inspect.items.map((i) => ({ product_id: i.product_id, received_qty: Number(i.received_qty), damaged_qty: Number(i.damaged_qty) })) },
      });
      toast(res.message); setInspect(null); load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  const [title, subtitle] = COPY[role];

  return (
    <>
      <PageHeader title={title} subtitle={subtitle}>
        {role === 'manager' && <button className="btn-primary" onClick={() => openCreate()}>Buat restock order</button>}
      </PageHeader>

      <div className="mb-4 max-w-xs">
        <select className="input" aria-label="Filter status" value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Semua status</option>
          {STATUSES.map((s) => <option key={s} value={s}>{statusLabel(s)}</option>)}
        </select>
      </div>

      <div className="card overflow-x-auto">
        {!rows ? <Empty>Memuat...</Empty> : rows.length === 0 ? <Empty>{role === 'staff' && status === 'inspecting' ? 'Belum ada PO yang perlu diperiksa.' : 'Belum ada restock order.'}</Empty> : (
          <table className="rtable w-full">
            <thead><tr>
              <th className="th">Nomor PO</th>{role !== 'supplier' && <th className="th">Supplier</th>}
              <th className="th">Tanggal order</th><th className="th">Estimasi tiba</th><th className="th text-right">Item</th><th className="th">Status</th><th className="th" />
            </tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-slate-100">
                  <td className="td font-medium" data-label="Nomor PO">{r.po_number}</td>
                  {role !== 'supplier' && <td className="td" data-label="Supplier">{r.supplier_name}</td>}
                  <td className="td" data-label="Tanggal order">{r.order_date}</td><td className="td" data-label="Estimasi tiba">{r.expected_date}</td>
                  <td className="td text-right" data-label="Item">{r.items.length}</td>
                  <td className="td" data-label="Status">
                    <div className="flex flex-col items-start gap-1 md:items-start">
                      <Badge value={r.status} />
                      {r.status === 'inspecting' && r.inspection && <span className={`text-xs ${r.inspection.is_match ? 'text-emerald-600' : 'text-red-600'}`}>Laporan: {r.inspection.is_match ? 'sesuai' : 'tidak sesuai'}</span>}
                      {r.status === 'inspecting' && !r.inspection && <span className="text-xs text-slate-400">Belum ada laporan</span>}
                      {r.refund_requested_at && <span className="text-xs text-orange-600">Refund diajukan</span>}
                    </div>
                  </td>
                  <td className="td" data-label="">
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button className="btn-ghost btn-sm" onClick={() => setDetail(r)}>Detail</button>

                      {role === 'supplier' && r.status === 'pending' && <>
                        <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(r, 'confirm')}>Konfirmasi</button>
                        <button className="btn-ghost btn-sm text-red-700" onClick={() => { setNote(''); setAsk({ r, action: 'reject', title: `Tolak ${r.po_number}`, field: 'Alasan penolakan (wajib)', required: true, button: 'Tolak order', danger: true }); }}>Tolak</button>
                      </>}
                      {role === 'supplier' && r.status === 'confirmed' && <button className="btn-primary btn-sm" disabled={busy} onClick={() => act(r, 'ship')}>Kirim Barang (In Transit)</button>}
                      {role === 'supplier' && r.status === 'in_transit' && <button className="btn-primary btn-sm" onClick={() => setArrive({ r, photo: '', note: '' })}>Konfirmasi Kedatangan</button>}

                      {role === 'staff' && r.status === 'inspecting' && <button className="btn-primary btn-sm" onClick={() => openInspect(r)}>{r.inspection ? 'Ubah Laporan' : 'Buat Laporan Pemeriksaan'}</button>}

                      {role === 'manager' && r.status === 'inspecting' && <button className="btn-ghost btn-sm text-red-700" onClick={() => { setNote(''); setAsk({ r, action: 'return', title: `Kembalikan ${r.po_number}`, field: 'Alasan pengembalian (wajib)', required: true, button: 'Kembalikan PO (Returned)', danger: true }); }}>Kembalikan</button>}
                      {role === 'manager' && r.status === 'returned' && !r.refund_requested_at && <button className="btn-primary btn-sm" onClick={() => { setNote(''); setAsk({ r, action: 'refund', title: `Ajukan refund ${r.po_number}`, field: 'Catatan klaim refund (opsional)', required: false, button: 'Ajukan refund' }); }}>Ajukan Refund</button>}
                      {role === 'manager' && r.status === 'returned' && <button className="btn-ghost btn-sm" onClick={() => openCreate(r)}>Buat PO Baru</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Buat PO (Manager) */}
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

      {/* Detail PO */}
      {detail && (
        <Modal wide title={detail.po_number} onClose={() => setDetail(null)}>
          <dl className="mb-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
            <dt className="text-slate-500">Status</dt><dd><Badge value={detail.status} /></dd>
            <dt className="text-slate-500">Supplier</dt><dd>{detail.supplier_name}</dd>
            <dt className="text-slate-500">Tanggal order</dt><dd>{detail.order_date}</dd>
            <dt className="text-slate-500">Estimasi tiba</dt><dd>{detail.expected_date}</dd>
            <dt className="text-slate-500">Catatan</dt><dd>{detail.notes}</dd>
            {detail.status_note && <><dt className="text-slate-500">{detail.status === 'returned' ? 'Alasan pengembalian' : 'Alasan penolakan'}</dt><dd className="text-red-700">{detail.status_note}</dd></>}
            {detail.arrived_at && <><dt className="text-slate-500">Barang tiba</dt><dd>{detail.arrived_at.slice(0, 16)}</dd></>}
            {detail.arrival_note && <><dt className="text-slate-500">Catatan kedatangan</dt><dd>{detail.arrival_note}</dd></>}
            {detail.refund_requested_at && <><dt className="text-slate-500">Klaim refund</dt><dd className="text-orange-700">Diajukan {detail.refund_requested_at.slice(0, 16)}{detail.refund_note ? ` — ${detail.refund_note}` : ''}</dd></>}
          </dl>
          <ItemsTable items={detail.items} />
          {detail.arrival_photo && (
            <div className="mt-4">
              <div className="mb-2 text-sm font-semibold text-slate-900">Bukti foto kedatangan</div>
              <a href={detail.arrival_photo} target="_blank" rel="noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={detail.arrival_photo} alt={`Bukti kedatangan ${detail.po_number}`} className="h-44 rounded-2xl object-cover" />
              </a>
            </div>
          )}
          {detail.inspection && <InspectionReport report={detail.inspection} />}
          {role === 'manager' && detail.status === 'inspecting' && (
            <p className="mt-4 rounded-2xl bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
              Jika barang sesuai, setujui Incoming Transaction milik PO ini di menu Transaksi (PO otomatis menjadi Received). Jika tidak sesuai, kembalikan PO dengan alasan.
            </p>
          )}
        </Modal>
      )}

      {/* Alasan / catatan (tolak, kembalikan, refund) */}
      {ask && (
        <Modal title={ask.title} onClose={() => { setAsk(null); setNote(''); }}
          footer={<><button className="btn-ghost" onClick={() => setAsk(null)}>Batal</button>
            <button className={ask.danger ? 'btn-danger' : 'btn-primary'} disabled={busy || (ask.required && !note.trim())} onClick={() => act(ask.r, ask.action, { note })}>{ask.button}</button></>}>
          <Field label={ask.field}><textarea rows={3} className="input" value={note} onChange={(e) => setNote(e.target.value)} /></Field>
        </Modal>
      )}

      {/* Bukti kedatangan (Supplier) */}
      {arrive && (
        <Modal title={`Konfirmasi kedatangan ${arrive.r.po_number}`} onClose={() => setArrive(null)}
          footer={<><button className="btn-ghost" onClick={() => setArrive(null)}>Batal</button>
            <button className="btn-primary" disabled={busy || !arrive.photo} onClick={() => act(arrive.r, 'arrive', { photo: arrive.photo, note: arrive.note })}>Kirim bukti kedatangan</button></>}>
          <div className="space-y-4">
            <Field label="Foto dokumentasi kedatangan barang (wajib)"><ImageField value={arrive.photo} onChange={(url) => setArrive({ ...arrive, photo: url })} /></Field>
            <Field label="Catatan (opsional)"><textarea rows={2} className="input" value={arrive.note} onChange={(e) => setArrive({ ...arrive, note: e.target.value })} /></Field>
            <p className="text-xs text-slate-500">Setelah dikirim, status PO menjadi Inspecting dan Staff Gudang akan memeriksa fisik barang.</p>
          </div>
        </Modal>
      )}

      {/* Laporan pemeriksaan (Staff) */}
      {inspect && (
        <Modal wide title={`Laporan pemeriksaan ${inspect.po.po_number}`} onClose={() => setInspect(null)}>
          <form onSubmit={saveInspect} className="space-y-4">
            {inspect.po.arrival_photo && (
              <a href={inspect.po.arrival_photo} target="_blank" rel="noreferrer" className="text-sm font-medium text-brand-700 hover:underline">Lihat bukti foto kedatangan</a>
            )}
            <div className="space-y-3">
              {inspect.items.map((it, idx) => (
                <div key={it.product_id} className="grid items-end gap-3 rounded-2xl bg-slate-50 p-3 sm:grid-cols-[1fr_6rem_6rem_6rem]">
                  <div><div className="text-sm font-semibold text-slate-900">{it.name}</div><div className="text-xs text-slate-500">Dipesan: {it.ordered} {it.unit}</div></div>
                  <Field label="Dipesan"><input className="input" value={it.ordered} disabled readOnly /></Field>
                  <Field label="Diterima"><input required type="number" min="0" className="input" value={it.received_qty} onChange={(e) => setIns(idx, 'received_qty', e.target.value)} /></Field>
                  <Field label="Rusak"><input required type="number" min="0" className="input" value={it.damaged_qty} onChange={(e) => setIns(idx, 'damaged_qty', e.target.value)} /></Field>
                </div>
              ))}
            </div>
            <div className={`rounded-2xl px-4 py-3 text-sm ${insMatch ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'}`}>
              {insMatch ? 'Barang sesuai: jumlah cocok dan tidak ada yang rusak.' : 'Barang tidak sesuai: catatan ketidaksesuaian wajib diisi.'}
            </div>
            <Field label={insMatch ? 'Catatan (opsional)' : 'Catatan ketidaksesuaian (wajib)'}>
              <textarea rows={3} className="input" value={inspect.notes} onChange={(e) => setInspect({ ...inspect, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setInspect(null)}>Batal</button>
              <button className="btn-primary" disabled={busy || (!insMatch && !inspect.notes.trim())}>Simpan laporan</button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
