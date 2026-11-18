'use client';
import Link from 'next/link';
import { useState } from 'react';
import { api } from '@/lib/client';
import AuthShell from '@/components/AuthShell';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [errField, setErrField] = useState('');
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    setErrField('');
    try {
      const res = await api('/api/auth/login', { method: 'POST', body: form });
      window.location.href = `/${res.role}/dashboard`; // alamat berawalan peran, mis. /admin/dashboard
    } catch (err) {
      setError(err.message);
      setErrField(err.data?.field || '');
      setBusy(false);
    }
  }

  const bad = (f) => (errField === f ? 'border-red-400 focus:border-red-500 focus:ring-red-100' : '');

  return (
    <AuthShell title="Selamat Datang" accent="di SIMBA" subtitle="Masuk dengan akun yang sudah terdaftar untuk melanjutkan.">
      <form onSubmit={submit} className="max-w-sm">
        {error && <div role="alert" className="mb-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        <label className="label" htmlFor="email">Email</label>
        <input id="email" type="email" required autoComplete="email" placeholder="nama@email.com" aria-invalid={errField === 'email'}
          className={`input mb-5 ${bad('email')}`} value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

        <label className="label" htmlFor="password">Password</label>
        <div className="relative mb-7">
          <input id="password" type={show ? 'text' : 'password'} required autoComplete="current-password" placeholder="Masukkan password" aria-invalid={errField === 'password'}
            className={`input pr-20 ${bad('password')}`} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full px-2 py-1 text-xs font-medium text-brand-700 hover:bg-brand-50">
            {show ? 'Sembunyikan' : 'Tampilkan'}
          </button>
        </div>

        <button className="btn-primary w-full py-3" disabled={busy}>{busy ? 'Memproses...' : 'Masuk'}</button>
        <p className="mt-6 text-sm text-slate-500">
          Supplier baru? <Link href="/register" className="font-semibold text-brand-700 hover:underline">Daftar di sini</Link>
        </p>
      </form>
    </AuthShell>
  );
}
