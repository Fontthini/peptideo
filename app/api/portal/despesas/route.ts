import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarDespesas } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

// Somente leitura — gerente/superadmin do portal podem visualizar o
// financeiro, mas nao criar/editar/excluir (isso continua so no /admin).
export async function GET(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['gerente', 'superadmin'].includes(membro.cargo)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  try {
    const { sbListarDespesas } = await import('@/lib/supabase-sync');
    const despesas = await sbListarDespesas();
    return NextResponse.json(despesas);
  } catch (e) {
    console.error('[PORTAL-DESPESAS] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarDespesas());
}
