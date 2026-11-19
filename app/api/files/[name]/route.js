import { readFile } from 'fs/promises';
import path from 'path';

const TYPES = { '.jpg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp' };

export async function GET(_req, { params }) {
  const name = path.basename(params.name);
  try {
    const buf = await readFile(path.join(process.cwd(), 'uploads', name));
    return new Response(buf, {
      headers: { 'Content-Type': TYPES[path.extname(name)] || 'application/octet-stream', 'Cache-Control': 'public, max-age=86400' },
    });
  } catch {
    return new Response('Not found', { status: 404 });
  }
}
