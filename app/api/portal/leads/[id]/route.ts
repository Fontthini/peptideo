import { NextRequest, NextResponse } from 'next/server';
import {
  mem_buscarMembroPorToken, mem_buscarId,
  mem_atribuirVendedor, mem_solicitarAcao,
  mem_aprovar, mem_rejeitar, mem_adicionarObs,
  mem_getConfig,
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
              html: `<div style="font-family:Arial,sans-serif;background:#000;color:#fff;padding:40px;max-width:600px;margin:0 auto;">
<h1 style="color:#8AE152;">PeptideZ Health</h1>
<h2 style="color:#fff;">Olá, ${nomeCliente}! 🎉</h2>
<p style="color:#ccc;line-height:1.6;">Seu cadastro foi <strong style="color:#8AE152;">aprovado</strong>! Acesse sua loja exclusiva de peptídeos:</p>
<div style="text-align:center;margin:40px 0;">
<a href="${lojaUrl}" style="background:#8AE152;color:#000;padding:16px 40px;text-decoration:none;border-radius:8px;font-weight:bold;font-size:16px;display:inline-block">Acessar Minha Loja →</a>
</div>
<p style="color:#888;font-size:12px;text-align:center;">Link direto: <a href="${lojaUrl}" style="color:#8AE152;">${lojaUrl}</a></p>
${whatsappNumero ? `<p style="color:#888;font-size:12px;text-align:center;">Dúvidas? WhatsApp: ${whatsappNumero}</p>` : ''}
</div>`,
            }),
          });
          emailEnviado = emailRes.ok;
          if (!emailRes.ok) {
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
