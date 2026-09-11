import { mem_criarDespesa, mem_deletarDespesa, mem_atualizarPedido, mem_buscarId, mem_atualizarFunil, mem_registrarLog, mem_listarIndicacoes, mem_editarIndicacao, type Pedido } from './db-memory';

// Efeito automático de "pedido virou pago": lança uma entrada no Financeiro
// e avança o médico dono do pedido pra "cliente" no funil, se ainda não
// estiver lá. Extraído pra um lugar só porque essa mesma regra precisa
// rodar em 3 pontos: POST e PATCH de /api/admin/pedidos, e agora também
// no cadastro consolidado de paciente/médico (pivot do cadastro unificado).
export async function aplicarPedidoPago(pedido: Pedido, ator: string): Promise<void> {
  const nomeCliente = pedido.paciente_nome ? `${pedido.paciente_nome} (indicado por ${pedido.cadastro_nome})` : pedido.cadastro_nome;
  const d = mem_criarDespesa({
    tipo: 'entrada', categoria: 'PEDIDO PAGO',
    descricao: `Pedido pago — ${nomeCliente} (${pedido.produto_nome})`,
    valor: pedido.preco, data: new Date().toISOString().slice(0, 10),
  });
  const pAtualizado = mem_atualizarPedido(pedido.id, { despesa_id: d.id });
  // mem_atualizarPedido ja dispara um persist() em segundo plano (after()), mas
  // esse vinculo despesa_id e critico pro Financeiro e ja vazou silenciosamente
  // antes (pedido fica "pago" pra sempre sem a despesa correspondente aparecer
  // achavel por busca reversa) — por isso aqui a gravacao no Supabase e refeita
  // de forma explicita e aguardada, sem depender só do after() em segundo plano.
  if (pAtualizado && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    try {
      const { sbSavePedido } = await import('./supabase-sync');
      await sbSavePedido(pAtualizado);
    } catch (e) {
      console.error('[PEDIDO-SIDE-EFFECTS] falha ao persistir despesa_id no pedido:', e);
    }
  }
  mem_registrarLog(ator, 'Lançou entrada automática (pedido pago)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);

  const cadastro = mem_buscarId(pedido.cadastro_id);
  if (cadastro && cadastro.funil_status !== 'cliente') {
    mem_atualizarFunil(pedido.cadastro_id, 'cliente');
    mem_registrarLog(ator, 'Lead avançou automaticamente no funil', `${pedido.cadastro_nome} → cliente`);
  }

  // Se o pedido e de um paciente indicado, o status da propria indicacao
  // tambem precisa avancar pra "pago" — sem isso ela fica com um status
  // antigo (em_atendimento, ou ate cancelado) pra sempre, mesmo depois de
  // realmente ter comprado, o que faz Contatos mostrar uma situacao que
  // ja nao e real.
  if (pedido.indicacao_id) {
    const indicacao = mem_listarIndicacoes().find(i => i.id === pedido.indicacao_id);
    if (indicacao && indicacao.status !== 'pago') {
      const iAtualizada = mem_editarIndicacao(indicacao.id, { status: 'pago' });
      if (iAtualizada && process.env.NEXT_PUBLIC_SUPABASE_URL) {
        try {
          const { sbSaveIndicacao } = await import('./supabase-sync');
          await sbSaveIndicacao(iAtualizada);
        } catch (e) {
          console.error('[PEDIDO-SIDE-EFFECTS] falha ao persistir status da indicacao:', e);
        }
      }
      mem_registrarLog(ator, 'Indicação avançou automaticamente pra pago', `${indicacao.nome} ${indicacao.sobrenome || ''}`.trim());
    }
  }
}

// Efeito inverso: quando um pedido pago deixa de ser pago (ex: cancelado),
// desfaz a entrada automática lançada acima — senão o Financeiro fica com
// receita de uma venda que não está mais confirmada.
export function reverterPedidoPago(pedido: Pedido, ator: string): void {
  if (!pedido.despesa_id) return;
  mem_deletarDespesa(pedido.despesa_id);
  mem_registrarLog(ator, 'Removeu entrada automática (pedido não é mais pago)', `${pedido.cadastro_nome} — ${pedido.produto_nome} — R$ ${pedido.preco.toFixed(2)}`);
  mem_atualizarPedido(pedido.id, { despesa_id: null });
}
