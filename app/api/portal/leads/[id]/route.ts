import { NextRequest, NextResponse } from 'next/server';
import {
  mem_buscarMembroPorToken, mem_buscarId,
  mem_atribuirVendedor, mem_solicitarAcao,
  mem_aprovar, mem_rejeitar, mem_adicionarObs,
  mem_getConfig,
} from '@/lib/db-memory';
import { randomUUID } from 'crypto';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

      // Enviar email via Resend se configurado
      let emailEnviado = false;
      if (cfg.resend_api_key && c.email) {
        try {
          await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${cfg.resend_api_key}` },
            body: JSON.stringify({
              from: 'PeptideZ Health <noreply@peptidezhealth.com.br>',
              to: c.email,
              subject: 'Seu acesso foi aprovado — PeptideZ Health',
              html: `<p>Olá <strong>${nomeCliente}</strong>,</p>
<p>Seu cadastro foi <strong>aprovado</strong>! Acesse sua loja exclusiva:</p>
<p><a href="${lojaUrl}" style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;display:inline-block">Acessar Minha Loja</a></p>
<p>Link direto: <a href="${lojaUrl}">${lojaUrl}</a></p>
<p>Em caso de dúvidas, entre em contato pelo WhatsApp: ${whatsappNumero}</p>`,
            }),
          });
          emailEnviado = true;
        } catch {}
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
