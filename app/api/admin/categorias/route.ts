import { NextRequest, NextResponse } from 'next/server';
import { mem_listarCategorias, mem_adicionarCategoria, mem_deletarCategoria } from '@/lib/db-memory';
import { CATEGORIAS } from '@/lib/produtos';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json({ padrao: CATEGORIAS, custom: mem_listarCategorias() });
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const ok = mem_adicionarCategoria(nome.trim());
  if (!ok) return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { nome } = await req.json();
  const ok = mem_deletarCategoria(nome);
  if (!ok) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
