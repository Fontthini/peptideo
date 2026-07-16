import { NextRequest, NextResponse } from 'next/server';
import { mem_listarProdutos, mem_criarProdutoComPersistencia, mem_deletarProdutoComPersistencia, mem_editarProduto, mem_seedProdutos, mem_duplicarProduto } from '@/lib/db-memory';
import { PRODUTOS } from '@/lib/produtos';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

function isSeeded(id: string) {
  return !isNaN(parseInt(id)) && parseInt(id) <= 20;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  mem_seedProdutos(PRODUTOS);
  return NextResponse.json(mem_listarProdutos().map(p => ({ ...p, custom: !isSeeded(p.id) })));
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();

  if (data.duplicar && data.id) {
    mem_seedProdutos(PRODUTOS);
    const copia = mem_duplicarProduto(data.id);
    if (!copia) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    return NextResponse.json({ ...copia, custom: true }, { status: 201 });
  }

  if (!data.nome || !data.preco) return NextResponse.json({ error: 'Nome e preço obrigatórios' }, { status: 400 });
  const p = mem_criarProdutoComPersistencia({
    nome: data.nome,
    dose: data.dose || '',
    preco: parseFloat(data.preco) || 0,
    categoria: data.categoria || 'Outros',
    descricao: data.descricao || '',
    imagem: data.imagem || '',
    video: data.video || undefined,
    galeria: Array.isArray(data.galeria) ? data.galeria : undefined,
  });
  return NextResponse.json({ ...p, custom: true }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  mem_seedProdutos(PRODUTOS);
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const p = mem_editarProduto(data.id, {
    nome: data.nome,
    dose: data.dose || '',
    preco: parseFloat(data.preco) || 0,
    categoria: data.categoria || 'Outros',
    descricao: data.descricao || '',
    imagem: data.imagem || '',
    video: data.video || undefined,
    galeria: Array.isArray(data.galeria) ? data.galeria : [],
  });
  if (!p) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json({ ...p, custom: !isSeeded(p.id) });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  if (isSeeded(id)) return NextResponse.json({ error: 'Produtos do catálogo não podem ser removidos' }, { status: 403 });
  const ok = mem_deletarProdutoComPersistencia(id);
  if (!ok) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
