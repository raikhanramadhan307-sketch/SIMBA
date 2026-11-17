// Membuat database (jika belum ada), tabel, dan data awal dari database/simba.sql
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const cfg = {
  host: process.env.DB_HOST || 'localhost',
  port: +(process.env.DB_PORT || 5432),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};
const dbName = process.env.DB_NAME || 'simba_db';

(async () => {
  const admin = new Client({ ...cfg, database: 'postgres' });
  await admin.connect();
  const exists = await admin.query('SELECT 1 FROM pg_database WHERE datname = $1', [dbName]);
  if (!exists.rowCount) await admin.query(`CREATE DATABASE "${dbName}"`);
  await admin.end();

  const db = new Client({ ...cfg, database: dbName });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'database', 'simba.sql'), 'utf8'));
  await db.end();
  console.log(`Database ${dbName} siap. Login dengan password: password123`);
})().catch((e) => { console.error('Gagal:', e.message); process.exit(1); });
