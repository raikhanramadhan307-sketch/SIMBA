'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Icon from './Icon';

/* ---------- Toast ---------- */
const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [items, setItems] = useState([]);
  const push = useCallback((message, type = 'success') => {
    const id = Math.random();
    setItems((s) => [...s, { id, message, type }]);
    setTimeout(() => setItems((s) => s.filter((i) => i.id !== id)), 4000);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <div className="fixed bottom-4 right-4 z-[60] flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2" aria-live="polite">
        {items.map((i) => (
          <div key={i.id} className={`rounded-2xl border px-4 py-3 text-sm shadow-lg ${i.type === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {i.message}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}

/* ---------- Modal ---------- */
export function Modal({ title, onClose, children, wide, footer }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/50 p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label={title} className={`my-4 sm:my-8 w-full rounded-3xl bg-white shadow-xl ${wide ? 'max-w-3xl' : 'max-w-lg'}`}>
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <h2 className="text-base font-semibold text-slate-900">{title}</h2>
          <button onClick={onClose} className="rounded p-1 text-slate-500 hover:bg-slate-100" aria-label="Tutup">✕</button>
        </div>
        <div className="px-6 py-5">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Badge ---------- */
const BADGE = {
  Normal: 'bg-emerald-100 text-emerald-700', Low: 'bg-amber-100 text-amber-700',
  Severe: 'bg-red-100 text-red-700', 'Out of Stock': 'bg-slate-200 text-slate-700',
  pending: 'bg-amber-100 text-amber-700', approved: 'bg-emerald-100 text-emerald-700',
  rejected: 'bg-red-100 text-red-700', shipped: 'bg-sky-100 text-sky-700',
  confirmed: 'bg-sky-100 text-sky-700', in_transit: 'bg-violet-100 text-violet-700',
  received: 'bg-emerald-100 text-emerald-700', inspecting: 'bg-cyan-100 text-cyan-700', returned: 'bg-orange-100 text-orange-700', incoming: 'bg-sky-100 text-sky-700',
  outgoing: 'bg-orange-100 text-orange-700',
};
const BADGE_LABEL = { in_transit: 'In Transit', incoming: 'Barang Masuk', outgoing: 'Barang Keluar' };

export function Badge({ value }) {
  const label = BADGE_LABEL[value] || (/^[a-z]/.test(value) ? value[0].toUpperCase() + value.slice(1) : value);
  return (
    <span className={`inline-block min-w-[5.5rem] whitespace-nowrap rounded-full px-3 py-1 text-center text-xs font-medium ${BADGE[value] || 'bg-slate-100 text-slate-600'}`}>
      {label}
    </span>
  );
}

/* ---------- Pagination bernomor: Sebelumnya 01 02 [03] ... 10 Berikutnya ---------- */
function pageList(page, pages) {
  const keep = [...new Set([1, 2, pages - 1, pages, page - 1, page, page + 1])].filter((n) => n >= 1 && n <= pages).sort((a, b) => a - b);
  const out = [];
  keep.forEach((n, i) => { if (i && n - keep[i - 1] > 1) out.push('...'); out.push(n); });
  return out;
}

export function Pagination({ page, total, limit, onChange }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  const nav = 'rounded-lg px-2 py-1 text-sm text-slate-500 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:text-slate-500';
  return (
    <nav aria-label="Halaman" className="flex items-center justify-between gap-2 px-3 py-4 sm:px-5">
      <button className={nav} disabled={page <= 1} onClick={() => onChange(page - 1)} aria-label="Halaman sebelumnya">‹<span className="hidden sm:inline"> Sebelumnya</span></button>
      <div className="flex items-center gap-1">
        {pageList(page, pages).map((n, i) => n === '...'
          ? <span key={`e${i}`} className="px-1 text-slate-400">…</span>
          : <button key={n} onClick={() => onChange(n)} aria-current={n === page ? 'page' : undefined}
              className={`min-w-[2rem] rounded-md px-2 py-1 text-xs font-medium ${n === page ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
              {String(n).padStart(2, '0')}
            </button>)}
      </div>
      <button className={nav} disabled={page >= pages} onClick={() => onChange(page + 1)} aria-label="Halaman berikutnya"><span className="hidden sm:inline">Berikutnya </span>›</button>
    </nav>
  );
}

/* ---------- Menu aksi baris (tombol titik tiga) ---------- */
export function RowMenu({ items }) {
  const [pos, setPos] = useState(null);
  const btn = useRef(null);
  const menu = useRef(null);

  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    const outside = (e) => { if (!menu.current?.contains(e.target) && !btn.current?.contains(e.target)) close(); };
    document.addEventListener('mousedown', outside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => { document.removeEventListener('mousedown', outside); window.removeEventListener('scroll', close, true); window.removeEventListener('resize', close); };
  }, [pos]);

  function toggle() {
    if (pos) return setPos(null);
    const r = btn.current.getBoundingClientRect();
    setPos({ top: r.bottom + 4, right: window.innerWidth - r.right });
  }

  return (
    <>
      <button ref={btn} onClick={toggle} aria-label="Aksi" aria-haspopup="menu" aria-expanded={!!pos}
        className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
        <Icon name="dots" className="h-5 w-5" />
      </button>
      {pos && (
        <div ref={menu} role="menu" style={{ position: 'fixed', top: pos.top, right: pos.right }}
          className="z-40 w-36 rounded-2xl bg-white p-1.5 shadow-lg ring-1 ring-slate-200">
          {items.map((it) => (
            <button key={it.label} role="menuitem" onClick={() => { setPos(null); it.onClick(); }}
              className={`w-full rounded-xl px-3 py-2 text-left text-sm hover:bg-slate-50 ${it.danger ? 'text-red-600' : 'text-slate-700'}`}>
              {it.label}
            </button>
          ))}
        </div>
      )}
    </>
  );
}

/* ---------- Layout helpers ---------- */
export function PageHeader({ title, subtitle, children }) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>}
      </div>
      <div className="flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

export const Field = ({ label, children, className = '' }) => (
  <div className={className}>
    <label className="label">{label}</label>
    {children}
  </div>
);

export const Empty = ({ children }) => <div className="px-4 py-10 text-center text-sm text-slate-500">{children}</div>;

/* ---------- Upload gambar ---------- */
export function ImageField({ value, onChange }) {
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  async function upload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onChange(data.url);
    } catch (err) {
      toast(err.message || 'Gagal mengunggah gambar', 'error');
    } finally {
      setBusy(false);
      e.target.value = '';
    }
  }
  return (
    <div className="flex items-center gap-3">
      <img src={value || '/placeholder.svg'} alt="Pratinjau" className="h-16 w-16 rounded-2xl border border-slate-200 object-cover" />
      <div>
        <input type="file" accept="image/png,image/jpeg,image/webp" onChange={upload} disabled={busy} className="block text-sm file:mr-3 file:rounded-full file:border-0 file:bg-slate-200 file:px-3 file:py-1.5 file:text-sm" />
        <p className="mt-1 text-xs text-slate-500">{busy ? 'Mengunggah...' : 'JPG, PNG, atau WEBP, maks. 2 MB'}</p>
      </div>
    </div>
  );
}

