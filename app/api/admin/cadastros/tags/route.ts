import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_definirTags, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function PUT(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadFromSupabase();
  const { id, tags } = await req.json();
  if (!id || !Array.isArray(tags)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const c = mem_definirTags(id, tags.filter((t: unknown) => typeof t === 'string' && t.trim()).map((t: string) => t.trim()));
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou etiquetas', `${c.nome} ${c.sobrenome || ''}`.trim());
  return NextResponse.json(c);
}
