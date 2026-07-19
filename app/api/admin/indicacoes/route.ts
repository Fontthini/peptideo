import { NextRequest, NextResponse } from 'next/server';
import { mem_listarIndicacoes, mem_editarIndicacao, mem_deletarIndicacao } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_listarIndicacoes());
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const i = mem_editarIndicacao(data.id, {
    nome: data.nome, sobrenome: data.sobrenome || '', whatsapp: data.whatsapp,
    email: data.email || '', endereco: data.endereco || '',
    status: data.status, obs: data.obs || '',
  });
  if (!i) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  try { const { sbSaveIndicacao } = await import('@/lib/supabase-sync'); await sbSaveIndicacao(i); } catch (e) { console.error('[INDICACAO] save error:', e); }
  return NextResponse.json(i);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  try {
    const { sbDeleteIndicacao } = await import('@/lib/supabase-sync');
    await sbDeleteIndicacao(id);
  } catch (e) {
    console.error('[INDICACAO] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }
  const ok = mem_deletarIndicacao(id);
  if (!ok) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
