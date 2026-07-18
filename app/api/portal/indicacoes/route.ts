import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarIndicacoes, mem_listarIndicacoesPorMedicos, mem_listar } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function GET(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (membro.cargo === 'gerente' || membro.cargo === 'superadmin') {
    return NextResponse.json(mem_listarIndicacoes());
  }
  if (membro.cargo === 'vendedor') {
    const meusMedicosIds = mem_listar().filter(l => l.vendedor_id === membro.id).map(l => l.id);
    return NextResponse.json(mem_listarIndicacoesPorMedicos(meusMedicosIds));
  }
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}
