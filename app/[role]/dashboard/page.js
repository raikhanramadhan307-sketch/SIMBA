'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { api, rupiah } from '@/lib/client';
import { useUser } from '@/components/UserContext';
import Icon from '@/components/Icon';
import { ROLE_LABEL } from '@/components/Header';
import { Badge, Empty } from '@/components/ui';
import { AreaChart, BarChart, Legend } from '@/components/charts';

const ACTION = {
  admin: ['Kelola Produk', 'products'], manager: ['Buat Restock Order', 'restock'],
  staff: ['Buat Transaksi', 'transactions'], supplier: ['Lihat Order', 'restock'],
};
const DOT = { pending: 'bg-amber-400', approved: 'bg-emerald-500', rejected: 'bg-red-500', shipped: 'bg-sky-500', confirmed: 'bg-sky-500', in_transit: 'bg-violet-500', received: 'bg-emerald-500' };
const num = (n) => new Intl.NumberFormat('id-ID').format(n || 0);
const monthLabel = (ym) => new Date(`${ym}-01T00:00:00`).toLocaleDateString('id-ID', { month: 'short' });
const pill = 'flex items-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm text-slate-700 shadow-sm';

function Panel({ icon, title, subtitle, href, action, children, className = '' }) {
  return (
    <section className={`rounded-3xl bg-white p-5 shadow-sm ${className}`}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          {icon && <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600"><Icon name={icon} className="h-5 w-5" /></span>}
          <div><h2 className="text-sm font-semibold text-slate-900">{title}</h2>{subtitle && <p className="text-xs text-slate-400">{subtitle}</p>}</div>
        </div>
        {action}
        {href && (
          <Link href={href} aria-label={`Buka ${title}`} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 hover:bg-slate-200">
            <Icon name="arrowUpRight" className="h-4 w-4" />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Segmented({ options, value, onChange, label }) {
  return (
    <div role="group" aria-label={label} className="inline-flex rounded-full bg-slate-100 p-1 text-xs">
      {options.map(([v, l]) => (
        <button key={v} onClick={() => onChange(v)} aria-pressed={value === v}
          className={`rounded-full px-3.5 py-1.5 font-medium transition-colors ${value === v ? 'bg-brand-600 text-white' : 'text-slate-500 hover:text-slate-800'}`}>{l}</button>
      ))}
    </div>
  );
}

function Mini({ label, value, badge, href }) {
  const body = (
    <div className="flex items-center justify-between rounded-3xl bg-white p-4 shadow-sm">
      <div><div className="text-xs text-slate-400">{label}</div><div className="mt-1 text-2xl font-semibold text-slate-900">{value}</div></div>
      <span className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">{badge}</span>
    </div>
  );
  return href ? <Link href={href} className="block transition hover:-translate-y-0.5">{body}</Link> : body;
}

function StatusDot({ value }) {
  const label = value === 'in_transit' ? 'In Transit' : value[0].toUpperCase() + value.slice(1);
  return <span className="flex items-center gap-2"><span className={`h-2 w-2 rounded-full ${DOT[value] || 'bg-slate-400'}`} />{label}</span>;
}

export default function DashboardPage() {
  const user = useUser();
  const base = `/${user.role}`;
  const [d, setD] = useState(null);
  const [error, setError] = useState('');
  const [range, setRange] = useState('bulanan');
  const [flow, setFlow] = useState('incoming');
  useEffect(() => { api('/api/dashboard').then(setD).catch((e) => setError(e.message)); }, []);

  const [actionLabel, actionHref] = ACTION[user.role];
  const header = (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">
          Selamat Datang, <span className="text-slate-400">{user.name.split(' ')[0]}</span>
        </h1>
        <span className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">{ROLE_LABEL[user.role]}</span>
      </div>
      <div className="flex flex-wrap gap-2">
        <span className={pill}><Icon name="calendar" className="h-4 w-4" />{new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</span>
        <Link href={`${base}/${actionHref}`} className={`${pill} font-medium hover:bg-slate-50`}><Icon name="plus" className="h-4 w-4" />{actionLabel}</Link>
      </div>
    </div>
  );

  if (error) return <>{header}<p className="text-red-700">{error}</p></>;
  if (!d) return <>{header}<p className="text-slate-500">Memuat dashboard...</p></>;
  const count = (arr, key, v) => arr.find((x) => x[key] === v)?.n || 0;

  /* ---------------- Supplier ---------------- */
  if (d.role === 'supplier') {
    return (
      <>
        {header}
        <div className="grid gap-4 lg:grid-cols-12">
          <Panel className="lg:col-span-4" icon="alert" title="Perlu dikonfirmasi" subtitle="Order restock berstatus Pending" href={`${base}/restock`}>
            <div className="rounded-2xl bg-brand-600 p-5 text-white">
              <div className="text-xs text-white/70">Order menunggu</div>
              <div className="mt-2 text-4xl font-semibold">{count(d.restock, 'status', 'pending')}</div>
            </div>
          </Panel>
          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-8">
            <Mini label="Dikonfirmasi" value={count(d.restock, 'status', 'confirmed')} badge="Confirmed" />
            <Mini label="Dalam pengiriman" value={count(d.restock, 'status', 'in_transit')} badge="In Transit" />
            <Mini label="Diterima gudang" value={count(d.restock, 'status', 'received')} badge="Received" />
          </div>
          <Panel className="lg:col-span-12" icon="truck" title="Order Terbaru" subtitle="Pesanan restock dari gudang" href={`${base}/restock`}>
            {d.recent.length === 0 ? <Empty>Belum ada order restock untuk Anda.</Empty> : (
              <table className="rtable w-full">
                <thead><tr><th className="th pl-0">Nomor PO</th><th className="th">Tanggal order</th><th className="th">Estimasi tiba</th><th className="th">Status</th></tr></thead>
                <tbody>
                  {d.recent.map((r) => (
                    <tr key={r.po_number} className="border-t border-slate-100">
                      <td className="td pl-0 font-semibold text-slate-900" data-label="Nomor PO">{r.po_number}</td><td className="td" data-label="Tanggal order">{r.order_date}</td>
                      <td className="td" data-label="Estimasi tiba">{r.expected_date}</td><td className="td" data-label="Status"><StatusDot value={r.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </Panel>
        </div>
      </>
    );
  }

  /* ---------------- Admin / Manager / Staff ---------------- */
  const total = d.stockCounts.reduce((a, x) => a + x.n, 0);
  const critical = ['Low', 'Severe', 'Out of Stock'].map((s) => [s, count(d.stockCounts, 'stock_status', s)]);
  const alertTotal = critical.reduce((a, [, n]) => a + n, 0);
  const bars = range === 'bulanan'
    ? d.monthly.map((m) => ({ key: m.ym, label: monthLabel(m.ym), incoming: m.incoming, outgoing: m.outgoing }))
    : d.daily.map((x) => ({ key: x.day, label: x.day.slice(8), incoming: x.incoming, outgoing: x.outgoing }));
  const hasBars = bars.some((b) => b.incoming || b.outgoing);
  const qty = (t) => t.items.reduce((a, i) => a + i.quantity, 0);

  return (
    <>
      {header}
      <div className="grid gap-4 lg:grid-cols-12">
        {/* Kolom kiri */}
        <div className="flex flex-col gap-4 lg:col-span-3">
          <Panel icon="wallet" title="Nilai Persediaan" subtitle="Stok x harga beli" href={`${base}/products`}>
            <div className="rounded-2xl bg-brand-600 p-5 text-white">
              <div className="text-sm font-semibold tracking-wide">SIMBA</div>
              <div className="mt-6 text-xs text-white/70">Total nilai stok</div>
              <div className="mt-1 break-words text-2xl font-semibold">{rupiah(d.inventoryValue)}</div>
              <div className="mt-6 flex items-center justify-between text-xs text-white/80"><span>{total} produk</span><span>{num(d.totalUnits)} unit</span></div>
            </div>
          </Panel>
          <Mini label="Menunggu approval" value={d.pendingTransactions} badge="Transaksi" href={`${base}/transactions`} />
          {d.role === 'admin'
            ? <Mini label="Supplier menunggu" value={d.pendingSuppliers} badge="Verifikasi" href={`${base}/suppliers`} />
            : <Mini label="Restock berjalan" value={count(d.restock, 'status', 'confirmed') + count(d.restock, 'status', 'in_transit')} badge="Restock" href={d.role === 'manager' ? `${base}/restock` : undefined} />}
        </div>

        {/* Grafik tengah */}
        <Panel className="lg:col-span-6" icon="swap" title="Barang Masuk dan Keluar" subtitle="Qty transaksi yang sudah disetujui" href={`${base}/transactions`}
          action={<Segmented label="Periode" value={range} onChange={setRange} options={[['bulanan', 'Bulanan'], ['harian', 'Harian']]} />}>
          <div className="mb-2"><Legend /></div>
          {hasBars ? <BarChart data={bars} /> : <Empty>Belum ada transaksi yang disetujui pada periode ini.</Empty>}
        </Panel>

        {/* Kolom kanan (2 baris) */}
        <div className="flex flex-col gap-4 lg:col-span-3 lg:row-span-2">
          <Panel title="Total Unit Stok" subtitle="Seluruh produk di gudang" href={`${base}/products`}>
            <div className="text-3xl font-semibold text-slate-900">{num(d.totalUnits)}<span className="ml-1 text-lg text-slate-400">unit</span></div>
            <div className="mt-2"><AreaChart data={d.daily} field={flow} /></div>
            <div className="mt-3 flex justify-center"><Segmented label="Jenis pergerakan" value={flow} onChange={setFlow} options={[['incoming', 'Masuk ↓'], ['outgoing', 'Keluar ↑']]} /></div>
          </Panel>

          <Panel className="flex-1" icon="alert" title="Peringatan Stok" subtitle="Produk di bawah batas Normal" href={`${base}/products`}>
            <div className="flex items-center gap-2">
              <span className="text-3xl font-semibold text-slate-900">{alertTotal}</span>
              <span className="text-sm text-slate-400">produk</span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
              {critical.map(([s, n]) => <span key={s} className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">{s} {n}</span>)}
            </div>
            <ul className="mt-4 space-y-3">
              {d.alerts.length === 0 && <li className="text-sm text-slate-400">Semua stok produk dalam kondisi Normal.</li>}
              {d.alerts.slice(0, 5).map((a) => (
                <li key={a.id} className="flex items-center gap-3">
                  <img src={a.image || '/placeholder.svg'} alt="" className="h-9 w-9 rounded-full object-cover" />
                  <div className="min-w-0 flex-1"><div className="truncate text-sm font-medium text-slate-900">{a.name}</div><div className="text-xs text-slate-400">Sisa {a.stock} {a.unit}</div></div>
                  <Badge value={a.stock_status} />
                </li>
              ))}
            </ul>
          </Panel>
        </div>

        {/* Riwayat transaksi */}
        <Panel className="lg:col-span-9" icon="clock" title="Transaksi Terbaru" subtitle="Aktivitas barang masuk dan keluar" href={`${base}/transactions`}>
          {d.recent.length === 0 ? <Empty>Belum ada transaksi.</Empty> : (
            <div className="overflow-x-auto">
              <table className="rtable w-full">
                <thead><tr><th className="th pl-0">Transaksi</th><th className="th">Tanggal</th><th className="th">Waktu</th><th className="th">Status</th><th className="th text-right">Total Qty</th></tr></thead>
                <tbody>
                  {d.recent.map((t) => (
                    <tr key={t.id} className="border-t border-slate-100">
                      <td className="td pl-0" data-label="Transaksi">
                        <div className="flex items-center gap-3">
                          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${t.type === 'incoming' ? 'bg-brand-50 text-brand-600' : 'bg-orange-50 text-orange-600'}`}>
                            <Icon name={t.type === 'incoming' ? 'arrowDown' : 'arrowUp'} className="h-4 w-4" />
                          </span>
                          <div><div className="font-semibold text-slate-900">{t.trx_number}</div>
                            <div className="text-xs text-brand-600">{t.type === 'incoming' ? 'Masuk' : 'Keluar'} · {t.customer_name || t.supplier_name}</div></div>
                        </div>
                      </td>
                      <td className="td" data-label="Tanggal">{t.trx_date}</td>
                      <td className="td" data-label="Waktu">{t.created_at?.slice(11, 16)}</td>
                      <td className="td" data-label="Status"><StatusDot value={t.status} /></td>
                      <td className="td text-right font-medium text-slate-900" data-label="Total Qty">{num(qty(t))}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Panel>
      </div>
    </>
  );
}
