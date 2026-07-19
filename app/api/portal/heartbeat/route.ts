import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_registrarAcesso } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

// Só recarrega o Supabase inteiro se o token não estiver na memória ainda
// (instância fria) — evita bater as 11 tabelas a cada ping de 45s.
export async function POST(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  let membro = mem_buscarMembroPorToken(token);
  if (!membro) {
    await reloadFromSupabase();
    membro = mem_buscarMembroPorToken(token);
  }
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
