// Helper fetch untuk komponen client
export async function api(url, opts = {}) {
  const { body, ...rest } = opts;
  const res = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...rest,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && typeof window !== 'undefined' && !['/login', '/register'].includes(window.location.pathname))
    window.location.href = '/login';
  if (!res.ok) {
    const err = new Error(data.error || 'Terjadi kesalahan');
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const rupiah = (n) =>
  new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(n || 0);

export const qs = (obj) => {
  const p = new URLSearchParams();
  Object.entries(obj).forEach(([k, v]) => v !== '' && v != null && p.set(k, v));
  return p.toString();
};
