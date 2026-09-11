import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarIndicacoes, mem_editarIndicacao, mem_registrarLog, mem_criarDespesa, mem_editarDespesa } from '@/lib/db-memory';
import { ensureIndicacoes } from '@/lib/ensure-equipe';

export async function PUT(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (membro.cargo !== 'gerente' && membro.cargo !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  await ensureIndicacoes();
  const { id, comissao_valor } = await req.json();
  const valor = parseFloat(comissao_valor);
  if (!id || !valor || valor <= 0) return NextResponse.json({ error: 'Valor de comissão inválido' }, { status: 400 });

  const atual = mem_listarIndicacoes().find(x => x.id === id);
  if (!atual) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });

  const nomeIndicado = `${atual.nome} ${atual.sobrenome || ''}`.trim();
  const descricao = `Comissão — indicação de ${nomeIndicado} por Dr(a). ${atual.medico_nome}`;
  const dataHoje = new Date().toISOString().slice(0, 10);

  const d = (atual.comissao_despesa_id && mem_editarDespesa(atual.comissao_despesa_id, { valor, descricao, data: dataHoje }))
    || mem_criarDespesa({ tipo: 'saida', categoria: 'Cashback', descricao, valor, data: dataHoje });

  const i = mem_editarIndicacao(id, { comissao_valor: valor, comissao_paga: true, comissao_despesa_id: d.id });
  if (!i) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  try { const { sbSaveIndicacao } = await import('@/lib/supabase-sync'); await sbSaveIndicacao(i); } catch (e) { console.error('[PORTAL-COMISSAO] save error:', e); }

  const ator = `${membro.nome} (${membro.cargo})`;
  mem_registrarLog(ator, atual.comissao_paga ? 'Editou comissão de indicação (portal)' : 'Lançou comissão de indicação (portal)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

  return NextResponse.json(i);
}
