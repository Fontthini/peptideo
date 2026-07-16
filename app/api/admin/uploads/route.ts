import { NextRequest, NextResponse } from 'next/server';
import { readdirSync, existsSync } from 'fs';
import { join } from 'path';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const dir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(dir)) return NextResponse.json([]);
    const files = readdirSync(dir)
      .filter(f => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f))
      .map(f => `/uploads/${f}`)
      .reverse();
    return NextResponse.json(files);
  } catch {
    return NextResponse.json([]);
  }
}
