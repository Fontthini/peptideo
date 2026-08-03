import { NextRequest, NextResponse } from 'next/server';
import { mem_registrarClique } from '@/lib/db-memory';
import { ensureConfig } from '@/lib/ensure-equipe';

const CARDS_VALIDOS = ['loja', 'blog', 'indicar', 'indicar_medico', 'suporte', 'mentoria'];

export async function POST(req: NextRequest) {
  const { card } = await req.json();
  if (!CARDS_VALIDOS.includes(card)) return NextResponse.json({ error: 'Card inválido' }, { status: 400 });
  await ensureConfig();
  mem_registrarClique(card);
  return NextResponse.json({ ok: true });
}
