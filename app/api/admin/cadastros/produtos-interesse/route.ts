import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_editarCadastro, mem_registrarLog } from '@/lib/db-memory';
import { ensureCadastros } from '@/lib/ensure-equipe';

export async function PUT(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await ensureCadastros();
  const { id, produtos_interesse } = await req.json();
  if (!id || !Array.isArray(produtos_interesse)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const c = mem_editarCadastro(id, {
    produtos_interesse: produtos_interesse.filter((p: unknown) => typeof p === 'string' && p.trim()).map((p: string) => p.trim()),
  });
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou produtos de interesse', `${c.nome} ${c.sobrenome || ''}`.trim());
  return NextResponse.json(c);
}
