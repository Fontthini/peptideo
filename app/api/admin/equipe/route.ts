// equipe admin API
import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarEquipe, mem_criarMembro, mem_editarMembro, mem_deletarMembro, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_listarEquipe());
}

// Criar, editar e excluir membros (quem tem acesso admin, gerente etc.) e
// exclusivo do superadmin.
export async function POST(req: NextRequest) {
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode gerenciar a equipe.' }, { status: 403 });
  try {
    await reloadFromSupabase();
    const data = await req.json();
    if (!data.nome || !data.cargo) return NextResponse.json({ error: 'Nome e cargo obrigatórios' }, { status: 400 });
    const m = mem_criarMembro({ nome: data.nome, email: data.email || '', cargo: data.cargo, ativo: data.ativo ?? true, senha: data.senha || undefined });
    try { const { sbSaveMembro } = await import('@/lib/supabase-sync'); await sbSaveMembro(m); } catch (e) { console.error('[EQUIPE] Supabase save error:', e); }
    mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Criou membro da equipe', `${m.nome} (${m.cargo})`);
    return NextResponse.json(m, { status: 201 });
  } catch (err) {
    console.error('[EQUIPE POST]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode gerenciar a equipe.' }, { status: 403 });
  try {
    await reloadFromSupabase();
    const data = await req.json();
    if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
    const m = mem_editarMembro(data.id, { nome: data.nome, email: data.email || '', cargo: data.cargo, ativo: data.ativo ?? true, ...(data.senha ? { senha: data.senha } : {}) });
    if (!m) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    try { const { sbSaveMembro } = await import('@/lib/supabase-sync'); await sbSaveMembro(m); } catch (e) { console.error('[EQUIPE] Supabase save error:', e); }
    mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou membro da equipe', `${m.nome} (${m.cargo})`);
    return NextResponse.json(m);
  } catch (err) {
    console.error('[EQUIPE PUT]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode gerenciar a equipe.' }, { status: 403 });
  try {
    await reloadFromSupabase();
    const { id } = await req.json();
    const alvo = mem_listarEquipe().find(m => m.id === id);
    const ok = mem_deletarMembro(id);
    if (!ok) return NextResponse.json({ error: 'Membro não encontrado' }, { status: 404 });
    try { const { sbDeleteMembro } = await import('@/lib/supabase-sync'); await sbDeleteMembro(id); } catch (e) { console.error('[EQUIPE] Supabase delete error:', e); }
    mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu membro da equipe', alvo ? `${alvo.nome} (${alvo.cargo})` : id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
