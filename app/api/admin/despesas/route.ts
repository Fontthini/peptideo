import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarDespesas, mem_criarDespesa, mem_editarDespesa, mem_deletarDespesa, mem_registrarLog } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { sbListarDespesas } = await import('@/lib/supabase-sync');
    const despesas = await sbListarDespesas();
    return NextResponse.json(despesas);
  } catch (e) {
    console.error('[DESPESAS] Supabase read error:', e);
  }
  return NextResponse.json(mem_listarDespesas());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();
  const { tipo, categoria, descricao, valor, data: dataLancamento } = data;
  if (!tipo || !categoria || !descricao || !valor || !dataLancamento) {
    return NextResponse.json({ error: 'Preencha todos os campos obrigatórios.' }, { status: 400 });
  }
  if (tipo !== 'entrada' && tipo !== 'saida') return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });

  const d = mem_criarDespesa({ tipo, categoria, descricao, valor: parseFloat(valor), data: dataLancamento });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), `Registrou ${tipo === 'entrada' ? 'entrada' : 'saída'}`, `${categoria} — ${descricao} — R$ ${d.valor.toFixed(2)}`);
  return NextResponse.json(d, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
      console.error('[DESPESAS] Supabase edit error:', e);
      return NextResponse.json({ error: 'Erro ao editar lançamento' }, { status: 500 });
    }
  }

  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou lançamento financeiro', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
  return NextResponse.json(d);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });

  const alvo = mem_listarDespesas().find(d => d.id === id);
  mem_deletarDespesa(id); // limpa do cache local, se estiver la

  // O Supabase e a fonte da verdade: apaga la direto, independente do lancamento
  // estar ou nao no cache em memoria desta instancia (evita 404 falso em
  // instancia fria que nunca carregou despesas.json com esse registro).
  try {
    const { sbDeleteDespesa } = await import('@/lib/supabase-sync');
    await sbDeleteDespesa(id);
  } catch (e) {
    console.error('[DESPESAS] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir lançamento' }, { status: 500 });
  }

  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu lançamento financeiro', alvo ? `${alvo.categoria} — ${alvo.descricao} — R$ ${alvo.valor.toFixed(2)}` : id);
  return NextResponse.json({ ok: true });
}
