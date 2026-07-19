import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailAprovacao } from '@/lib/email';
import { reloadFromSupabase } from '@/lib/ensure-equipe';
import { mem_getConfig } from '@/lib/db-memory';
import { cleanSecret } from '@/lib/sanitize';

// Endpoint temporário de diagnóstico — testa o envio via Resend sem tocar em
// nenhum cadastro real. Remover depois de confirmar que o envio funciona.
function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { email, sandbox } = await req.json();
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 });

  if (sandbox) {
    // Usa o dominio de teste do Resend (nao precisa de dominio verificado,
    // mas so entrega para o e-mail dono da conta Resend).
    const apiKey = cleanSecret(process.env.RESEND_API_KEY || mem_getConfig().resend_api_key);
    if (!apiKey) return NextResponse.json({ ok: false, error: 'sem chave configurada' });
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'PeptideZ Health <onboarding@resend.dev>',
      to: email,
      subject: 'Teste PeptideZ Health (sandbox)',
      html: '<p>Teste de envio via onboarding@resend.dev — se isso chegou, a chave do Resend funciona.</p>',
    });
    return NextResponse.json(result.error ? { ok: false, error: result.error } : { ok: true, id: result.data?.id });
  }

  const result = await enviarEmailAprovacao('Teste', email, 'teste-de-envio');
  return NextResponse.json(result);
}
