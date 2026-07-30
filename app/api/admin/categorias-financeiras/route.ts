import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid } from '@/lib/admin-auth';
import { mem_listarCategoriasFinanceiras, mem_adicionarCategoriaFinanceira, mem_deletarCategoriaFinanceira } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { sbListarCategoriasFinanceiras } = await import('@/lib/supabase-sync');
    const categorias = await sbListarCategoriasFinanceiras();
    return NextResponse.json(categorias);
  } catch (e) {
    console.error('[CATEGORIAS-FINANCEIRAS] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarCategoriasFinanceiras());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const ok = mem_adicionarCategoriaFinanceira(nome.trim());
  if (!ok) return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { nome } = await req.json();
  const ok = mem_deletarCategoriaFinanceira(nome);
  if (!ok) return NextResponse.json({ error: 'Categoria não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
