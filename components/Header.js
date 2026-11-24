'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Icon from './Icon';

const MENUS = [
  { path: 'dashboard', label: 'Dashboard', roles: ['admin', 'manager', 'staff', 'supplier'] },
  { path: 'products', label: 'Produk', roles: ['admin', 'manager', 'staff'] },
  { path: 'categories', label: 'Kategori', roles: ['admin', 'manager'] },
  { path: 'transactions', label: 'Transaksi', roles: ['admin', 'manager', 'staff'] },
  { path: 'transactions', label: 'Riwayat', roles: ['supplier'] },
  { path: 'restock', label: 'Restock', roles: ['admin', 'manager', 'supplier'] },
  { path: 'restock', label: 'Penerimaan', roles: ['staff'] },
  { path: 'suppliers', label: 'Supplier', roles: ['admin'] },
];
export const ROLE_LABEL = { admin: 'Admin', manager: 'Warehouse Manager', staff: 'Staff Gudang', supplier: 'Supplier' };

export function Logo({ className = '' }) {
  // eslint-disable-next-line @next/next/no-img-element
  return <img src="/logo.svg" alt="SIMBA" className={`h-10 w-auto ${className}`} />;
}

export default function Header({ user }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => { if (!ref.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [open]);

  async function logout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
    router.refresh();
  }

  const base = `/${user.role}`; // semua alamat berawalan peran: /admin/..., /manager/..., dst.
  const items = MENUS.filter((m) => m.roles.includes(user.role)).map((m) => ({ ...m, href: `${base}/${m.path}` }));
  const isActive = (m) => (m.path === 'dashboard' ? pathname === m.href : pathname.startsWith(m.href));
  const initials = user.name.split(' ').map((w) => w[0]).slice(0, 2).join('').toUpperCase();

  return (
    <header>
      <div className="flex items-center gap-4 rounded-full bg-white px-3 py-2.5 shadow-sm sm:px-4">
        <Link href={`${base}/dashboard`} aria-label="SIMBA"><Logo /></Link>

        <nav aria-label="Navigasi utama" className="mx-auto hidden items-center gap-1 rounded-full bg-slate-100 p-1 lg:flex">
          {items.map((m) => (
            <Link key={m.label} href={m.href} aria-current={isActive(m) ? 'page' : undefined}
              className={`rounded-full px-4 py-2 text-sm transition-colors ${isActive(m) ? 'bg-white font-semibold text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-900'}`}>
              {m.label}
            </Link>
          ))}
        </nav>

        <div ref={ref} className="relative ml-auto lg:ml-0">
          <button onClick={() => setOpen(!open)} aria-haspopup="menu" aria-expanded={open}
            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-2 hover:bg-slate-50">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-600 text-sm font-semibold text-white">{initials}</span>
            <span className="hidden text-left sm:block">
              <span className="block max-w-[10rem] truncate text-sm font-semibold text-slate-900">{user.name}</span>
              <span className="block max-w-[10rem] truncate text-xs font-medium text-brand-600">{ROLE_LABEL[user.role]}</span>
            </span>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </button>
          {open && (
            <div role="menu" className="absolute right-0 z-30 mt-2 w-56 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-200">
              <div className="px-3 py-2">
                <div className="truncate text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="truncate text-xs text-slate-400">{user.email}</div>
                <span className="mt-2 inline-block rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700">{ROLE_LABEL[user.role]}</span>
              </div>
              <div className="my-1 border-t border-slate-100" />
              <Link role="menuitem" href={`${base}/account`} onClick={() => setOpen(false)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50">
                <Icon name="lock" className="h-4 w-4" />Ubah Password
              </Link>
              <button role="menuitem" onClick={logout} className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50">
                <Icon name="logout" className="h-4 w-4" />Keluar
              </button>
            </div>
          )}
        </div>
      </div>

      <nav aria-label="Navigasi utama (ponsel)" className="mt-3 flex gap-2 overflow-x-auto pb-1 lg:hidden">
        {items.map((m) => (
          <Link key={m.label} href={m.href}
            className={`whitespace-nowrap rounded-full px-4 py-2 text-sm ${isActive(m) ? 'bg-brand-600 font-semibold text-white' : 'bg-white text-slate-600'}`}>
            {m.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
