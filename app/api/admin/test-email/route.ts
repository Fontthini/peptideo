import { NextRequest, NextResponse } from 'next/server';
import { enviarEmailAprovacao } from '@/lib/email';

// Endpoint temporário de diagnóstico — testa o envio via Resend sem tocar em
// nenhum cadastro real. Remover depois de confirmar que o envio funciona.
function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { email } = await req.json();
  if (!email) return NextResponse.json({ error: 'email obrigatório' }, { status: 400 });
  const result = await enviarEmailAprovacao('Teste', email, 'teste-de-envio');
  return NextResponse.json(result);
}
