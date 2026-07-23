import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_getConfig, mem_setConfig, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
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
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Alterou configurações', Object.keys(data).join(', '));
  return NextResponse.json(updated);
}
