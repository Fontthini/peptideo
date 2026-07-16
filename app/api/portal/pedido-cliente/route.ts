import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarToken, mem_criarPedido } from '@/lib/db-memory';

export async function POST(req: NextRequest) {
  try {
    const { client_token, itens, total } = await req.json();
    if (!client_token || !itens?.length) {
      return NextResponse.json({ error: 'Dados incompletos' }, { status: 400 });
    }

    const cadastro = mem_buscarToken(client_token);
    if (!cadastro) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

    const produto_nome = itens.length === 1
      ? itens[0].nome
      : `${itens.length} produtos`;

    const pedido = mem_criarPedido({
      cadastro_id: cadastro.id,
      cadastro_nome: `${cadastro.nome}${cadastro.sobrenome ? ' ' + cadastro.sobrenome : ''}`,
      cadastro_email: cadastro.email,
      cadastro_whatsapp: cadastro.whatsapp,
      produto_nome,
      preco: total,
      itens,
      vendedor_id: cadastro.vendedor_id ?? undefined,
      status: 'em_aberto',
    });

    return NextResponse.json({ ok: true, pedido_id: pedido.id });
  } catch (err) {
    console.error('[PEDIDO-CLIENTE]', err);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
