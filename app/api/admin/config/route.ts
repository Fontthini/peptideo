import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_getConfig, mem_setConfig, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_getConfig());
}

// Campos operacionais que nunca devem virar string vazia: um valor em branco
// aqui so pode ser um formulario que salvou antes de terminar de carregar os
// dados atuais (ex: aba Config aberta com internet lenta), nunca uma escolha
// real do admin — entao um "" recebido e ignorado em vez de apagar o valor
// que ja estava salvo.
const NUNCA_VAZIO = ['whatsapp_numero', 'base_url'];

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const data = await req.json();
  for (const campo of NUNCA_VAZIO) {
    if (campo in data && !String(data[campo] ?? '').trim()) delete data[campo];
  }
  const updated = mem_setConfig(data);
  try {
    const { sbSaveConfig } = await import('@/lib/supabase-sync');
    await sbSaveConfig(updated);
  } catch (e) {
    console.error('[CONFIG] Supabase save error:', e);
  }
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Alterou configurações', Object.keys(data).join(', '));
  return NextResponse.json(updated);
}
