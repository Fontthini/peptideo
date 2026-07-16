import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarId, mem_aprovar } from '@/lib/db-memory';
import { enviarEmailAprovacao } from '@/lib/email';
import { enviarWhatsApp } from '@/lib/whatsapp';
import { v4 as uuidv4 } from 'uuid';

function checkAdmin(req: NextRequest) {
  const key = req.headers.get('x-admin-key');
  return key === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  try {
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

    const token = uuidv4();
    const cadastro = mem_buscarId(id);
    if (!cadastro) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });

    mem_aprovar(id, token);

    // Email via Resend
    const emailResult = await enviarEmailAprovacao(cadastro.nome, cadastro.email, token);

    // WhatsApp via Z-API ou link
    const waResult = await enviarWhatsApp(cadastro.whatsapp, cadastro.nome, token);

    return NextResponse.json({
      ok: true,
      token,
      nome: cadastro.nome,
      whatsapp: cadastro.whatsapp,
      emailEnviado: emailResult.ok,
      waEnviado: waResult.ok,
      waVia: waResult.via,
      waLink: waResult.link,
    });

  } catch (err) {
    console.error('[APROVAR]', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
