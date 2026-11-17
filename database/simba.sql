-- SIMBA - Sistem Manajemen Bahan Bangunan (PostgreSQL)
-- Jalankan di pgAdmin: pilih database simba_db > Query Tool > buka file ini > Execute (F5)
-- Semua akun seed memakai password: password123

DROP TABLE IF EXISTS restock_items, restock_orders, transaction_items, transactions, products, categories, users CASCADE;

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL CHECK (role IN ('admin','manager','staff','supplier')),
  status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (status IN ('pending','approved','rejected')),
  company VARCHAR(150),
  phone VARCHAR(30),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  image VARCHAR(255)
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  sku VARCHAR(50) NOT NULL UNIQUE,
  category_id INT NOT NULL REFERENCES categories(id),
  description TEXT NOT NULL,
  buy_price NUMERIC(14,2) NOT NULL,
  sell_price NUMERIC(14,2) NOT NULL,
  min_stock INT NOT NULL,
  low_stock INT NOT NULL,
  stock INT NOT NULL DEFAULT 0 CHECK (stock >= 0),
  unit VARCHAR(20) NOT NULL,
  rack_location VARCHAR(50) NOT NULL,
  image VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_low_gt_min CHECK (low_stock > min_stock)
);

CREATE TABLE restock_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(30) NOT NULL UNIQUE,
  supplier_id INT NOT NULL REFERENCES users(id),
  order_date DATE NOT NULL,
  expected_date DATE NOT NULL,
  notes TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','rejected','in_transit','received')),
  status_note TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE restock_items (
  id SERIAL PRIMARY KEY,
  restock_id INT NOT NULL REFERENCES restock_orders(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  trx_number VARCHAR(30) NOT NULL UNIQUE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('incoming','outgoing')),
  trx_date DATE NOT NULL,
  po_id INT REFERENCES restock_orders(id),
  supplier_id INT REFERENCES users(id),
  customer_name VARCHAR(150),
  notes TEXT NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected','shipped')),
  reject_reason TEXT,
  created_by INT NOT NULL REFERENCES users(id),
  approved_by INT REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE transaction_items (
  id SERIAL PRIMARY KEY,
  transaction_id INT NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(id),
  quantity INT NOT NULL CHECK (quantity > 0)
);

-- Akun awal (Admin, Manager, Staff hanya dibuat lewat file ini)
INSERT INTO users (name, email, password, role, status, company, phone) VALUES
('Admin SIMBA',   'admin@simba.test',    '$2b$10$55Zu4qTr9a8OZcBc2TOTqO4WcjhGiVORCBQ2yWYZkslhSidrpPAkm', 'admin',    'approved', NULL, NULL),
('Budi Manajer',  'manager@simba.test',  '$2b$10$55Zu4qTr9a8OZcBc2TOTqO4WcjhGiVORCBQ2yWYZkslhSidrpPAkm', 'manager',  'approved', NULL, NULL),
('Sari Staff',    'staff@simba.test',    '$2b$10$55Zu4qTr9a8OZcBc2TOTqO4WcjhGiVORCBQ2yWYZkslhSidrpPAkm', 'staff',    'approved', NULL, NULL),
('Andi Supplier', 'supplier@simba.test', '$2b$10$55Zu4qTr9a8OZcBc2TOTqO4WcjhGiVORCBQ2yWYZkslhSidrpPAkm', 'supplier', 'approved', 'PT Semen Nusantara', '081200000001'),
('Rina Supplier', 'pending@simba.test',  '$2b$10$55Zu4qTr9a8OZcBc2TOTqO4WcjhGiVORCBQ2yWYZkslhSidrpPAkm', 'supplier', 'pending',  'CV Baja Makmur',     '081200000002');

INSERT INTO categories (name, description, image) VALUES
('Semen & Perekat', 'Semen, mortar instan, dan perekat keramik',  '/placeholder.svg'),
('Besi & Baja',     'Besi beton, wiremesh, dan baja ringan',       '/placeholder.svg'),
('Cat & Pelapis',   'Cat tembok, cat kayu, dan pelapis anti bocor','/placeholder.svg'),
('Pipa & Fitting',  'Pipa PVC, fitting, dan perlengkapan air',     '/placeholder.svg');

INSERT INTO products (name, sku, category_id, description, buy_price, sell_price, min_stock, low_stock, stock, unit, rack_location, image) VALUES
('Semen Portland 50 kg',   'SMN-001', 1, 'Semen portland serbaguna kemasan 50 kg', 58000,  65000,  20, 50, 120, 'sak',    'A-01', '/placeholder.svg'),
('Mortar Instan 40 kg',    'SMN-002', 1, 'Mortar instan untuk plesteran',          52000,  60000,  15, 40, 35,  'sak',    'A-02', '/placeholder.svg'),
('Besi Beton 10 mm',       'BSI-010', 2, 'Besi beton ulir 10 mm panjang 12 m',     78000,  90000,  30, 80, 12,  'batang', 'B-01', '/placeholder.svg'),
('Wiremesh M8',            'BSI-020', 2, 'Wiremesh M8 lembaran 2.1 x 5.4 m',       410000, 470000, 5,  15, 0,   'lembar', 'B-02', '/placeholder.svg'),
('Cat Tembok Putih 25 kg', 'CAT-001', 3, 'Cat tembok interior warna putih',        520000, 590000, 5,  12, 40,  'pail',   'C-01', '/placeholder.svg'),
('Pipa PVC 3 inci',        'PIP-003', 4, 'Pipa PVC AW 3 inci panjang 4 m',         65000,  80000,  20, 50, 70,  'batang', 'D-01', '/placeholder.svg');
