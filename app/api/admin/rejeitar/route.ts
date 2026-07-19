import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarId, mem_rejeitar } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  return key === (process.env.ADMIN_PASSWORD || '48139148');
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

    if (!mem_buscarId(id)) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
    mem_rejeitar(id);
    return NextResponse.json({ ok: true });

  } catch (err) {
    console.error('[REJEITAR]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
