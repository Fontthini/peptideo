import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarToken, mem_registrarAcessoLoja, mem_registrarAcessoBlog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function POST(req: NextRequest) {
  await reloadFromSupabase();
  const { token, area } = await req.json();
  if (!token) return NextResponse.json({ error: 'Token obrigatório' }, { status: 400 });

  const cadastro = mem_buscarToken(token);
  if (!cadastro) return NextResponse.json({ error: 'Token inválido' }, { status: 401 });

  const atualizado = area === 'blog' ? mem_registrarAcessoBlog(cadastro.id) : mem_registrarAcessoLoja(cadastro.id);
  if (!atualizado) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });

  try {
    const { sbSaveCadastro } = await import('@/lib/supabase-sync');
    await sbSaveCadastro(atualizado);
  } catch (e) {
    console.error('[ACESSO-HEARTBEAT] Supabase save error:', e);
  }

  return NextResponse.json({ ok: true });
}
