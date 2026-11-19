'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Badge, PageHeader, Empty, useToast } from '@/components/ui';

const TABS = [['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak']];

export default function SuppliersPage() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    setRows(null);
    api(`/api/suppliers?status=${status}`).then(setRows).catch((e) => toast(e.message, 'error'));
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  async function decide(id, next) {
    try { toast((await api(`/api/suppliers/${id}`, { method: 'PUT', body: { status: next } })).message); load(); }
    catch (e) { toast(e.message, 'error'); }
  }

  return (
    <>
      <PageHeader title="Verifikasi Supplier" subtitle="Supplier berstatus Pending atau Rejected tidak dapat masuk ke dashboard" />
      <div className="mb-4 flex gap-2">
        {TABS.map(([v, l]) => (
          <button key={v} onClick={() => setStatus(v)} className={status === v ? 'btn-primary' : 'btn-ghost'}>{l}</button>
        ))}
      </div>
      <div className="card overflow-x-auto">
        {!rows ? <Empty>Memuat...</Empty> : rows.length === 0 ? <Empty>Tidak ada supplier dengan status ini.</Empty> : (
          <table className="rtable w-full">
            <thead><tr><th className="th">Perusahaan</th><th className="th">Penanggung jawab</th><th className="th">Kontak</th><th className="th">Mendaftar</th><th className="th">Status</th><th className="th" /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="td font-medium" data-label="Perusahaan">{s.company}</td>
                  <td className="td" data-label="Penanggung jawab">{s.name}</td>
                  <td className="td" data-label="Kontak"><div>{s.email}</div><div className="text-xs text-slate-500">{s.phone}</div></td>
                  <td className="td" data-label="Mendaftar">{s.created_at?.slice(0, 10)}</td>
                  <td className="td" data-label="Status"><Badge value={s.status} /></td>
                  <td className="td" data-label="">
                    <div className="flex justify-end gap-2">
                      {s.status !== 'approved' && <button className="btn-primary btn-sm" onClick={() => decide(s.id, 'approved')}>Setujui</button>}
                      {s.status !== 'rejected' && <button className="btn-ghost btn-sm text-red-700" onClick={() => decide(s.id, 'rejected')}>Tolak</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
