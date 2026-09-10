import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_buscarId, mem_editarCadastro, mem_registrarLog, mem_criarDespesa, mem_editarDespesa } from '@/lib/db-memory';
import { ensureCadastros } from '@/lib/ensure-equipe';

export async function PUT(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
    || mem_criarDespesa({ tipo: 'saida', categoria: 'Comissão', descricao, valor, data: dataHoje });

  const c = mem_editarCadastro(id, { comissao_valor: valor, comissao_paga: true, comissao_despesa_id: d.id });
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });

  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  mem_registrarLog(ator, atual.comissao_paga ? 'Editou comissão de cadastro' : 'Lançou comissão de cadastro', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

  return NextResponse.json(c);
}
