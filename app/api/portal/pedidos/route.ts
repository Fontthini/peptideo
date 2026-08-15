import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarPedidosPorVendedor, mem_listarPedidos, mem_atualizarPedido, mem_registrarLog, mem_buscarId, mem_criarPedido, mem_criarDespesa, mem_atualizarFunil } from '@/lib/db-memory';
import { reloadFromSupabase, ensureCadastros } from '@/lib/ensure-equipe';

const STATUS_VALIDOS = ['em_atendimento', 'negociacao', 'pago', 'cancelado'];

export async function GET(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (membro.cargo === 'vendedor') {
    return NextResponse.json(mem_listarPedidosPorVendedor(membro.id));
  }
  // gerente/superadmin vê todos
  if (membro.cargo === 'gerente' || membro.cargo === 'superadmin') {
    return NextResponse.json(mem_listarPedidos());
  }
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (membro.cargo !== 'gerente' && membro.cargo !== 'superadmin') {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
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
  try { const { sbSavePedido } = await import('@/lib/supabase-sync'); await sbSavePedido(p); } catch (e) { console.error('[PORTAL-PEDIDO] save error:', e); }
  const ator = `${membro.nome} (${membro.cargo})`;
  mem_registrarLog(ator, 'Criou pedido manualmente (portal)', `${p.cadastro_nome} — ${p.produto_nome} — R$ ${p.preco.toFixed(2)}`);

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
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { id, status, obs } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const pedido = mem_atualizarPedido(id, { status, obs });
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Atualizou pedido', `${pedido.cadastro_nome} — ${pedido.produto_nome} (${pedido.status})`);
  return NextResponse.json(pedido);
}
