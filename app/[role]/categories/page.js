'use client';
import { useCallback, useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Modal, PageHeader, Field, ImageField, Empty, useToast } from '@/components/ui';

const EMPTY = { name: '', description: '', image: '' };

export default function CategoriesPage() {
  const toast = useToast();
  const [rows, setRows] = useState(null);
  const [form, setForm] = useState(null); // null = tertutup
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => api('/api/categories').then(setRows).catch((e) => toast(e.message, 'error')), [toast]);
  useEffect(() => { load(); }, [load]);

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await api(form.id ? `/api/categories/${form.id}` : '/api/categories', { method: form.id ? 'PUT' : 'POST', body: form });
      toast(res.message);
      setForm(null);
      load();
    } catch (err) { toast(err.message, 'error'); } finally { setBusy(false); }
  }

  async function remove() {
    try {
      toast((await api(`/api/categories/${del.id}`, { method: 'DELETE' })).message);
      setDel(null);
      load();
    } catch (err) { toast(err.message, 'error'); setDel(null); }
  }

  return (
    <>
      <PageHeader title="Kategori" subtitle="Kelompok produk di gudang">
        <button className="btn-primary" onClick={() => setForm(EMPTY)}>Tambah kategori</button>
      </PageHeader>

      {!rows ? <p className="text-slate-500">Memuat...</p> : rows.length === 0 ? <div className="card"><Empty>Belum ada kategori. Tambahkan kategori pertama.</Empty></div> : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {rows.map((c) => (
            <div key={c.id} className="card flex gap-4 p-4">
              <img src={c.image || '/placeholder.svg'} alt="" className="h-20 w-20 shrink-0 rounded-md object-cover" />
              <div className="min-w-0 flex-1">
                <div className="font-medium text-slate-900">{c.name}</div>
                <p className="line-clamp-2 text-sm text-slate-500">{c.description}</p>
                <div className="mt-1 text-xs text-slate-500">{c.product_count} produk</div>
                <div className="mt-2 flex gap-2">
                  <button className="btn-ghost btn-sm" onClick={() => setForm(c)}>Edit</button>
                  <button className="btn-ghost btn-sm text-red-700" onClick={() => setDel(c)}>Hapus</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {form && (
        <Modal title={form.id ? 'Edit kategori' : 'Tambah kategori'} onClose={() => setForm(null)}>
          <form onSubmit={save} className="space-y-4">
            <Field label="Nama kategori"><input required className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></Field>
            <Field label="Deskripsi"><textarea required rows={3} className="input" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
            <Field label="Gambar kategori"><ImageField value={form.image} onChange={(url) => setForm({ ...form, image: url })} /></Field>
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setForm(null)}>Batal</button>
              <button className="btn-primary" disabled={busy}>Simpan kategori</button>
            </div>
          </form>
        </Modal>
      )}

      {del && (
        <Modal title="Hapus kategori" onClose={() => setDel(null)}
          footer={<><button className="btn-ghost" onClick={() => setDel(null)}>Batal</button><button className="btn-danger" onClick={remove}>Hapus kategori</button></>}>
          <p className="text-sm">Hapus kategori <b>{del.name}</b>? Kategori yang masih memiliki produk tidak dapat dihapus.</p>
        </Modal>
      )}
    </>
  );
}
