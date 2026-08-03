import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarCliquesMentoria } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

// Somente leitura — gerente/superadmin do portal podem ver quem clicou na
// Mentoria, sem poder excluir (isso continua so no /admin, so superadmin).
export async function GET(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['gerente', 'superadmin'].includes(membro.cargo)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  try {
    const { sbListarCliquesMentoria } = await import('@/lib/supabase-sync');
    const cliques = await sbListarCliquesMentoria();
    return NextResponse.json(cliques);
  } catch (e) {
    console.error('[PORTAL-MENTORIA] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarCliquesMentoria());
}
