import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey } from '@/lib/admin-auth';
import { mem_listarCategoriasBlog, mem_adicionarCategoriaBlog, mem_deletarCategoriaBlog } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json(mem_listarCategoriasBlog());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const ok = mem_adicionarCategoriaBlog(nome.trim());
  if (!ok) return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  const { nome } = await req.json();
  const ok = mem_deletarCategoriaBlog(nome);
  if (!ok) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
