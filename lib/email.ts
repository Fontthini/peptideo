import { cleanSecret } from './sanitize';
import { mem_getConfig } from './db-memory';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://peptidez-mvp.vercel.app';
const LOGO_FALLBACK = 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg';

function getResendKey(): string {
  return cleanSecret(process.env.RESEND_API_KEY || mem_getConfig().resend_api_key);
}

function emailShell(logo: string, bodyHtml: string): string {
  return `
    <div style="font-family: Arial, Helvetica, sans-serif; background: #f8fafc; padding: 32px 16px;">
      <div style="max-width: 560px; margin: 0 auto; background: #fff; border-radius: 16px; overflow: hidden; border: 1px solid #e5e7eb;">
        <div style="padding: 28px 32px; text-align: center; border-bottom: 1px solid #f3f4f6;">
          <img src="${logo}" alt="PeptideZ Health" style="height: 44px; object-fit: contain;" />
        </div>
        <div style="padding: 32px;">
          ${bodyHtml}
        </div>
        <div style="padding: 18px 32px; background: #f9fafb; border-top: 1px solid #f3f4f6; text-align: center;">
          <p style="color: #9ca3af; font-size: 11px; margin: 0;">PeptideZ Health · Exclusivo para Prescrição Médica</p>
        </div>
      </div>
    </div>
  `;
}

export async function enviarEmailAprovacao(nome: string, email: string, token: string, fromOverride?: string) {
  const link = `${BASE_URL}/acesso/${token}`;
  const apiKey = getResendKey();

  if (!apiKey) {
    console.warn('[EMAIL] RESEND_API_KEY não configurada - email não enviado');
    return { ok: false };
  }

  const logo = mem_getConfig().logo || LOGO_FALLBACK;
  const body = `
    <div style="color: #16a34a; font-weight: 700; font-size: 12px; letter-spacing: 0.5px; text-transform: uppercase; margin-bottom: 8px;">Cadastro aprovado</div>
    <h1 style="color: #111827; font-size: 22px; margin: 0 0 16px;">Olá, ${nome}! 🎉</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0 0 28px;">
      Seu cadastro na PeptideZ Health foi <strong style="color: #16a34a;">aprovado</strong>. Você já pode acessar sua área exclusiva, com blog especializado e loja completa de peptídeos.
    </p>
    <div style="text-align: center; margin-bottom: 24px;">
      <a href="${link}" style="background: #111827; color: #fff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">
        Acessar Plataforma →
      </a>
    </div>
    <p style="color: #9ca3af; font-size: 12px; text-align: center; margin: 0;">
      Link direto: <a href="${link}" style="color: #16a34a;">${link}</a>
    </p>
  `;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);

    const result = await resend.emails.send({
      from: fromOverride || 'PeptideZ Health <contato@peptidezhealth.com.br>',
      to: email,
      subject: '✅ Seu acesso ao PeptideZ Health foi aprovado!',
      html: emailShell(logo, body),
    });
    if (result.error) {
      console.error('[EMAIL] Resend recusou o envio:', result.error);
      return { ok: false, error: result.error };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error('[EMAIL] Erro ao enviar:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

export async function enviarEmailRejeicao(nome: string, email: string) {
  const apiKey = getResendKey();
  if (!apiKey) return { ok: false };

  const logo = mem_getConfig().logo || LOGO_FALLBACK;
  const body = `
    <h1 style="color: #111827; font-size: 20px; margin: 0 0 16px;">Olá, ${nome}.</h1>
    <p style="color: #374151; font-size: 15px; line-height: 1.6; margin: 0;">
      Infelizmente seu cadastro não pôde ser aprovado neste momento. Entre em contato com a gente para mais informações.
    </p>
  `;

  try {
    const { Resend } = await import('resend');
    const resend = new Resend(apiKey);
    const result = await resend.emails.send({
      from: 'PeptideZ Health <contato@peptidezhealth.com.br>',
      to: email,
      subject: 'Atualização sobre seu cadastro PeptideZ Health',
      html: emailShell(logo, body),
    });
    if (result.error) {
      console.error('[EMAIL] Resend recusou o envio:', result.error);
      return { ok: false, error: result.error };
    }
    return { ok: true, id: result.data?.id };
  } catch (err) {
    console.error('[EMAIL] Erro ao enviar:', err);
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
