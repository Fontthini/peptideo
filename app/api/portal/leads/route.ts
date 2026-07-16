import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listar } from '@/lib/db-memory';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const todos = mem_listar();
  if (membro.cargo === 'vendedor') {
    return NextResponse.json(todos);
  }
  return NextResponse.json(todos);
}
