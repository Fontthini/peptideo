import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailAprovacao } from '@/lib/email';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

// Endpoint temporário de diagnóstico — testa o envio via Resend sem tocar em
// nenhum cadastro real. Remover depois de confirmar que o envio funciona.
function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { email, sandbox } = await req.json();
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 });

  // sandbox=true usa o domínio de teste do Resend (não precisa de domínio
  // verificado, mas só entrega para o e-mail dono da conta Resend) — usa o
  // modelo real de aprovação, só troca o remetente.
  const fromOverride = sandbox ? 'PeptideZ Health <onboarding@resend.dev>' : undefined;
  const result = await enviarEmailAprovacao('Dr. Teste', email, 'teste-de-envio', fromOverride);
  return NextResponse.json(result);
}
