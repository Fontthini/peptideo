import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_buscarId, mem_editarCadastro, mem_registrarLog, mem_criarDespesa, mem_editarDespesa } from '@/lib/db-memory';
import { ensureCadastros } from '@/lib/ensure-equipe';

// Espelha /api/admin/cadastros/comissao — mesma regra (comissão de médico
// que indicou outro médico), só que autenticada por token de membro em vez
// da chave de admin, pra gerente poder lançar isso pelo portal também.
export async function PUT(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (membro.cargo !== 'gerente' && membro.cargo !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  await ensureCadastros();
  const { id, comissao_valor } = await req.json();
  const valor = parseFloat(comissao_valor);
  if (!id || !valor || valor <= 0) return NextResponse.json({ error: 'Valor de comissão inválido' }, { status: 400 });

  const atual = mem_buscarId(id);
  if (!atual) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });

  const nomeMedico = `${atual.nome} ${atual.sobrenome || ''}`.trim();
  const descricao = atual.indicado_por_medico_nome
    ? `Comissão — cadastro de Dr(a). ${nomeMedico} (indicado por ${atual.indicado_por_medico_nome})`
    : `Comissão — cadastro de Dr(a). ${nomeMedico}`;
  const dataHoje = new Date().toISOString().slice(0, 10);

  const d = (atual.comissao_despesa_id && mem_editarDespesa(atual.comissao_despesa_id, { valor, descricao, data: dataHoje }))
    || mem_criarDespesa({ tipo: 'saida', categoria: 'Cashback', descricao, valor, data: dataHoje });

  const c = mem_editarCadastro(id, { comissao_valor: valor, comissao_paga: true, comissao_despesa_id: d.id });
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });

  const ator = `${membro.nome} (${membro.cargo})`;
  mem_registrarLog(ator, atual.comissao_paga ? 'Editou comissão de cadastro (portal)' : 'Lançou comissão de cadastro (portal)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

  return NextResponse.json(c);
}
