import { NextRequest, NextResponse } from 'next/server';
import { mem_criar, mem_buscarEmail, mem_getConfig, mem_proximoVendedor, mem_atribuirVendedor } from '@/lib/db-memory';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu } = body;

    if (!nome || !sobrenome || !email || !whatsapp || !endereco) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
      try {
        const { criarCadastro, initDB, buscarPorEmail } = await import('@/lib/db');
        await initDB();
        const existente = await buscarPorEmail(email);
        if (existente) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
        const c = await criarCadastro({ nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu });
        return NextResponse.json({ ok: true, id: c.id }, { status: 201 });
      } catch (e) {
        console.error('[DB]', e);
      }
    }

    if (mem_buscarEmail(email)) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }
    const c = mem_criar({ nome, sobrenome: sobrenome || '', email, whatsapp, endereco, crm: crm || null, onde_conheceu: onde_conheceu || null });

    // Round-robin: atribui automaticamente ao próximo vendedor ativo
    const vendedorId = mem_proximoVendedor();
    if (vendedorId) mem_atribuirVendedor(c.id, vendedorId);

    const cfg = mem_getConfig();
    return NextResponse.json({ ok: true, id: c.id, whatsapp_numero: cfg.whatsapp_numero }, { status: 201 });

  } catch (err) {
    console.error('[CADASTRO]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
