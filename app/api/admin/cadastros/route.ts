import { NextRequest, NextResponse } from 'next/server';
import { mem_listar, mem_deletarCadastro } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  return key === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadFromSupabase();
  return NextResponse.json(mem_listar());
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const ok = mem_deletarCadastro(id);
  if (!ok) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  try { const { sbDeleteCadastro } = await import('@/lib/supabase-sync'); await sbDeleteCadastro(id); } catch (e) { console.error('[CADASTRO] Supabase delete error:', e); }
  return NextResponse.json({ ok: true });
}
