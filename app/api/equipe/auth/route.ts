import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorEmail, mem_gerarTokenMembro } from '@/lib/db-memory';

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json();
  if (!email || !senha) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });

  // Lazy-load do Supabase se a equipe estiver vazia (cold start sem instrumentation)
  const g = global as Record<string, unknown>;
  if (!g.__equipe__ || (g.__equipe__ as unknown[]).length === 0) {
    try {
      const { loadAllFromSupabase } = await import('@/lib/supabase-sync');
      await loadAllFromSupabase();
    } catch {}
  }

  const membro = mem_buscarMembroPorEmail(email);
  if (!membro || !membro.ativo) return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 401 });
  const senhaEsperada = membro.senha || (process.env.ADMIN_PASSWORD || '48139148');
  if (senha !== senhaEsperada) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  const token = mem_gerarTokenMembro(membro.id);
  return NextResponse.json({ token, cargo: membro.cargo, nome: membro.nome, id: membro.id });
}
