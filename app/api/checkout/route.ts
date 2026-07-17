import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarToken, mem_getConfig, mem_criarPedido } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

async function getUsuario(token: string) {
  await reloadFromSupabase();
  return mem_buscarToken(token);
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const token = formData.get('token') as string;
    const nome = formData.get('nome') as string;
    const preco = parseFloat(formData.get('preco') as string);

    const usuario = await getUsuario(token);
    if (!usuario) {
      return NextResponse.redirect(new URL('/', req.url));
    }

    // Registrar pedido pendente
    mem_criarPedido({
      cadastro_id: usuario.id,
      cadastro_nome: usuario.nome + (usuario.sobrenome ? ' ' + usuario.sobrenome : ''),
      cadastro_email: usuario.email,
      produto_nome: nome,
      preco,
      status: 'em_aberto',
    });

    // Integração Mercado Pago — lê config da memória ou env
    const cfg = mem_getConfig();
    const mpToken = cfg.mercadopago_token || process.env.MERCADOPAGO_ACCESS_TOKEN;
    const waNumero = cfg.whatsapp_numero || '5511999999999';
    const baseUrl = cfg.base_url || process.env.NEXT_PUBLIC_BASE_URL || `${req.nextUrl.protocol}//${req.nextUrl.host}`;

    if (!mpToken) {
      const msg = encodeURIComponent(`Olá! Quero comprar: ${nome} - R$ ${preco.toFixed(2)}\n\nNome: ${usuario.nome}\nEmail: ${usuario.email}`);
      return NextResponse.redirect(new URL(`https://wa.me/${waNumero}?text=${msg}`, req.url));
    }

    const preference = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${mpToken}`,
      },
      body: JSON.stringify({
        items: [{
          title: nome,
          quantity: 1,
          unit_price: preco,
          currency_id: 'BRL',
        }],
        payer: {
          name: usuario.nome,
          email: usuario.email,
        },
        back_urls: {
          success: `${baseUrl}/acesso/${token}/loja?status=sucesso`,
          failure: `${baseUrl}/acesso/${token}/loja?status=erro`,
          pending: `${baseUrl}/acesso/${token}/loja?status=pendente`,
        },
        auto_return: 'approved',
        statement_descriptor: 'PeptideZ Health',
      }),
    });

    const prefData = await preference.json();
    if (!prefData.init_point) {
      throw new Error('Erro ao criar preferência MP');
    }

    return NextResponse.redirect(new URL(prefData.init_point, req.url));
  } catch (err) {
    console.error('[CHECKOUT]', err);
    return NextResponse.json({ error: 'Erro ao processar pagamento' }, { status: 500 });
  }
}
