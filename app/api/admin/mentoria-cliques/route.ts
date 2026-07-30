import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarCliquesMentoria, mem_deletarCliqueMentoria, mem_registrarLog } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { sbListarCliquesMentoria } = await import('@/lib/supabase-sync');
    const cliques = await sbListarCliquesMentoria();
    return NextResponse.json(cliques);
  } catch (e) {
    console.error('[MENTORIA-CLIQUES] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarCliquesMentoria());
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const alvo = mem_listarCliquesMentoria().find(c => c.id === id);
  mem_deletarCliqueMentoria(id); // limpa do cache local, se estiver la

  try {
    const { sbDeleteCliqueMentoria } = await import('@/lib/supabase-sync');
    await sbDeleteCliqueMentoria(id);
  } catch (e) {
    console.error('[MENTORIA-CLIQUES] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir clique' }, { status: 500 });
  }

  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu clique de mentoria', alvo ? alvo.medico_nome : id);
  return NextResponse.json({ ok: true });
}
