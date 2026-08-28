import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarPedidosPorVendedor, mem_listarPedidos, mem_atualizarPedido, mem_registrarLog, mem_buscarId, mem_criarPedido, mem_criarDespesa, mem_deletarDespesa, mem_atualizarFunil, mem_listarIndicacoes } from '@/lib/db-memory';
import { reloadFromSupabase, ensureCadastros, ensureIndicacoes } from '@/lib/ensure-equipe';

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

  const { cadastro_id, indicacao_id, itens, status } = await req.json();
  if ((!cadastro_id && !indicacao_id) || !Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Médico ou paciente e ao menos um produto são obrigatórios' }, { status: 400 });
  }

  let pacienteNome: string | undefined;
  let medicoIdReal = cadastro_id as string | undefined;
  if (indicacao_id) {
    await ensureIndicacoes();
    const indicacao = mem_listarIndicacoes().find(i => i.id === indicacao_id);
    if (!indicacao) return NextResponse.json({ error: 'Paciente não encontrado' }, { status: 404 });
    if (indicacao.tipo === 'medico') return NextResponse.json({ error: 'Essa indicação é de um médico, não de um paciente' }, { status: 400 });
    medicoIdReal = indicacao.medico_id;
    pacienteNome = `${indicacao.nome} ${indicacao.sobrenome || ''}`.trim();
  }
  const cadastro = mem_buscarId(medicoIdReal || '');
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
    cadastro_id: cadastro.id,
    cadastro_nome: `${cadastro.nome} ${cadastro.sobrenome || ''}`.trim(),
    cadastro_email: cadastro.email,
    cadastro_whatsapp: cadastro.whatsapp,
    indicacao_id: indicacao_id || null,
    paciente_nome: pacienteNome,
    produto_nome: itensValidos[0].nome,
    preco: precoTotal,
    itens: itensValidos,
    vendedor_id: cadastro.vendedor_id || undefined,
    status: statusInicial,
    obs: '',
  });
  try { const { sbSavePedido } = await import('@/lib/supabase-sync'); await sbSavePedido(p); } catch (e) { console.error('[PORTAL-PEDIDO] save error:', e); }
  const ator = `${membro.nome} (${membro.cargo})`;
  const nomeCliente = pacienteNome ? `${pacienteNome} (indicado por ${cadastro.nome})` : p.cadastro_nome;
  mem_registrarLog(ator, 'Criou pedido manualmente (portal)', `${nomeCliente} — ${p.produto_nome} — R$ ${p.preco.toFixed(2)}`);

  if (p.status === 'pago') {
    const d = mem_criarDespesa({
      tipo: 'entrada', categoria: 'PEDIDO PAGO',
      descricao: `Pedido pago — ${nomeCliente} (${p.produto_nome})`,
      valor: p.preco, data: new Date().toISOString().slice(0, 10),
    });
    mem_registrarLog(ator, 'Lançou entrada automática (pedido pago)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
    if (cadastro.funil_status !== 'cliente') {
      mem_atualizarFunil(cadastro.id, 'cliente');
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

  const statusAnterior = mem_listarPedidos().find(p => p.id === id)?.status;
  const pedido = mem_atualizarPedido(id, { status, obs });
  if (!pedido) return NextResponse.json({ error: 'Pedido não encontrado' }, { status: 404 });
  const ator = `${membro.nome} (${membro.cargo})`;
  mem_registrarLog(ator, 'Atualizou pedido', `${pedido.cadastro_nome} — ${pedido.produto_nome} (${pedido.status})`);

  // Mesmo fluxo automatico do admin: ao marcar como pago, lanca entrada no
  // Financeiro e avanca o lead pra "cliente"; ao sair de pago, desfaz a entrada.
  if (pedido.status === 'pago' && statusAnterior !== 'pago') {
    const d = mem_criarDespesa({
      tipo: 'entrada', categoria: 'PEDIDO PAGO',
      descricao: `Pedido pago — ${pedido.cadastro_nome} (${pedido.produto_nome})`,
      valor: pedido.preco, data: new Date().toISOString().slice(0, 10),
    });
    mem_atualizarPedido(pedido.id, { despesa_id: d.id });
    mem_registrarLog(ator, 'Lançou entrada automática (pedido pago)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

    const cadastro = mem_buscarId(pedido.cadastro_id);
    if (cadastro && cadastro.funil_status !== 'cliente') {
      mem_atualizarFunil(pedido.cadastro_id, 'cliente');
      mem_registrarLog(ator, 'Lead avançou automaticamente no funil', `${pedido.cadastro_nome} → cliente`);
    }
  }
  if (statusAnterior === 'pago' && pedido.status !== 'pago' && pedido.despesa_id) {
    mem_deletarDespesa(pedido.despesa_id);
    mem_registrarLog(ator, 'Removeu entrada automática (pedido não é mais pago)', `${pedido.cadastro_nome} — ${pedido.produto_nome} — R$ ${pedido.preco.toFixed(2)}`);
    mem_atualizarPedido(pedido.id, { despesa_id: null });
  }

  return NextResponse.json(pedido);
}
