import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarPedidos, mem_atualizarPedido, mem_deletarPedido, mem_registrarLog, mem_criarDespesa, mem_buscarId, mem_atualizarFunil, mem_criarPedido } from '@/lib/db-memory';
import { reloadPedidos, ensurePedidos, ensureCadastros } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

const STATUS_VALIDOS = ['em_atendimento', 'negociacao', 'pago', 'cancelado'];

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  await reloadPedidos();
  return NextResponse.json(mem_listarPedidos());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  await ensureCadastros();
  const { cadastro_id, itens, status } = await req.json();
  if (!cadastro_id || !Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Médico e ao menos um produto são obrigatórios' }, { status: 400 });
  }
  const cadastro = mem_buscarId(cadastro_id);
  if (!cadastro) return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });

  const itensValidos = itens
    .map((it: { nome?: unknown; preco?: unknown; quantidade?: unknown }) => ({
      nome: String(it.nome || '').trim(),
      preco: parseFloat(String(it.preco)) || 0,
      quantidade: parseInt(String(it.quantidade), 10) || 1,
    }))
    .filter((it: { nome: string }) => it.nome);
  if (itensValidos.length === 0) return NextResponse.json({ error: 'Ao menos um produto válido é obrigatório' }, { status: 400 });
  const precoTotal = itensValidos.reduce((s: number, it: { preco: number; quantidade: number }) => s + it.preco * it.quantidade, 0);
  const statusInicial = STATUS_VALIDOS.includes(status) ? status : 'em_atendimento';

  const p = mem_criarPedido({
    cadastro_id,
    cadastro_nome: `${cadastro.nome} ${cadastro.sobrenome || ''}`.trim(),
    cadastro_email: cadastro.email,
    cadastro_whatsapp: cadastro.whatsapp,
    produto_nome: itensValidos[0].nome,
    preco: precoTotal,
    itens: itensValidos,
    vendedor_id: cadastro.vendedor_id || undefined,
    status: statusInicial,
    obs: '',
  });
  try { const { sbSavePedido } = await import('@/lib/supabase-sync'); await sbSavePedido(p); } catch (e) { console.error('[PEDIDO] save error:', e); }
  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  mem_registrarLog(ator, 'Criou pedido manualmente', `${p.cadastro_nome} — ${p.produto_nome} — R$ ${p.preco.toFixed(2)}`);

  // Se o pedido ja nasce pago, dispara o mesmo fluxo de entrada automatica
  // no Financeiro e avanco de funil que o PATCH usa na transicao pra pago.
  if (p.status === 'pago') {
    const d = mem_criarDespesa({
      tipo: 'entrada', categoria: 'PEDIDO PAGO',
      descricao: `Pedido pago — ${p.cadastro_nome} (${p.produto_nome})`,
      valor: p.preco, data: new Date().toISOString().slice(0, 10),
    });
    mem_registrarLog(ator, 'Lançou entrada automática (pedido pago)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
    if (cadastro.funil_status !== 'cliente') {
      mem_atualizarFunil(cadastro_id, 'cliente');
      mem_registrarLog(ator, 'Lead avançou automaticamente no funil', `${p.cadastro_nome} → cliente`);
    }
  }

  return NextResponse.json(p, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  await ensurePedidos();
  const { id, status, obs, preco } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 });

  const statusAnterior = mem_listarPedidos().find(p => p.id === id)?.status;
  const p = mem_atualizarPedido(id, { status, obs, preco: preco !== undefined ? parseFloat(preco) : undefined });
  if (!p) return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
  try { const { sbSavePedido } = await import('@/lib/supabase-sync'); await sbSavePedido(p); } catch (e) { console.error('[PEDIDO] save error:', e); }
  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  mem_registrarLog(ator, 'Atualizou pedido', `${p.cadastro_nome} — ${p.produto_nome} (${p.status}) — R$ ${p.preco.toFixed(2)}`);

  // Ao marcar como pago (e so na transicao, pra nao duplicar em cada edicao
  // seguinte), lanca automaticamente uma entrada no Financeiro.
  if (p.status === 'pago' && statusAnterior !== 'pago') {
    const d = mem_criarDespesa({
      tipo: 'entrada', categoria: 'PEDIDO PAGO',
      descricao: `Pedido pago — ${p.cadastro_nome} (${p.produto_nome})`,
      valor: p.preco, data: new Date().toISOString().slice(0, 10),
    });
    mem_registrarLog(ator, 'Lançou entrada automática (pedido pago)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

    // Avanca o lead no funil de vendas para "cliente" quando a compra e confirmada.
    const cadastro = mem_buscarId(p.cadastro_id);
    if (cadastro && cadastro.funil_status !== 'cliente') {
      mem_atualizarFunil(p.cadastro_id, 'cliente');
      mem_registrarLog(ator, 'Lead avançou automaticamente no funil', `${p.cadastro_nome} → cliente`);
    }
  }

  return NextResponse.json(p);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  await ensurePedidos();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 });
  const alvo = mem_listarPedidos().find(p => p.id === id);
  try {
    const { sbDeletePedido } = await import('@/lib/supabase-sync');
    await sbDeletePedido(id);
  } catch (e) {
    console.error('[PEDIDO] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }
  const ok = mem_deletarPedido(id);
  if (!ok) return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu pedido', alvo ? `${alvo.cadastro_nome} — ${alvo.produto_nome}` : id);
  return NextResponse.json({ ok: true });
}
