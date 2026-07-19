import { NextRequest, NextResponse } from 'next/server';
import { mem_incrementarViewProduto, mem_incrementarCartAddProduto } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

// Contador agregado (não guarda clique a clique) — por isso não recarrega
// o Supabase inteiro a cada chamada, só na primeira falha (instância fria).
export async function POST(req: NextRequest) {
  const { id, tipo } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const incrementar = tipo === 'cart' ? mem_incrementarCartAddProduto : mem_incrementarViewProduto;
  let p = incrementar(id);
  if (!p) {
    await reloadFromSupabase();
    p = incrementar(id);
  }
  if (!p) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });

  try {
    const { sbSaveProduto } = await import('@/lib/supabase-sync');
    await sbSaveProduto(p);
  } catch (e) {
    console.error('[PRODUTO-TRACK] Supabase save error:', e);
  }

  return NextResponse.json({ ok: true });
}
