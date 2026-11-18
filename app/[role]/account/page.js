'use client';
import { useState } from 'react';
import { api } from '@/lib/client';
import { useUser } from '@/components/UserContext';
import { ROLE_LABEL } from '@/components/Header';
import { PageHeader, Field, useToast } from '@/components/ui';

const EMPTY = { current_password: '', new_password: '', confirm_password: '' };

// Kekuatan password sederhana: panjang, huruf besar+kecil, angka, simbol
function strength(p) {
  let s = 0;
  if (p.length >= 8) s++;
  if (p.length >= 12) s++;
  if (/[a-z]/.test(p) && /[A-Z]/.test(p)) s++;
  if (/\d/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return p ? (s <= 2 ? 1 : s <= 3 ? 2 : 3) : 0;
}
const LEVELS = [null, ['Lemah', 'bg-red-500', 'text-red-600'], ['Sedang', 'bg-amber-400', 'text-amber-600'], ['Kuat', 'bg-emerald-500', 'text-emerald-600']];

export default function AccountPage() {
  const user = useUser();
  const toast = useToast();
  const [form, setForm] = useState(EMPTY);
  const [show, setShow] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const level = strength(form.new_password);
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();
  const type = show ? 'text' : 'password';

  async function submit(e) {
    e.preventDefault();
    setError('');
    if (form.new_password.length < 8) return setError('Password baru minimal 8 karakter');
    if (form.new_password !== form.confirm_password) return setError('Konfirmasi password tidak cocok');
    setBusy(true);
    try {
      toast((await api('/api/auth/password', { method: 'PUT', body: form })).message);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeader title="Akun Saya" subtitle="Informasi akun dan keamanan" />
      <div className="grid gap-4 lg:grid-cols-3">
        <section className="card p-6 text-center lg:self-start">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-brand-600 text-2xl font-semibold text-white">{initials}</span>
          <h2 className="mt-4 text-lg font-semibold text-slate-900">{user.name}</h2>
          <p className="break-all text-sm text-slate-500">{user.email}</p>
          <span className="mt-3 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">{ROLE_LABEL[user.role]}</span>
          {user.company && <p className="mt-3 text-sm text-slate-500">{user.company}</p>}
        </section>

        <section className="card p-6 lg:col-span-2">
          <h2 className="text-base font-semibold text-slate-900">Ubah Password</h2>
          <p className="mb-5 mt-1 text-sm text-slate-500">Gunakan minimal 8 karakter. Kombinasi huruf besar, kecil, angka, dan simbol membuat password lebih kuat.</p>

          <form onSubmit={submit} className="max-w-md space-y-4">
            {error && <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

            <Field label="Password saat ini">
              <input required type={type} autoComplete="current-password" className="input" value={form.current_password} onChange={set('current_password')} />
            </Field>
            <Field label="Password baru">
              <input required type={type} minLength={8} maxLength={72} autoComplete="new-password" className="input" value={form.new_password} onChange={set('new_password')} />
              {level > 0 && (
                <div className="mt-2 flex items-center gap-3" aria-live="polite">
                  <div className="flex flex-1 gap-1">
                    {[1, 2, 3].map((i) => <span key={i} className={`h-1.5 flex-1 rounded-full ${i <= level ? LEVELS[level][1] : 'bg-slate-200'}`} />)}
                  </div>
                  <span className={`text-xs font-medium ${LEVELS[level][2]}`}>{LEVELS[level][0]}</span>
                </div>
              )}
            </Field>
            <Field label="Konfirmasi password baru">
              <input required type={type} maxLength={72} autoComplete="new-password" className="input" value={form.confirm_password} onChange={set('confirm_password')} />
              {form.confirm_password && form.confirm_password !== form.new_password && <p className="mt-1 text-xs text-red-600">Konfirmasi belum sama dengan password baru</p>}
            </Field>

            <label className="flex items-center gap-2 text-sm text-slate-600">
              <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="h-4 w-4 rounded border-slate-300 accent-brand-600" />
              Tampilkan password
            </label>

            <button className="btn-primary" disabled={busy}>{busy ? 'Menyimpan...' : 'Simpan Password'}</button>
          </form>
        </section>
      </div>
    </>
  );
}
