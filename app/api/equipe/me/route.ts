import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken } from '@/lib/db-memory';

async function ensureEquipe() {
  const g = global as Record<string, unknown>;
  if (!g.__equipe__ || (g.__equipe__ as unknown[]).length === 0) {
    try { const { loadAllFromSupabase } = await import('@/lib/supabase-sync'); await loadAllFromSupabase(); } catch {}
  }
}

export async function GET(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { senha: _s, token_acesso: _t, ...safe } = membro;
  return NextResponse.json(safe);
}
