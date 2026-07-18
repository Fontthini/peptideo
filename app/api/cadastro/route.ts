import { NextRequest, NextResponse } from 'next/server';
import { mem_criar, mem_buscarEmail, mem_getConfig, mem_proximoVendedor, mem_atribuirVendedor } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu } = body;

    if (!nome || !sobrenome || !email || !whatsapp || !endereco || !crm) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    // Recarrega do Supabase para checar email duplicado e obter equipe para round-robin
    await reloadFromSupabase();

    if (mem_buscarEmail(email)) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }

    const c = mem_criar({ nome, sobrenome: sobrenome || '', email, whatsapp, endereco, crm: crm || null, onde_conheceu: onde_conheceu || null });

    // Round-robin: atribui automaticamente ao próximo vendedor ativo
    const vendedorId = mem_proximoVendedor();
    if (vendedorId) mem_atribuirVendedor(c.id, vendedorId);

    // Persiste no Supabase aguardando a resposta (evita que serverless mate o processo antes)
    try {
      const { sbSaveCadastro } = await import('@/lib/supabase-sync');
      await sbSaveCadastro({ ...c, vendedor_id: vendedorId || undefined });
    } catch (e) {
      console.error('[CADASTRO] Supabase save error:', e);
    }

    const cfg = mem_getConfig();
    return NextResponse.json({ ok: true, id: c.id, whatsapp_numero: cfg.whatsapp_numero }, { status: 201 });

  } catch (err) {
    console.error('[CADASTRO]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
