import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarToken, mem_criarIndicacao, mem_getConfig } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { token, nome, sobrenome, whatsapp, email, endereco } = body;

    if (!token || !nome || !whatsapp || !endereco) {
      return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
    }

    await reloadFromSupabase();

    const medico = mem_buscarToken(token);
    if (!medico) {
      return NextResponse.json({ error: 'Link de indicação inválido.' }, { status: 404 });
    }

    const medicoNome = `${medico.nome} ${medico.sobrenome || ''}`.trim();
    const i = mem_criarIndicacao({
      medico_id: medico.id, medico_nome: medicoNome,
      nome, sobrenome: sobrenome || '', whatsapp, email: email || '', endereco,
    });

    try {
      const { sbSaveIndicacao } = await import('@/lib/supabase-sync');
      await sbSaveIndicacao(i);
    } catch (e) {
      console.error('[INDICACAO] Supabase save error:', e);
    }

    const cfg = mem_getConfig();
    return NextResponse.json({ ok: true, id: i.id, medico_nome: medicoNome, whatsapp_numero: cfg.whatsapp_numero }, { status: 201 });

  } catch (err) {
    console.error('[INDICACAO]', err);
    return NextResponse.json({ error: 'Erro interno.' }, { status: 500 });
  }
}
