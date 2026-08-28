import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarProdutos, mem_editarProduto, mem_registrarLog } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

// Leitura: estatisticas de produtos (views/cart_adds) para o Dashboard, e
// dados de estoque para a aba Estoque do portal (gerente/superadmin).
export async function GET(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['gerente', 'superadmin'].includes(membro.cargo)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  return NextResponse.json(mem_listarProdutos());
}

// Edicao restrita a estoque_inicial/custo — a aba Estoque do portal so
// mexe nesses dois campos, o resto do produto (nome, preco, categoria...)
// continua editavel so pelo admin.
export async function PUT(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro || !['gerente', 'superadmin'].includes(membro.cargo)) {
    return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  }
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const atual = mem_listarProdutos().find(x => x.id === data.id);
  if (!atual) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  const p = mem_editarProduto(data.id, {
    estoque_inicial: data.estoque_inicial !== undefined ? (parseFloat(data.estoque_inicial) || 0) : atual.estoque_inicial,
    custo: data.custo !== undefined ? (parseFloat(data.custo) || 0) : atual.custo,
  });
  if (!p) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Atualizou estoque (portal)', p.nome);
  return NextResponse.json(p);
}
