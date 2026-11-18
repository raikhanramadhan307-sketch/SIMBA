'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/client';
import AuthShell from '@/components/AuthShell';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', company: '', email: '', phone: '', password: '' });
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      await api('/api/auth/register', { method: 'POST', body: form });
      setDone(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthShell title="Daftar" accent="sebagai Supplier" subtitle="Akun baru akan ditinjau admin sebelum bisa dipakai masuk.">
      {done ? (
        <div className="max-w-sm space-y-5">
          <p className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Pendaftaran berhasil. Akun Anda akan ditinjau admin sebelum bisa dipakai masuk.
          </p>
          <Link href="/login" className="btn-primary w-full py-3">Kembali ke halaman masuk</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="max-w-md space-y-4">
          {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
          <div><label className="label">Nama penanggung jawab</label><input required className="input" value={form.name} onChange={set('name')} /></div>
          <div><label className="label">Nama perusahaan</label><input required className="input" value={form.company} onChange={set('company')} /></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Email</label><input required type="email" className="input" value={form.email} onChange={set('email')} /></div>
            <div><label className="label">No. telepon</label><input required className="input" value={form.phone} onChange={set('phone')} /></div>
          </div>
          <div><label className="label">Password (min. 8 karakter)</label><input required type="password" minLength={8} className="input" value={form.password} onChange={set('password')} /></div>
          <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Mengirim...' : 'Daftar'}</button>
          <p className="text-sm text-slate-500">Sudah punya akun? <Link href="/login" className="font-semibold text-brand-700 hover:underline">Masuk</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
