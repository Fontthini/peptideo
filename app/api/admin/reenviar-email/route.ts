import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarId } from '@/lib/db-memory';
import { enviarEmailAprovacao } from '@/lib/email';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  return key === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const cadastro = mem_buscarId(id);
  if (!cadastro) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  if (cadastro.status !== 'aprovado' || !cadastro.token) {
    return NextResponse.json({ error: 'Este cadastro ainda não foi aprovado' }, { status: 400 });
  }

  const emailResult = await enviarEmailAprovacao(cadastro.nome, cadastro.email, cadastro.token);
  if (!emailResult.ok) {
    return NextResponse.json({ error: 'Falha ao enviar e-mail. Verifique a configuração do Resend.' }, { status: 502 });
  }
  return NextResponse.json({ ok: true });
}
