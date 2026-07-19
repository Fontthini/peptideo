import { cleanSecret } from './sanitize';
import { mem_getConfig } from './db-memory';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://peptidez-mvp.vercel.app';

function getResendKey(): string {
  return cleanSecret(process.env.RESEND_API_KEY || mem_getConfig().resend_api_key);
}

export async function enviarEmailAprovacao(nome: string, email: string, token: string) {
  const link = `${BASE_URL}/acesso/${token}`;
  const apiKey = getResendKey();

  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY não configurada - email não enviado');
    return { ok: false };
  }

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    await resend.emails.send({
      from: 'PeptideZ Health <contato@peptidezhealth.com.br>',
      to: email,
      subject: '✅ Seu acesso ao PeptideZ Health foi aprovado!',
      html: `
        <div style="font-family: Arial, sans-serif; background: #000; color: #fff; padding: 40px; max-width: 600px; margin: 0 auto;">
          <h1 style="color: #8AE152; margin-bottom: 8px;">PeptideZ Health</h1>
          <p style="color: #888; font-size: 12px; margin-bottom: 32px;">Otimização Bioativa · Regeneração Celular</p>
          <h2 style="color: #fff;">Olá, ${nome}! 🎉</h2>
          <p style="color: #ccc; line-height: 1.6;">
            Seu cadastro foi <strong style="color: #8AE152;">aprovado</strong>! Acesse sua área exclusiva com blog especializado e loja completa de peptídeos.
          </p>
          <div style="text-align: center; margin: 40px 0;">
            <a href="${link}" style="background: #8AE152; color: #000; padding: 16px 40px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">
              Acessar Plataforma →
            </a>
          </div>
          <p style="color: #888; font-size: 12px; text-align: center;">
            Link direto: <a href="${link}" style="color: #8AE152;">${link}</a>
          </p>
          <hr style="border: 1px solid #222; margin: 30px 0;" />
          <p style="color: #555; font-size: 11px; text-align: center;">PeptideZ Health · Exclusivo para Prescrição Médica</p>
        </div>
      `,
    });
    return { ok: true };
  } catch (err) {
    console.error('[EMAIL] Erro ao enviar:', err);
    return { ok: false };
  }
}

export async function enviarEmailRejeicao(nome: string, email: string) {
  const apiKey = getResendKey();
  if (!apiKey) return { ok: false };

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: 'PeptideZ Health <contato@peptidezhealth.com.br>',
      to: email,
      subject: 'Atualização sobre seu cadastro PeptideZ Health',
      html: `<div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:40px;max-width:600px;margin:0 auto;"><h1 style="color:#8AE152;">PeptideZ Health</h1><p>Olá, ${nome}.</p><p style="color:#ccc;">Infelizmente seu cadastro não pôde ser aprovado. Entre em contato para mais informações.</p></div>`,
    });
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
