import { NextRequest, NextResponse } from 'next/server';
import { mem_listar, mem_deletarCadastro, mem_editarCadastro } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  return key === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadFromSupabase();
  return NextResponse.json(mem_listar());
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id, nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const c = mem_editarCadastro(id, { nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu });
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  return NextResponse.json(c);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  // Apaga no Supabase primeiro: se falhar (ex: pedidos vinculados a este cadastro),
  // nao mexe na memoria local e devolve o motivo real em vez de um sucesso falso.
  try {
    const { sbDeleteCadastro } = await import('@/lib/supabase-sync');
    await sbDeleteCadastro(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[CADASTRO] Supabase delete error:', e);
    if (msg.includes('23503')) {
      return NextResponse.json({ error: 'Este cadastro tem pedidos vinculados e não pode ser excluído. Exclua os pedidos primeiro.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }

  const ok = mem_deletarCadastro(id);
  if (!ok) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
