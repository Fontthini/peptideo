import { NextRequest, NextResponse } from 'next/server';
import { mem_getConfig, mem_setConfig } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json(mem_getConfig());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();
  return NextResponse.json(mem_setConfig(data));
}
