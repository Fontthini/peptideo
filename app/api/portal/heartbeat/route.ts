import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_registrarAcesso } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function POST(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const m = mem_registrarAcesso(membro.id);
  if (!m) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });

  try {
    const { sbSaveMembro } = await import('@/lib/supabase-sync');
    await sbSaveMembro(m);
  } catch (e) {
    console.error('[HEARTBEAT] Supabase save error:', e);
  }

  return NextResponse.json({ ok: true });
}
