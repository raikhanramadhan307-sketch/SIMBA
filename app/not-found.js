import Link from 'next/link';
import { Logo } from '@/components/Header';

export const metadata = { title: 'Halaman tidak ditemukan - SIMBA' };

export default function NotFound() {
  return (
    <div className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-10 text-center shadow-sm">
        <div className="mb-6 flex justify-center"><Logo /></div>
        <p className="text-6xl font-bold text-brand-600">404</p>
        <h1 className="mt-3 text-xl font-semibold text-slate-900">Halaman tidak ditemukan</h1>
        <p className="mt-2 text-sm text-slate-500">Alamat yang Anda buka tidak ada atau sudah dipindahkan.</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/dashboard" className="btn-primary">Ke Dashboard</Link>
          <Link href="/login" className="btn-ghost">Halaman Masuk</Link>
        </div>
      </div>
    </div>
  );
}
