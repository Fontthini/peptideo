import { NextRequest, NextResponse } from 'next/server';
import { mem_listarLogs } from '@/lib/db-memory';

// So a senha mestra ve o log — o objetivo e o superadmin acompanhar o que os
// outros usuarios admin fazem, entao um usuario admin comum nao pode ver isso.
function checkSuperadmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function GET(req: NextRequest) {
  if (!checkSuperadmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { sbListarLogs } = await import('@/lib/supabase-sync');
    const logs = await sbListarLogs();
    return NextResponse.json(logs);
  } catch (e) {
    console.error('[LOGS] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarLogs());
}
