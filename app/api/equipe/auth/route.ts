import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorEmail, mem_gerarTokenMembro } from '@/lib/db-memory';

export async function POST(req: NextRequest) {
  const { email, senha } = await req.json();
  if (!email || !senha) return NextResponse.json({ error: 'Email e senha obrigatórios' }, { status: 400 });
  const membro = mem_buscarMembroPorEmail(email);
  if (!membro || !membro.ativo) return NextResponse.json({ error: 'Usuário não encontrado ou inativo' }, { status: 401 });
  if (!membro.senha || membro.senha !== senha) return NextResponse.json({ error: 'Senha incorreta' }, { status: 401 });
  const token = mem_gerarTokenMembro(membro.id);
  return NextResponse.json({ token, cargo: membro.cargo, nome: membro.nome, id: membro.id });
}
