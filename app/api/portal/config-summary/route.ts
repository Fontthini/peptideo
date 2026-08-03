import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_getConfig } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

// Recorte somente-leitura da config, para o Dashboard do portal (gerente/superadmin).
export async function GET(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['gerente', 'superadmin'].includes(membro.cargo)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const cfg = mem_getConfig();
  return NextResponse.json({
    emails_enviados_hoje: cfg.emails_enviados_hoje,
    limite_emails_dia: cfg.limite_emails_dia,
    emails_enviados_mes: cfg.emails_enviados_mes,
    limite_emails_mes: cfg.limite_emails_mes,
    cliques_cards: cfg.cliques_cards,
    cliques_cards_hoje: cfg.cliques_cards_hoje,
  });
}
