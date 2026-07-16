const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://peptideo.vercel.app';

// Formata número: remove tudo que não é dígito, garante 55 (Brasil)
function formatarNumero(numero: string): string {
  const digits = numero.replace(/\D/g, '');
  if (digits.startsWith('55')) return digits;
  if (digits.length === 11 || digits.length === 10) return '55' + digits;
  return digits;
}

function montarMensagem(nome: string, token: string): string {
  const link = `${BASE_URL}/acesso/${token}`;
  return (
    `Olá, ${nome}! 🎉\n\n` +
    `Seu cadastro na *PeptideZ Health* foi *aprovado*!\n\n` +
    `Acesse agora sua área exclusiva com blog científico e loja completa:\n` +
    `${link}\n\n` +
    `_PeptideZ Health · Otimização Bioativa_`
  );
}

// Gera link wa.me para o admin clicar (sempre disponível como fallback)
export function gerarLinkWhatsApp(whatsapp: string, nome: string, token: string): string {
  const numero = formatarNumero(whatsapp);
  const mensagem = montarMensagem(nome, token);
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`;
}

// Envia via Z-API se configurado
export async function enviarWhatsApp(
  whatsapp: string, nome: string, token: string
): Promise<{ ok: boolean; via: 'zapi' | 'link'; link?: string }> {
  const numero = formatarNumero(whatsapp);
  const mensagem = montarMensagem(nome, token);
  const link = gerarLinkWhatsApp(whatsapp, nome, token);

  const zapiInstance = process.env.ZAPI_INSTANCE;
  const zapiToken = process.env.ZAPI_TOKEN;
  const zapiClientToken = process.env.ZAPI_CLIENT_TOKEN;

  if (zapiInstance && zapiToken) {
    try {
      const url = `https://api.z-api.io/instances/${zapiInstance}/token/${zapiToken}/send-text`;
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (zapiClientToken) headers['Client-Token'] = zapiClientToken;

      const res = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify({ phone: numero, message: mensagem }),
      });

      if (res.ok) {
        console.log(`[WHATSAPP] Enviado via Z-API para ${numero}`);
        return { ok: true, via: 'zapi' };
      }
      const err = await res.text();
      console.error('[WHATSAPP] Z-API erro:', err);
    } catch (err) {
      console.error('[WHATSAPP] Z-API falha:', err);
    }
  }

  // Fallback: retorna link para o admin clicar
  console.log(`[WHATSAPP] Link gerado para ${numero} (Z-API não configurado)`);
  return { ok: false, via: 'link', link };
}
