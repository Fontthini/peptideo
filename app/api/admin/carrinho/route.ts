import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid } from '@/lib/admin-auth';
import { mem_listarCarrinho } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { sbListarCarrinhoEventos } = await import('@/lib/supabase-sync');
    const eventos = await sbListarCarrinhoEventos();
    return NextResponse.json(eventos);
  } catch (e) {
    console.error('[CARRINHO] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarCarrinho());
}
