import { NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { getUser } from '@/lib/auth';

const EXT = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export async function POST(req) {
  const user = await getUser();
  if (!user || user.role === 'supplier') return NextResponse.json({ error: 'Tidak diizinkan' }, { status: 403 });
  const file = (await req.formData()).get('file');
  if (!file || typeof file === 'string') return NextResponse.json({ error: 'File tidak ditemukan' }, { status: 400 });
  const ext = EXT[file.type];
  if (!ext) return NextResponse.json({ error: 'Format gambar harus JPG, PNG, atau WEBP' }, { status: 400 });
  if (file.size > 2 * 1024 * 1024) return NextResponse.json({ error: 'Ukuran gambar maksimal 2 MB' }, { status: 400 });

  const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}${ext}`;
  const dir = path.join(process.cwd(), 'uploads');
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return NextResponse.json({ url: `/api/files/${name}` });
}
