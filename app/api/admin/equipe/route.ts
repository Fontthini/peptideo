// equipe admin API
import { NextRequest, NextResponse } from 'next/server';
import { mem_listarEquipe, mem_criarMembro, mem_editarMembro, mem_deletarMembro } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_listarEquipe());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    await reloadFromSupabase();
    const data = await req.json();
    if (!data.nome || !data.cargo) return NextResponse.json({ error: 'Nome e cargo obrigatórios' }, { status: 400 });
    const m = mem_criarMembro({ nome: data.nome, email: data.email || '', cargo: data.cargo, ativo: data.ativo ?? true, senha: data.senha || undefined });
    try { const { sbSaveMembro } = await import('@/lib/supabase-sync'); await sbSaveMembro(m); } catch (e) { console.error('[EQUIPE] Supabase save error:', e); }
    return NextResponse.json(m, { status: 201 });
  } catch (err) {
    console.error('[EQUIPE POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    await reloadFromSupabase();
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    const m = mem_editarMembro(data.id, { nome: data.nome, email: data.email || '', cargo: data.cargo, ativo: data.ativo ?? true, ...(data.senha ? { senha: data.senha } : {}) });
    if (!m) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    try { const { sbSaveMembro } = await import('@/lib/supabase-sync'); await sbSaveMembro(m); } catch (e) { console.error('[EQUIPE] Supabase save error:', e); }
    return NextResponse.json(m);
  } catch (err) {
    console.error('[EQUIPE PUT]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    await reloadFromSupabase();
    const { id } = await req.json();
    const ok = mem_deletarMembro(id);
    if (!ok) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    try { const { sbDeleteMembro } = await import('@/lib/supabase-sync'); await sbDeleteMembro(id); } catch (e) { console.error('[EQUIPE] Supabase delete error:', e); }
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
