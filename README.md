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
| Admin | `/admin/dashboard`, `/admin/products`, `/admin/categories`, `/admin/transactions`, `/admin/restock`, `/admin/suppliers` |
| Warehouse Manager | `/manager/dashboard`, `/manager/products`, `/manager/categories`, `/manager/transactions`, `/manager/restock` |
| Staff Gudang | `/staff/dashboard`, `/staff/products`, `/staff/transactions`, `/staff/restock` (menu Penerimaan) |
| Supplier | `/supplier/dashboard`, `/supplier/transactions`, `/supplier/restock` |

Alamat lama `/dashboard/...` otomatis dialihkan ke alamat peran yang sesuai.

Semua peran juga punya halaman **Akun Saya** di `/{peran}/account` (dibuka dari menu avatar, *Ubah Password*). Password lama wajib diisi, password baru minimal 8 karakter dan harus berbeda dari yang lama.

## Hak akses

| Modul | Admin | Manager | Staff | Supplier |
|---|---|---|---|---|
| Produk dan Kategori (CRUD) | ✔ | ✔ | lihat produk | – |
| Verifikasi Supplier (alasan wajib saat ditolak) | ✔ | – | – | – |
| Restock: buat PO | – | ✔ | – | – |
| Restock: konfirmasi / tolak (alasan wajib) | – | – | – | ✔ |
| Restock: kirim (In Transit) dan bukti foto kedatangan | – | – | – | ✔ |
| Restock: laporan pemeriksaan fisik | – | – | ✔ | – |
| Restock: kembalikan PO (Returned, alasan wajib) dan ajukan refund | – | ✔ | – | – |
| Barang masuk: buat dari PO | – | – | ✔ | – |
| Barang keluar: buat, edit, hapus (Pending), Kirim Barang (Shipped) | – | – | ✔ | – |
| Approve / reject transaksi (alasan wajib saat reject) | – | ✔ | – | – |
| Lihat transaksi dan restock | ✔ (hanya lihat) | ✔ | ✔ | milik sendiri |

## Alur dan aturan bisnis

**Siklus PO:** `Pending → Confirmed / Rejected → In Transit → Inspecting → Received / Returned`

1. Manager membuat PO (Pending).
2. Supplier mengonfirmasi, atau menolak dengan alasan wajib (berhenti).
3. Supplier mengubah status menjadi **In Transit** saat barang dikirim.
4. Barang tiba: Supplier mengunggah **bukti foto kedatangan**, status PO menjadi **Inspecting**.
5. Staff Gudang memeriksa fisik barang (jumlah dan kondisi) dan membuat **laporan pemeriksaan**.
6. **Barang sesuai:** Staff membuat Incoming Transaction dari PO (produk dan quantity terisi otomatis), Manager meng-approve, lalu **stok bertambah dan PO otomatis Received** dalam satu transaksi database.
7. **Barang tidak sesuai:** Manager menolak penerimaan atau mengembalikan PO (**Returned**, alasan wajib), stok tidak bertambah. Manager lalu dapat **mengajukan refund** dan membuat PO baru (tombol *Buat PO Baru* menyalin isi PO lama).

**Barang keluar:** `Pending → Approved / Rejected → Shipped`. Stok **belum** berkurang saat Approved. Stok berkurang saat Staff menekan **Kirim Barang (Shipped)**, dan alur selesai.

**Aturan stok:**
- Stok bertambah **hanya** saat Incoming Transaction di-approve Manager.
- Stok berkurang **hanya** saat Outgoing Transaction berstatus Shipped.
- Quantity barang keluar tidak boleh melebihi stok saat dibuat, diedit, dan saat dikirim.
- Satu PO hanya dapat dipakai satu Incoming Transaction yang belum Rejected.
- Incoming Transaction tidak dapat di-approve bila laporan pemeriksaan menyatakan barang tidak sesuai.
- Setiap penolakan (Supplier, PO, Returned, Incoming, Outgoing) wajib disertai alasan.

**Status stok otomatis:** Out of Stock (abu-abu) bila stok 0; Severe (merah) bila 0 < stok ≤ stok minimum; Low (kuning) bila stok minimum < stok ≤ stok Low; Normal (hijau) bila stok > stok Low.

Kategori yang masih punya produk tidak dapat dihapus. Menghapus produk yang masih berstok memunculkan peringatan. SKU dan nama kategori unik; SKU tidak dapat diubah.

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
