import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken } from '@/lib/db-memory';

export async function GET(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { senha: _s, token_acesso: _t, ...safe } = membro;
  return NextResponse.json(safe);
}
