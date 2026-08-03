import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarDespesas, mem_criarDespesa, mem_editarDespesa, mem_registrarLog } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

// Gerente/superadmin do portal podem visualizar, criar e editar o
// financeiro, mas nao excluir (isso continua so no /admin).
function checkGerente(req: NextRequest) {
  const token = req.headers.get('x-member-token') || '';
  const membro = mem_buscarMembroPorToken(token);
  return membro && ['gerente', 'superadmin'].includes(membro.cargo) ? membro : null;
}

export async function GET(req: NextRequest) {
  await ensureEquipe();
  if (!checkGerente(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  try {
    const { sbListarDespesas } = await import('@/lib/supabase-sync');
    const despesas = await sbListarDespesas();
    return NextResponse.json(despesas);
  } catch (e) {
    console.error('[PORTAL-DESPESAS] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarDespesas());
}

export async function POST(req: NextRequest) {
  await ensureEquipe();
  const membro = checkGerente(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const data = await req.json();
  const { tipo, categoria, descricao, valor, data: dataLancamento } = data;
  if (!tipo || !categoria || !descricao || !valor || !dataLancamento) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  }
  if (tipo !== 'entrada' && tipo !== 'saida') return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });

  const d = mem_criarDespesa({ tipo, categoria, descricao, valor: parseFloat(valor), data: dataLancamento });
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, `Registrou ${tipo === 'entrada' ? 'entrada' : 'saída'} (portal)`, `${categoria} — ${descricao} — R$ ${d.valor.toFixed(2)}`);
  return NextResponse.json(d, { status: 201 });
}

export async function PUT(req: NextRequest) {
  await ensureEquipe();
  const membro = checkGerente(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const { id, tipo, categoria, descricao, valor, data: dataLancamento, comprovante_url } = data;

  // Instancia fria pode nao ter o lancamento no cache local (ele so existe no
  // Supabase) — nesse caso edita direto la, sem depender do cache em memoria.
  let d = mem_editarDespesa(id, {
    tipo, categoria, descricao,
    valor: valor !== undefined ? parseFloat(valor) : undefined,
    data: dataLancamento,
    comprovante_url,
  });

  if (!d) {
    try {
      const { sbListarDespesas, sbSaveDespesa } = await import('@/lib/supabase-sync');
      const existente = (await sbListarDespesas()).find(x => x.id === id);
      if (!existente) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
      d = {
        ...existente,
        ...(tipo !== undefined && { tipo }),
        ...(categoria !== undefined && { categoria }),
        ...(descricao !== undefined && { descricao }),
        ...(valor !== undefined && { valor: parseFloat(valor) }),
        ...(dataLancamento !== undefined && { data: dataLancamento }),
        ...(comprovante_url !== undefined && { comprovante_url }),
        updated_at: new Date().toISOString(),
      };
      await sbSaveDespesa(d);
    } catch (e) {
      console.error('[PORTAL-DESPESAS] Supabase edit error:', e);
      return NextResponse.json({ error: 'Erro ao editar lançamento' }, { status: 500 });
    }
  }

  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Editou lançamento financeiro (portal)', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
  return NextResponse.json(d);
}
