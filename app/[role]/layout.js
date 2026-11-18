import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { getUser } from '@/lib/auth';
import Header from '@/components/Header';
import { UserProvider } from '@/components/UserContext';

export const dynamic = 'force-dynamic';

const ROLES = ['admin', 'manager', 'staff', 'supplier'];

// Semua halaman aplikasi berada di bawah /{peran}/..., mis. /admin/dashboard atau /manager/products
export default async function RoleLayout({ children, params }) {
  if (!ROLES.includes(params.role)) notFound();
  const user = await getUser();
  if (!user) redirect('/login');
  if (params.role !== user.role) redirect(`/${user.role}/dashboard`);
  return (
    <UserProvider user={user}>
      <div className="min-h-screen p-3 sm:p-6">
        <div className="mx-auto max-w-[1400px] rounded-[2rem] bg-[#f4f5f5] p-3 sm:p-5">
          <Header user={user} />
          <main className="px-1 pb-6 pt-7 sm:px-4">{children}</main>
          <footer className="border-t border-slate-200/70 px-4 pt-4 text-xs text-slate-400">
            <Link href={`/${user.role}/dashboard`} className="mx-auto flex w-fit items-center gap-2 hover:text-slate-600">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-mark.svg" alt="" className="h-5 w-5" />
              <span>SIMBA · Sistem Manajemen Bahan Bangunan</span>
            </Link>
          </footer>
        </div>
      </div>
    </UserProvider>
  );
}