/* ---------- Editor daftar produk + quantity ---------- */
export function ItemsEditor({ products, items, onChange, disabled }) {
  const set = (i, patch) => onChange(items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)));
  return (
    <div className="space-y-2">
      {items.map((it, i) => (
        <div key={i} className="flex flex-wrap gap-2 sm:flex-nowrap">
          <select className="input min-w-0 flex-1 basis-full sm:basis-0" value={it.product_id} disabled={disabled} onChange={(e) => set(i, { product_id: e.target.value })}>
            <option value="">Pilih produk</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stok {p.stock} {p.unit}</option>
            ))}
          </select>
          <input type="number" min="1" className="input flex-1 sm:w-28 sm:flex-none" placeholder="Qty" value={it.quantity} onChange={(e) => set(i, { quantity: e.target.value })} />
          {!disabled && items.length > 1 && (
            <button type="button" className="btn-ghost btn-sm" onClick={() => onChange(items.filter((_, idx) => idx !== i))} aria-label="Hapus baris">✕</button>
          )}
        </div>
      ))}
      {!disabled && (
        <button type="button" className="btn-ghost btn-sm" onClick={() => onChange([...items, { product_id: '', quantity: '' }])}>+ Tambah produk</button>
      )}
    </div>
  );
}

export function ItemsTable({ items }) {
  return (
    <table className="w-full text-sm">
      <thead><tr><th className="th">Produk</th><th className="th">SKU</th><th className="th text-right">Qty</th></tr></thead>
      <tbody>
        {items.map((it, i) => (
          <tr key={i} className="border-t border-slate-100">
            <td className="td">{it.name}</td><td className="td">{it.sku}</td>
            <td className="td text-right">{it.quantity} {it.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
