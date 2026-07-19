import { NextRequest, NextResponse } from 'next/server';
import {
  mem_buscarMembroPorToken, mem_buscarId,
  mem_atribuirVendedor, mem_solicitarAcao,
  mem_aprovar, mem_rejeitar, mem_adicionarObs,
  mem_getConfig, mem_registrarEnvioEmail,
} from '@/lib/db-memory';
import { randomUUID } from 'crypto';
import { reloadFromSupabase } from '@/lib/ensure-equipe';
import { cleanSecret } from '@/lib/sanitize';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await reloadFromSupabase();
  const { id } = await params;
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const cadastro = mem_buscarId(id);
  if (!cadastro) return NextResponse.json({ error: 'Lead não encontrado' }, { status: 404 });

  const body = await req.json();
  const { action, obs, motivo } = body;

  // Vendedor: salvar observações
  if (action === 'salvar_obs') {
    if (cadastro.vendedor_id !== membro.id && membro.cargo !== 'superadmin') {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }
    const c = mem_adicionarObs(id, obs || '');
    return NextResponse.json(c);
  }

  if (membro.cargo === 'vendedor') {
    if (action === 'assumir') {
      const c = mem_atribuirVendedor(id, membro.id);
      return NextResponse.json(c);
    }
    if (action === 'solicitar_aprovar') {
      const c = mem_solicitarAcao(id, 'aprovar');
      return NextResponse.json(c);
    }
    if (action === 'solicitar_rejeitar') {
      const c = mem_solicitarAcao(id, 'rejeitar', motivo);
      return NextResponse.json(c);
    }
  }

  if (membro.cargo === 'gerente' || membro.cargo === 'superadmin') {
    if (action === 'aprovar') {
      const accessToken = randomUUID();
      const c = mem_aprovar(id, accessToken);
      if (!c) return NextResponse.json({ error: 'Erro ao aprovar' }, { status: 500 });

      const cfg = mem_getConfig();
      const baseUrl = cfg.base_url || 'http://localhost:3000';
      const lojaUrl = `${baseUrl}/acesso/${accessToken}`;
      const whatsappNumero = cfg.whatsapp_numero || '';

      // Mensagem de aprovação para enviar ao lead
      const nomeCliente = `${c.nome}${c.sobrenome ? ' ' + c.sobrenome : ''}`;
      const msgAprovacao = `Olá ${nomeCliente}! 🎉\n\nSeu cadastro na PeptideZ Health foi *aprovado*!\n\nAcesse sua loja exclusiva pelo link abaixo:\n👉 ${lojaUrl}\n\nEm caso de dúvidas, entre em contato conosco.`;

      // Link WhatsApp para o gerente clicar (abre conversa com o lead)
      const waLead = c.whatsapp
        ? `https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msgAprovacao)}`
        : null;

      // Enviar email via Resend
      let emailEnviado = false;
      const resendKey = cleanSecret(process.env.RESEND_API_KEY || cfg.resend_api_key);
      if (resendKey && c.email) {
        try {
          const emailRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${resendKey}` },
            body: JSON.stringify({
              from: 'PeptideZ Health <contato@peptidezhealth.com.br>',
              to: c.email,
              subject: '✅ Seu acesso foi aprovado — PeptideZ Health',
              html: `<div style="font-family:Arial,Helvetica,sans-serif;background:#f8fafc;padding:32px 16px;">
<div style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb;">
<div style="padding:28px 32px;text-align:center;border-bottom:1px solid #f3f4f6;">
<img src="${cfg.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}" alt="PeptideZ Health" style="height:44px;object-fit:contain;" />
</div>
<div style="padding:32px;">
<div style="color:#16a34a;font-weight:700;font-size:12px;letter-spacing:0.5px;text-transform:uppercase;margin-bottom:8px;">Cadastro aprovado</div>
<h1 style="color:#111827;font-size:22px;margin:0 0 16px;">Olá, ${nomeCliente}! 🎉</h1>
<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 28px;">Seu cadastro foi <strong style="color:#16a34a;">aprovado</strong>! Acesse sua loja exclusiva de peptídeos.</p>
<div style="text-align:center;margin-bottom:24px;">
<a href="${lojaUrl}" style="background:#111827;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:700;font-size:15px;display:inline-block">Acessar Minha Loja →</a>
</div>
<p style="color:#9ca3af;font-size:12px;text-align:center;margin:0 0 4px;">Link direto: <a href="${lojaUrl}" style="color:#16a34a;">${lojaUrl}</a></p>
${whatsappNumero ? `<p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">Dúvidas? WhatsApp: ${whatsappNumero}</p>` : ''}
</div>
<div style="padding:18px 32px;background:#f9fafb;border-top:1px solid #f3f4f6;text-align:center;">
<p style="color:#9ca3af;font-size:11px;margin:0;">PeptideZ Health · Exclusivo para Prescrição Médica</p>
</div>
</div>
</div>`,
            }),
          });
          emailEnviado = emailRes.ok;
          if (emailRes.ok) {
            mem_registrarEnvioEmail();
          } else {
            const errBody = await emailRes.text();
            console.error('[APROVAR] Resend erro:', emailRes.status, errBody);
          }
        } catch (e) {
          console.error('[APROVAR] Email exception:', e);
        }
      }

      return NextResponse.json({ ...c, wa_link: waLead, email_enviado: emailEnviado, loja_url: lojaUrl });
    }

    if (action === 'rejeitar') {
      const c = mem_rejeitar(id);
      if (!c) return NextResponse.json({ error: 'Erro ao rejeitar' }, { status: 500 });

      // Link WA para notificar rejeição se quiser
      const nomeCliente = `${c.nome}${c.sobrenome ? ' ' + c.sobrenome : ''}`;
      const msgRejeicao = `Olá ${nomeCliente}, informamos que seu cadastro na PeptideZ Health não foi aprovado no momento. Entre em contato para mais informações.`;
      const waLead = c.whatsapp
        ? `https://wa.me/${c.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msgRejeicao)}`
        : null;

      return NextResponse.json({ ...c, wa_link: waLead });
    }
  }

  return NextResponse.json({ error: 'Ação não permitida' }, { status: 403 });
}
