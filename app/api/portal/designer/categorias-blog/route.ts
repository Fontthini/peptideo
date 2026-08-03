import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarCategoriasBlog } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

async function checkDesigner(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const m = mem_buscarMembroPorToken(token);
  return m && ['designer', 'superadmin', 'gerente'].includes(m.cargo) ? m : null;
}

export async function GET(req: NextRequest) {
  if (!await checkDesigner(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  return NextResponse.json(mem_listarCategoriasBlog());
}
