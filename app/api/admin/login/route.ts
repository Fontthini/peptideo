import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorEmail, mem_gerarTokenMembro } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function masterPassword(): string {
  return process.env.ADMIN_PASSWORD || '48139148';
}

export async function POST(req: NextRequest) {
  await reloadFromSupabase();
  const { email, senha } = await req.json();
  if (!senha) return NextResponse.json({ error: 'Senha obrigatória' }, { status: 400 });

  const emailTrim = (email || '').trim();
  if (emailTrim) {
    const membro = mem_buscarMembroPorEmail(emailTrim);
    if (membro && membro.ativo && membro.cargo === 'admin' && membro.senha && senha === membro.senha) {
      const token = mem_gerarTokenMembro(membro.id);
      return NextResponse.json({ ok: true, adminKey: token, nome: membro.nome, superadmin: false });
    }
  }

  if (senha === masterPassword()) {
    return NextResponse.json({ ok: true, adminKey: senha, nome: 'Superadmin', superadmin: true });
  }

  return NextResponse.json({ error: 'E-mail ou senha incorretos' }, { status: 401 });
}
