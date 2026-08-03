import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarCategoriasFinanceiras, mem_adicionarCategoriaFinanceira } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

// Gerente/superadmin do portal podem visualizar e adicionar categorias,
// mas nao excluir (isso continua so no /admin).
function checkGerente(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  return membro && ['gerente', 'superadmin'].includes(membro.cargo) ? membro : null;
}

export async function GET(req: NextRequest) {
  await ensureEquipe();
  if (!checkGerente(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const { sbListarCategoriasFinanceiras } = await import('@/lib/supabase-sync');
    const categorias = await sbListarCategoriasFinanceiras();
    return NextResponse.json(categorias);
  } catch (e) {
    console.error('[PORTAL-CATEGORIAS-FINANCEIRAS] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarCategoriasFinanceiras());
}

export async function POST(req: NextRequest) {
  await ensureEquipe();
  if (!checkGerente(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { nome } = await req.json();
  if (!nome?.trim()) return NextResponse.json({ error: 'Nome obrigatório' }, { status: 400 });
  const ok = mem_adicionarCategoriaFinanceira(nome.trim());
  if (!ok) return NextResponse.json({ error: 'Categoria já existe' }, { status: 409 });
  return NextResponse.json({ ok: true });
}
