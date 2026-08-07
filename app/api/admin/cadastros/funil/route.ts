import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_atualizarFunil, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

const ETAPAS = ['novo', 'primeiro_contato', 'aguardando_resposta', 'interessado', 'link_pix_enviado', 'cliente', 'perdido'];

export async function PUT(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadFromSupabase();
  const { id, funil_status, motivo_perda } = await req.json();
  if (!id || !ETAPAS.includes(funil_status)) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const c = mem_atualizarFunil(id, funil_status, motivo_perda);
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Moveu lead no funil', `${c.nome} ${c.sobrenome || ''}`.trim() + ` → ${funil_status}`);
  return NextResponse.json(c);
}
