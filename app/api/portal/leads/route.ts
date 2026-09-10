import { NextRequest, NextResponse } from 'next/server';
import {
  mem_buscarMembroPorToken, mem_listar, mem_criar, mem_buscarEmail, mem_proximoVendedor, mem_atribuirVendedor, mem_registrarLog,
  mem_buscarId, mem_listarProdutos, mem_criarPedido, mem_criarDespesa, mem_editarCadastro,
} from '@/lib/db-memory';
import { reloadFromSupabase, reloadCadastros, ensureEquipe, ensureCadastros } from '@/lib/ensure-equipe';
import { aplicarPedidoPago } from '@/lib/pedido-side-effects';

function checkGerente(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  return membro && ['gerente', 'superadmin'].includes(membro.cargo) ? membro : null;
}

export async function GET(req: NextRequest) {
  await Promise.all([reloadCadastros(), ensureEquipe()]);
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const todos = mem_listar();
  if (membro.cargo === 'vendedor') {
    return NextResponse.json(todos);
  }
  return NextResponse.json(todos);
}

export async function POST(req: NextRequest) {
  await reloadFromSupabase();
  await ensureCadastros();
  const membro = checkGerente(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const {
    nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu, indicado_por_medico_id,
    cpf, rg, cidade, estado, documentos,
    produto_id, quantidade, desconto, comprovante_pagamento, cashback_percentual,
  } = await req.json();
  if (!nome || !email || !whatsapp) return NextResponse.json({ error: 'Nome, e-mail e WhatsApp são obrigatórios' }, { status: 400 });
  if (mem_buscarEmail(email)) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

  // "Quem indicou" é opcional aqui: um médico pode ter entrado direto, sem
  // ter sido indicado por outro médico já cadastrado. Espelha POST
  // /api/admin/cadastros — mesma sequência do wizard (dados, produto/pedido
  // com desconto, comissão de quem indicou).
  let indicadoPorNome: string | null = null;
  if (indicado_por_medico_id) {
    const indicador = mem_buscarId(indicado_por_medico_id);
    if (!indicador) return NextResponse.json({ error: 'Médico indicador não encontrado' }, { status: 404 });
    indicadoPorNome = `${indicador.nome} ${indicador.sobrenome || ''}`.trim();
  }

  const c = mem_criar({
    nome, sobrenome: sobrenome || '', email, whatsapp, endereco: endereco || '', crm: crm || null, onde_conheceu: onde_conheceu || null,
    indicado_por_medico_id: indicado_por_medico_id || null, indicado_por_medico_nome: indicadoPorNome,
    cpf: cpf || null, rg: rg || null, cidade: cidade || null, estado: estado || null,
    documentos: Array.isArray(documentos) ? documentos : [],
  });
  const vendedorId = mem_proximoVendedor();
  if (vendedorId) mem_atribuirVendedor(c.id, vendedorId);

  try {
    const { sbSaveCadastro } = await import('@/lib/supabase-sync');
    await sbSaveCadastro({ ...c, vendedor_id: vendedorId || undefined });
  } catch (e) {
    console.error('[PORTAL-LEADS] Supabase save error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('cadastros_email_key') || msg.includes('23505')) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }
  }

  const ator = `${membro.nome} (${membro.cargo})`;
  mem_registrarLog(ator, 'Cadastrou médico manualmente (portal)', `${c.nome} ${c.sobrenome || ''}`.trim());

  let pedidoCriado = null;
  if (produto_id) {
    const produto = mem_listarProdutos().find(p => p.id === produto_id);
    if (produto) {
      const qtd = Math.max(1, parseInt(String(quantidade), 10) || 1);
      const precoTotal = produto.preco * qtd;
      const descontoValor = Math.min(Math.max(0, parseFloat(desconto) || 0), precoTotal);
      const valorPago = precoTotal - descontoValor;
      const cashbackPct = Math.min(Math.max(0, parseFloat(cashback_percentual) || 0), 100);
      const comissaoValor = (indicado_por_medico_id && cashbackPct > 0) ? Math.round(valorPago * (cashbackPct / 100) * 100) / 100 : 0;
      const categoria: 'normal' | 'cortesia' = (valorPago === 0 && comissaoValor === 0) ? 'cortesia' : 'normal';

      const p = mem_criarPedido({
        cadastro_id: c.id, cadastro_nome: `${c.nome} ${c.sobrenome || ''}`.trim(), cadastro_email: c.email, cadastro_whatsapp: c.whatsapp,
        produto_nome: produto.nome, preco: valorPago, itens: [{ nome: produto.nome, preco: produto.preco, quantidade: qtd }],
        vendedor_id: vendedorId || undefined, status: comprovante_pagamento ? 'pago' : 'em_atendimento', obs: '',
      });
      pedidoCriado = p;
      mem_registrarLog(ator, 'Lançou pedido no cadastro do médico (portal)', `${c.nome} — ${produto.nome} — R$ ${valorPago.toFixed(2)}`);

      if (p.status === 'pago') await aplicarPedidoPago(p, ator);

      let comissaoCampos = {};
      if (comissaoValor > 0) {
        const descricao = `Comissão — cadastro de Dr(a). ${c.nome} (indicado por ${indicadoPorNome})`;
        const d = mem_criarDespesa({ tipo: 'saida', categoria: 'Comissão', descricao, valor: comissaoValor, data: new Date().toISOString().slice(0, 10) });
        comissaoCampos = { comissao_valor: comissaoValor, comissao_paga: true, comissao_despesa_id: d.id };
        mem_registrarLog(ator, 'Lançou comissão de cadastro (portal)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
      }
      mem_editarCadastro(c.id, { categoria, ...comissaoCampos });
    }
  }

  const cFinal = mem_buscarId(c.id) || c;
  return NextResponse.json({ ...cFinal, vendedor_id: vendedorId || undefined, pedido: pedidoCriado }, { status: 201 });
}
