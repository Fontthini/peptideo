import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarIndicacoes, mem_listarIndicacoesPorMedicos, mem_listar, mem_criarIndicacao, mem_buscarId, mem_registrarLog, mem_editarIndicacao, mem_deletarIndicacao } from '@/lib/db-memory';
import { reloadFromSupabase, ensureIndicacoes } from '@/lib/ensure-equipe';

function checkGerente(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  return membro && ['gerente', 'superadmin'].includes(membro.cargo) ? membro : null;
}

export async function GET(req: NextRequest) {
  await reloadFromSupabase();
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  if (membro.cargo === 'gerente' || membro.cargo === 'superadmin') {
    return NextResponse.json(mem_listarIndicacoes());
  }
  if (membro.cargo === 'vendedor') {
    const meusMedicosIds = mem_listar().filter(l => l.vendedor_id === membro.id).map(l => l.id);
    return NextResponse.json(mem_listarIndicacoesPorMedicos(meusMedicosIds));
  }
  return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
}

export async function POST(req: NextRequest) {
  await reloadFromSupabase();
  const membro = checkGerente(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { medico_id, nome, sobrenome, whatsapp, email, endereco } = await req.json();
  if (!medico_id || !nome || !whatsapp) return NextResponse.json({ error: 'Médico, nome e WhatsApp são obrigatórios' }, { status: 400 });
  const medico = mem_buscarId(medico_id);
  if (!medico) return NextResponse.json({ error: 'Médico não encontrado' }, { status: 404 });

  const i = mem_criarIndicacao({
    medico_id, medico_nome: `${medico.nome} ${medico.sobrenome || ''}`.trim(),
    nome, sobrenome: sobrenome || '', whatsapp, email: email || '', endereco: endereco || '',
    tipo: 'paciente',
  });
  try { const { sbSaveIndicacao } = await import('@/lib/supabase-sync'); await sbSaveIndicacao(i); } catch (e) { console.error('[PORTAL-INDICACOES] save error:', e); }
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Cadastrou paciente manualmente (portal)', `${i.nome} ${i.sobrenome || ''}`.trim());
  return NextResponse.json(i, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const membro = checkGerente(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  await ensureIndicacoes();
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const i = mem_editarIndicacao(data.id, {
    nome: data.nome, sobrenome: data.sobrenome || '', whatsapp: data.whatsapp,
    email: data.email || '', endereco: data.endereco || '',
    status: data.status, obs: data.obs || '',
  });
  if (!i) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  try { const { sbSaveIndicacao } = await import('@/lib/supabase-sync'); await sbSaveIndicacao(i); } catch (e) { console.error('[PORTAL-INDICACOES] save error:', e); }
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Editou indicação (portal)', `${i.nome} ${i.sobrenome || ''}`.trim());
  return NextResponse.json(i);
}

export async function DELETE(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  if (!membro) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (membro.cargo !== 'superadmin') return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  await ensureIndicacoes();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const alvo = mem_listarIndicacoes().find(i => i.id === id);
  try {
    const { sbDeleteIndicacao } = await import('@/lib/supabase-sync');
    await sbDeleteIndicacao(id);
  } catch (e) {
    console.error('[PORTAL-INDICACOES] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }
  const ok = mem_deletarIndicacao(id);
  if (!ok) return NextResponse.json({ error: 'Indicação não encontrada' }, { status: 404 });
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Excluiu indicação (portal)', alvo ? `${alvo.nome} ${alvo.sobrenome || ''}`.trim() : id);
  return NextResponse.json({ ok: true });
}
