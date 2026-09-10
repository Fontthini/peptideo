import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarPedidos, mem_atualizarPedido, mem_deletarPedido, mem_registrarLog, mem_deletarDespesa, mem_buscarId, mem_criarPedido, mem_listarIndicacoes } from '@/lib/db-memory';
import { reloadPedidos, ensurePedidos, ensureCadastros, ensureIndicacoes } from '@/lib/ensure-equipe';
import { aplicarPedidoPago, reverterPedidoPago } from '@/lib/pedido-side-effects';

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
  const { cadastro_id, indicacao_id, itens, status } = await req.json();
  if ((!cadastro_id && !indicacao_id) || !Array.isArray(itens) || itens.length === 0) {
    return NextResponse.json({ error: 'Médico ou paciente e ao menos um produto são obrigatórios' }, { status: 400 });
  }

  // Pedido de paciente: o "dono" continua sendo o medico indicador (para
  // atribuicao de vendedor/funil), mas guardamos qual paciente comprou.
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
  try { const { sbSavePedido } = await import('@/lib/supabase-sync'); await sbSavePedido(p); } catch (e) { console.error('[PEDIDO] save error:', e); }
  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  const nomeCliente = pacienteNome ? `${pacienteNome} (indicado por ${cadastro.nome})` : p.cadastro_nome;
  mem_registrarLog(ator, 'Criou pedido manualmente', `${nomeCliente} — ${p.produto_nome} — R$ ${p.preco.toFixed(2)}`);

  // Se o pedido ja nasce pago, dispara o mesmo fluxo de entrada automatica
  // no Financeiro e avanco de funil que o PATCH usa na transicao pra pago.
  if (p.status === 'pago') {
    await aplicarPedidoPago(p, ator);
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
    await aplicarPedidoPago(p, ator);
  }

  // Ao sair de "pago" (ex: cancelado depois de pago), remove a entrada
  // automatica que tinha sido lancada — senao o Financeiro fica com receita
  // de um pedido que nao esta mais confirmado.
  if (statusAnterior === 'pago' && p.status !== 'pago' && p.despesa_id) {
    reverterPedidoPago(p, ator);
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
  const ator = adminAtorFromKey(req.headers.get('x-admin-key'));
  mem_registrarLog(ator, 'Excluiu pedido', alvo ? `${alvo.cadastro_nome} — ${alvo.produto_nome}` : id);
  if (alvo?.despesa_id) {
    mem_deletarDespesa(alvo.despesa_id);
    mem_registrarLog(ator, 'Removeu entrada automática (pedido excluído)', `${alvo.cadastro_nome} — ${alvo.produto_nome} — R$ ${alvo.preco.toFixed(2)}`);
  }
  return NextResponse.json({ ok: true });
}
