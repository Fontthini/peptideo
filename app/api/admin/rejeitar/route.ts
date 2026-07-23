import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_buscarId, mem_rejeitar, mem_registrarLog } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await req.json();

    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      try {
        const { rejeitarCadastro, initDB } = await import('@/lib/db');
        await initDB();
        await rejeitarCadastro(id);
        return NextResponse.json({ ok: true });
      } catch (e) {
        console.error('[DB]', e);
      }
    }

    const c = mem_buscarId(id);
    if (!c) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    mem_rejeitar(id);
    mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Rejeitou cadastro', `${c.nome} ${c.sobrenome || ''}`.trim());
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[REJEITAR]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
