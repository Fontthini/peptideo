import { NextRequest, NextResponse } from 'next/server';
import { mem_listar, mem_deletarCadastro } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  return key === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const { listarCadastros, initDB } = await import('@/lib/db');
      await initDB();
      return NextResponse.json(await listarCadastros());
    } catch (e) {
      console.error('[DB]', e);
    }
  }

  return NextResponse.json(mem_listar());
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const ok = mem_deletarCadastro(id);
  if (!ok) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
