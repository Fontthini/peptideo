import { NextRequest, NextResponse } from 'next/server';
import { mem_registrarClique } from '@/lib/db-memory';

const CARDS_VALIDOS = ['loja', 'blog', 'indicar', 'suporte', 'mentoria'];

export async function POST(req: NextRequest) {
  const { card } = await req.json();
  if (!CARDS_VALIDOS.includes(card)) return NextResponse.json({ error: 'Card inválido' }, { status: 400 });
  mem_registrarClique(card);
  return NextResponse.json({ ok: true });
}
