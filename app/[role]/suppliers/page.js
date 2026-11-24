'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Badge, Modal, PageHeader, Field, Empty, useToast } from '@/components/ui';

const TABS = [['pending', 'Menunggu'], ['approved', 'Disetujui'], ['rejected', 'Ditolak']];

export default function SuppliersPage() {
  const toast = useToast();
  const [status, setStatus] = useState('pending');
  const [rows, setRows] = useState(null);
  const [rejecting, setRejecting] = useState(null);
  const [reason, setReason] = useState('');

  const load = useCallback(() => {
    setRows(null);
    api(`/api/suppliers?status=${status}`).then(setRows).catch((e) => toast(e.message, 'error'));
  }, [status, toast]);
  useEffect(() => { load(); }, [load]);

  async function decide(id, next, why = '') {
    try {
      toast((await api(`/api/suppliers/${id}`, { method: 'PUT', body: { status: next, reason: why } })).message);
      setRejecting(null); setReason(''); load();
    } catch (e) { toast(e.message, 'error'); }
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
            <thead><tr><th className="th">Perusahaan</th><th className="th">Penanggung jawab</th><th className="th">Kontak</th><th className="th">Mendaftar</th><th className="th">Status</th>{status === 'rejected' && <th className="th">Alasan penolakan</th>}<th className="th" /></tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="td font-medium" data-label="Perusahaan">{s.company}</td>
                  <td className="td" data-label="Penanggung jawab">{s.name}</td>
                  <td className="td" data-label="Kontak"><div>{s.email}</div><div className="text-xs text-slate-500">{s.phone}</div></td>
                  <td className="td" data-label="Mendaftar">{s.created_at?.slice(0, 10)}</td>
                  <td className="td" data-label="Status"><Badge value={s.status} /></td>
                  {status === 'rejected' && <td className="td" data-label="Alasan penolakan">{s.status_note || '-'}</td>}
                  <td className="td" data-label="">
                    <div className="flex justify-end gap-2">
                      {s.status !== 'approved' && <button className="btn-primary btn-sm" onClick={() => decide(s.id, 'approved')}>Setujui</button>}
                      {s.status !== 'rejected' && <button className="btn-ghost btn-sm text-red-700" onClick={() => { setReason(''); setRejecting(s); }}>Tolak</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {rejecting && (
        <Modal title={`Tolak ${rejecting.company}`} onClose={() => { setRejecting(null); setReason(''); }}
          footer={<><button className="btn-ghost" onClick={() => setRejecting(null)}>Batal</button>
            <button className="btn-danger" disabled={!reason.trim()} onClick={() => decide(rejecting.id, 'rejected', reason)}>Tolak supplier</button></>}>
          <Field label="Alasan penolakan (wajib)"><textarea rows={3} className="input" value={reason} onChange={(e) => setReason(e.target.value)} /></Field>
          <p className="mt-2 text-xs text-slate-500">Alasan ini akan terlihat oleh supplier saat mencoba masuk.</p>
        </Modal>
      )}
    </>
  );
}
