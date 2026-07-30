import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid } from '@/lib/admin-auth';
import { mem_listarCliquesMentoria } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { sbListarCliquesMentoria } = await import('@/lib/supabase-sync');
    const cliques = await sbListarCliquesMentoria();
    return NextResponse.json(cliques);
  } catch (e) {
    console.error('[MENTORIA-CLIQUES] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarCliquesMentoria());
}
