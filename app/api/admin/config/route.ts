import { NextRequest, NextResponse } from 'next/server';
import { mem_getConfig, mem_setConfig } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_getConfig());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();
  const updated = mem_setConfig(data);
  try {
    const { sbSaveConfig } = await import('@/lib/supabase-sync');
    await sbSaveConfig(updated);
  } catch (e) {
    console.error('[CONFIG] Supabase save error:', e);
  }
  return NextResponse.json(updated);
}
