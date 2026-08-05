import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listar, mem_criar, mem_buscarEmail, mem_proximoVendedor, mem_atribuirVendedor, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkGerente(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  return membro && ['gerente', 'superadmin'].includes(membro.cargo) ? membro : null;
}

export async function GET(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const todos = mem_listar();
  if (membro.cargo === 'vendedor') {
    return NextResponse.json(todos);
  }
  return NextResponse.json(todos);
}

export async function POST(req: NextRequest) {
  await reloadFromSupabase();
  const membro = checkGerente(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu } = await req.json();
  if (!nome || !email || !whatsapp) return NextResponse.json({ error: 'Nome, e-mail e WhatsApp são obrigatórios' }, { status: 400 });
  if (mem_buscarEmail(email)) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

  const c = mem_criar({ nome, sobrenome: sobrenome || '', email, whatsapp, endereco: endereco || '', crm: crm || null, onde_conheceu: onde_conheceu || null });
  const vendedorId = mem_proximoVendedor();
  if (vendedorId) mem_atribuirVendedor(c.id, vendedorId);

  try {
    const { sbSaveCadastro } = await import('@/lib/supabase-sync');
    await sbSaveCadastro({ ...c, vendedor_id: vendedorId || undefined });
  } catch (e) {
    console.error('[PORTAL-LEADS] Supabase save error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('cadastros_email_key') || msg.includes('23505')) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }
  }

  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Cadastrou médico manualmente (portal)', `${c.nome} ${c.sobrenome || ''}`.trim());
  return NextResponse.json({ ...c, vendedor_id: vendedorId || undefined }, { status: 201 });
}
