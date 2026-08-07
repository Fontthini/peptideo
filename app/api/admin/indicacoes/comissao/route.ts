import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarIndicacoes, mem_editarIndicacao, mem_registrarLog, mem_criarDespesa } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function PUT(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadFromSupabase();
  const { id, comissao_valor } = await req.json();
  const valor = parseFloat(comissao_valor);
  if (!id || !valor || valor <= 0) return NextResponse.json({ error: 'Valor de comissão inválido' }, { status: 400 });

  const atual = mem_listarIndicacoes().find(x => x.id === id);
  if (!atual) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  if (atual.comissao_paga) return NextResponse.json({ error: 'Comissão já foi lançada para esta indicação.' }, { status: 409 });

  const i = mem_editarIndicacao(id, { comissao_valor: valor, comissao_paga: true });
  if (!i) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  try { const { sbSaveIndicacao } = await import('@/lib/supabase-sync'); await sbSaveIndicacao(i); } catch (e) { console.error('[COMISSAO] save error:', e); }

  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  const nomeIndicado = `${i.nome} ${i.sobrenome || ''}`.trim();
  const d = mem_criarDespesa({
    tipo: 'saida', categoria: 'Comissão',
    descricao: `Comissão — indicação de ${nomeIndicado} por Dr(a). ${i.medico_nome}`,
    valor, data: new Date().toISOString().slice(0, 10),
  });
  mem_registrarLog(ator, 'Lançou comissão de indicação', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

  return NextResponse.json(i);
}
