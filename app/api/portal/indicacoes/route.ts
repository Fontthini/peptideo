import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarIndicacoes, mem_listarIndicacoesPorMedicos, mem_listar, mem_criarIndicacao, mem_buscarId, mem_registrarLog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

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
