import Link from 'next/link';
import Icon from './Icon';
import { Logo } from './Header';

const FEATURES = ['Stok real-time dan peringatan stok minimum', 'Approval transaksi barang masuk dan keluar', 'Restock order langsung ke supplier'];

// Kerangka halaman login/register: panel form di kiri, panel hijau di kanan
export default function AuthShell({ title, accent, subtitle, children }) {
  return (
    <div className="min-h-screen p-3 sm:p-6">
      <div className="mx-auto grid min-h-[calc(100vh-1.5rem)] max-w-[1200px] overflow-hidden rounded-[2rem] bg-[#f4f5f5] sm:min-h-[calc(100vh-3rem)] lg:grid-cols-2">
        <div className="flex flex-col justify-center px-6 py-10 sm:px-14">
          <Link href="/" aria-label="Ke beranda SIMBA" className="mb-10 self-start"><Logo /></Link>
          <h1 className="text-3xl font-semibold text-slate-900 sm:text-4xl">{title} <span className="text-slate-400">{accent}</span></h1>
          <p className="mb-8 mt-2 text-sm text-slate-500">{subtitle}</p>
          {children}
        </div>

        <div className="relative m-3 hidden flex-col justify-between overflow-hidden rounded-[1.75rem] bg-brand-600 p-10 text-white lg:flex">
          <div className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-16 h-80 w-80 rounded-full bg-white/10" />
          <svg viewBox="0 0 400 120" className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-30" aria-hidden="true" preserveAspectRatio="none">
            <path d="M0 80 C50 40 90 110 140 70 S230 20 280 60 S360 90 400 40 V120 H0Z" fill="#fff" />
          </svg>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-light.svg" alt="SIMBA" className="relative h-10 w-auto self-start" />
          <div className="relative">
            <h2 className="max-w-sm text-3xl font-semibold leading-snug">Kelola stok semen, besi, dan cat dengan lebih rapi.</h2>
            <ul className="mt-8 space-y-3">
              {FEATURES.map((f) => (
                <li key={f} className="flex items-center gap-3 text-sm text-white/90">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/20"><Icon name="check" className="h-3.5 w-3.5" /></span>{f}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative text-xs text-white/60">Individual Project 6 — Manajemen Gudang</div>
        </div>
      </div>
    </div>
  );
}
