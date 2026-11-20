# SIMBA — Sistem Manajemen Bahan Bangunan

Individual Project 6: Manajemen Gudang. Dibangun dengan **Next.js 14 (App Router)**, **Tailwind CSS**, **PostgreSQL**, JWT (cookie httpOnly) + bcrypt.

## Menjalankan

Prasyarat: Node.js 20+ dan PostgreSQL (pgAdmin 4).

```bash
npm install
cp .env.example .env.local     # isi DB_USER / DB_PASSWORD (password postgres) / JWT_SECRET
npm run db:init                # membuat database simba_db, tabel, dan akun awal
npm run dev                    # http://localhost:3000
```

**Alternatif lewat pgAdmin (tanpa `db:init`):**
1. Klik kanan *Databases* > *Create* > *Database...*, beri nama `simba_db`.
2. Klik kanan `simba_db` > *Query Tool*, buka `database/simba.sql`, lalu Execute (F5).
3. Pastikan `.env.local` berisi `DB_NAME=simba_db`, `DB_PORT=5432` (cek port di pgAdmin), dan password postgres Anda.

## Akun awal (password semua: `password123`)

| Peran | Email |
|---|---|
| Admin | admin@simba.test |
| Warehouse Manager | manager@simba.test |
| Staff Gudang | staff@simba.test |
| Supplier (Approved) | supplier@simba.test |
| Supplier (Pending) | pending@simba.test |

Akun Admin, Manager, dan Staff hanya dibuat lewat `database/simba.sql`. Supplier mendaftar sendiri di `/register` dan harus disetujui Admin.

## Alamat halaman (URL)

Semua halaman berawalan nama peran. Peran hanya bisa membuka alamatnya sendiri.

| Peran | Halaman |
|---|---|
| Admin | `/admin/dashboard`, `/admin/products`, `/admin/categories`, `/admin/transactions`, `/admin/suppliers` |
| Warehouse Manager | `/manager/dashboard`, `/manager/products`, `/manager/categories`, `/manager/transactions`, `/manager/restock` |
| Staff Gudang | `/staff/dashboard`, `/staff/products`, `/staff/transactions` |
| Supplier | `/supplier/dashboard`, `/supplier/transactions`, `/supplier/restock` |

Alamat lama `/dashboard/...` otomatis dialihkan ke alamat peran yang sesuai.

Semua peran juga punya halaman **Akun Saya** di `/{peran}/account` (dibuka dari menu avatar, *Ubah Password*). Password lama wajib diisi, password baru minimal 8 karakter dan harus berbeda dari yang lama.

## Hak akses

| Modul | Admin | Manager | Staff | Supplier |
|---|---|---|---|---|
| Produk (CRUD) | ✔ | ✔ | lihat | – |
| Kategori (CRUD) | ✔ | ✔ | – | – |
| Verifikasi Supplier | ✔ | – | – | – |
| Transaksi: buat/edit/Shipped | – | – | ✔ | – |
| Transaksi: approve/reject | – | ✔ | – | – |
| Transaksi: hapus (Pending) | – | ✔ | milik sendiri | – |
| Restock: buat, In Transit, Received | – | ✔ | – | – |
| Restock: konfirmasi/tolak | – | – | – | ✔ |
| Riwayat transaksi | lihat | lihat | ✔ | milik sendiri |

## Aturan bisnis yang diterapkan

- Status stok dihitung otomatis: `0` → Out of Stock, `≤ min` → Severe, `≤ low` → Low, selain itu Normal. Stok Low harus > stok minimum.
- Stok berubah hanya saat Manager **approve**, dalam satu transaksi database (`SELECT ... FOR UPDATE`). Reject tidak mengubah stok. `Shipped` dan `Received` tidak mengubah stok.
- Barang keluar: quantity tidak boleh melebihi stok (dicek saat dibuat, diedit, dan di-approve).
- Satu Restock Order hanya bisa dipakai satu Incoming Transaction yang belum Rejected; supplier otomatis mengikuti PO.
- Hanya transaksi Pending yang bisa diedit/dihapus. Alasan wajib saat Reject (transaksi maupun restock oleh Supplier).
- Kategori yang masih punya produk tidak bisa dihapus; produk bersisa stok memunculkan peringatan sebelum dihapus.
- Supplier Pending/Rejected ditolak saat login dengan pesan yang sesuai.

## Struktur

```
app/api/...        REST API (auth, products, categories, transactions, restock, suppliers, dashboard, upload)
app/[role]/...     Halaman per modul; alamat berawalan peran (/admin/dashboard, /manager/products, ...)
lib/               db, auth (JWT), validator, helper API
database/simba.sql Skema + data awal
uploads/           Gambar yang diunggah (disajikan lewat /api/files/[name])
```

Catatan: gambar disimpan di folder `uploads/` lokal. Untuk hosting serverless (mis. Vercel) ganti dengan object storage.

## Troubleshooting login

| Pesan | Penyebab | Solusi |
|---|---|---|
| `DB_PASSWORD belum terbaca` (atau `SASL: ... client password must be a string`) | `.env.local` tidak ada / `DB_PASSWORD` kosong | Salin `.env.example` menjadi `.env.local` di folder yang sama dengan `package.json`, isi `DB_PASSWORD` dengan password PostgreSQL, lalu **restart** `npm run dev` |
| `Password PostgreSQL salah` | Password di `.env.local` tidak cocok | Samakan dengan password user `postgres` di pgAdmin |
| `Database belum ada` / `Tabel belum dibuat` | `simba.sql` belum dijalankan | Jalankan `database/simba.sql` di Query Tool pada database `simba_db` |
| `Email tidak terdaftar` | Salah ketik email | Gunakan `admin@simba.test` (huruf **i**, bukan *samba*) |

Nama file harus persis `.env.local` (bukan `.env.local.txt`). Pada Windows, aktifkan tampilan *File name extensions* untuk memeriksanya.
