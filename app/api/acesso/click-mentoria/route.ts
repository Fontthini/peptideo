import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarToken, mem_registrarCliqueMentoria, mem_registrarClique } from '@/lib/db-memory';
import { reloadFromSupabase, ensureConfig } from '@/lib/ensure-equipe';

// So recarrega se o token nao estiver na memoria ainda (instancia fria) —
// mesmo padrao usado no tracking de produtos/heartbeat.
export async function POST(req: NextRequest) {
  const { token } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

  let medico = mem_buscarToken(token);
  if (!medico) {
    await reloadFromSupabase();
    medico = mem_buscarToken(token);
  }
  if (!medico) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const nome = `${medico.nome} ${medico.sobrenome || ''}`.trim();
  mem_registrarCliqueMentoria(medico.id, nome);
  await ensureConfig();
  mem_registrarClique('mentoria');
  return NextResponse.json({ ok: true });
}
