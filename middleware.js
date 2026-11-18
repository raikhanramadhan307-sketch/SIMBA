import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';

// Halaman yang dibatasi per peran (nama segmen setelah /{peran}/)
const ACCESS = {
  products: ['admin', 'manager', 'staff'],
  categories: ['admin', 'manager'],
  transactions: ['admin', 'manager', 'staff', 'supplier'],
  restock: ['manager', 'supplier'],
  suppliers: ['admin'],
};

export async function middleware(req) {
  const token = req.cookies.get('token')?.value;
  let payload = null;
  if (token) {
    try {
      payload = (await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET || 'dev-secret'))).payload;
    } catch {}
  }
  const go = (path) => NextResponse.redirect(new URL(path, req.url));
  if (!payload) return go('/login');

  const role = payload.role;
  const { pathname } = req.nextUrl;
  const [first, page] = pathname.split('/').filter(Boolean);

  // Alamat lama /dashboard/... dialihkan ke /{peran}/...
  if (first === 'dashboard') return go(`/${role}/${pathname.replace(/^\/dashboard\/?/, '') || 'dashboard'}`);
  // Peran hanya boleh membuka alamatnya sendiri (admin tidak bisa buka /manager/..., dst.)
  if (first !== role) return go(`/${role}/dashboard`);
  if (ACCESS[page] && !ACCESS[page].includes(role)) return go(`/${role}/dashboard`);
  return NextResponse.next();
}

export const config = { matcher: ['/dashboard/:path*', '/admin/:path*', '/manager/:path*', '/staff/:path*', '/supplier/:path*'] };
