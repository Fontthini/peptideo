import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import {
  mem_buscarId, mem_listarProdutos, mem_criarIndicacao, mem_editarIndicacao, mem_deletarIndicacao,
  mem_criarPedido, mem_deletarPedido, mem_criarDespesa, mem_registrarLog, type Pedido,
} from '@/lib/db-memory';
import { ensureCadastros } from '@/lib/ensure-equipe';
import { aplicarPedidoPago } from '@/lib/pedido-side-effects';

// Cadastro consolidado de paciente: recebe tudo que o wizard coleta de uma
// vez só (quem indicou, receita, dados pessoais, produto/pedido, desconto,
// comprovante, documentos, cashback%) e grava em sequência — Indicação →
// Pedido (já com o desconto aplicado, e já "pago" se veio comprovante) →
// comissão do médico indicador, se houver cashback. Não é uma transação de
// banco de verdade (o projeto não tem isso), mas desfaz o que já foi criado
// se uma etapa no meio falhar, pra não deixar registro pela metade.
export async function POST(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await ensureCadastros();

  const {
    medico_id, receita, nome, sobrenome, whatsapp, email, endereco, cpf, rg, cidade, estado,
    produto_id, quantidade, desconto, comprovante_pagamento, documentos, cashback_percentual, obs,
  } = await req.json();

  if (!medico_id || !nome || !whatsapp) {
    return NextResponse.json({ error: 'Quem indicou, nome e WhatsApp são obrigatórios' }, { status: 400 });
  }
  if (!produto_id) {
    return NextResponse.json({ error: 'Produto é obrigatório' }, { status: 400 });
  }
  const medico = mem_buscarId(medico_id);
  if (!medico) return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });
  const produto = mem_listarProdutos().find(p => p.id === produto_id);
  if (!produto) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  const qtd = Math.max(1, parseInt(String(quantidade), 10) || 1);
  const precoTotal = produto.preco * qtd;
  const descontoValor = Math.min(Math.max(0, parseFloat(desconto) || 0), precoTotal);
  const valorPago = precoTotal - descontoValor;
  const cashbackPct = Math.min(Math.max(0, parseFloat(cashback_percentual) || 0), 100);
  const comissaoValor = cashbackPct > 0 ? Math.round(valorPago * (cashbackPct / 100) * 100) / 100 : 0;
  const categoria: 'normal' | 'cortesia' = (valorPago === 0 && comissaoValor === 0) ? 'cortesia' : 'normal';

  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  const nomeCompleto = `${nome} ${sobrenome || ''}`.trim();

  const indicacao = mem_criarIndicacao({
    medico_id, medico_nome: `${medico.nome} ${medico.sobrenome || ''}`.trim(),
    nome, sobrenome: sobrenome || '', whatsapp, email: email || '', endereco: endereco || '',
    tipo: 'paciente', obs: obs || '',
    cpf: cpf || null, rg: rg || null, cidade: cidade || null, estado: estado || null,
    receita: receita || null, documentos: Array.isArray(documentos) ? documentos : [],
    comprovante_pagamento: comprovante_pagamento || null, desconto: descontoValor, categoria,
  });

  let pedidoCriado: Pedido | null = null;
  try {
    const p = mem_criarPedido({
      cadastro_id: medico.id,
      cadastro_nome: `${medico.nome} ${medico.sobrenome || ''}`.trim(),
      cadastro_email: medico.email,
      cadastro_whatsapp: medico.whatsapp,
      indicacao_id: indicacao.id,
      paciente_nome: nomeCompleto,
      produto_nome: produto.nome,
      preco: valorPago,
      itens: [{ nome: produto.nome, preco: produto.preco, quantidade: qtd }],
      vendedor_id: medico.vendedor_id || undefined,
      status: comprovante_pagamento ? 'pago' : 'em_atendimento',
      obs: '',
    });
    pedidoCriado = p;
    mem_registrarLog(ator, 'Cadastrou paciente manualmente (completo)', `${nomeCompleto} (indicado por ${medico.nome}) — ${produto.nome} — R$ ${valorPago.toFixed(2)}`);

    if (p.status === 'pago') {
      await aplicarPedidoPago(p, ator);
    }

    if (comissaoValor > 0) {
      const descricao = `Comissão — indicação de ${nomeCompleto} por Dr(a). ${medico.nome}`;
      const d = mem_criarDespesa({ tipo: 'saida', categoria: 'Cashback', descricao, valor: comissaoValor, data: new Date().toISOString().slice(0, 10) });
      mem_editarIndicacao(indicacao.id, { comissao_valor: comissaoValor, comissao_paga: true, comissao_despesa_id: d.id });
      mem_registrarLog(ator, 'Lançou comissão de indicação', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
    }

    const indicacaoFinal = { ...indicacao, comissao_valor: comissaoValor > 0 ? comissaoValor : indicacao.comissao_valor, comissao_paga: comissaoValor > 0 ? true : indicacao.comissao_paga };
    try { const { sbSaveIndicacao } = await import('@/lib/supabase-sync'); await sbSaveIndicacao(indicacaoFinal); } catch (e) { console.error('[PACIENTE-COMPLETO] sync error:', e); }

    return NextResponse.json({ indicacao: indicacaoFinal, pedido: p }, { status: 201 });
  } catch (e) {
    console.error('[PACIENTE-COMPLETO] erro, desfazendo o que já foi criado:', e);
    if (pedidoCriado) {
      try { const { sbDeletePedido } = await import('@/lib/supabase-sync'); await sbDeletePedido(pedidoCriado.id); } catch { /* ignora */ }
      mem_deletarPedido(pedidoCriado.id);
    }
    try { const { sbDeleteIndicacao } = await import('@/lib/supabase-sync'); await sbDeleteIndicacao(indicacao.id); } catch { /* ignora */ }
    mem_deletarIndicacao(indicacao.id);
    return NextResponse.json({ error: 'Erro ao concluir o cadastro. Nada foi salvo.' }, { status: 500 });
  }
}
