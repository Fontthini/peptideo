import { NextRequest, NextResponse } from 'next/server';
import { mem_listarPedidos, mem_atualizarPedido, mem_deletarPedido } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_listarPedidos());
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id, status, obs } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 });
  const p = mem_atualizarPedido(id, { status, obs });
  if (!p) return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
  try { const { sbSavePedido } = await import('@/lib/supabase-sync'); await sbSavePedido(p); } catch (e) { console.error('[PEDIDO] save error:', e); }
  return NextResponse.json(p);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id obrigatorio' }, { status: 400 });
  try {
    const { sbDeletePedido } = await import('@/lib/supabase-sync');
    await sbDeletePedido(id);
  } catch (e) {
    console.error('[PEDIDO] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }
  const ok = mem_deletarPedido(id);
  if (!ok) return NextResponse.json({ error: 'Pedido nao encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
