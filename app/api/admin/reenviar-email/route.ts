import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_buscarId, mem_registrarLog } from '@/lib/db-memory';
import { enviarEmailAprovacao } from '@/lib/email';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
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
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Reenviou e-mail de acesso', `${cadastro.nome} ${cadastro.sobrenome || ''}`.trim());
  return NextResponse.json({ ok: true });
}
