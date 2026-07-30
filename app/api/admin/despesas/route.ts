import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
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
  const { id, tipo, categoria, descricao, valor, data: dataLancamento } = data;
  const d = mem_editarDespesa(id, {
    tipo, categoria, descricao,
    valor: valor !== undefined ? parseFloat(valor) : undefined,
    data: dataLancamento,
  });
  if (!d) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou lançamento financeiro', `${d.categoria} — ${d.descricao} — R$ ${d.valor.toFixed(2)}`);
  return NextResponse.json(d);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  const { id } = await req.json();
  const alvo = mem_listarDespesas().find(d => d.id === id);
  const ok = mem_deletarDespesa(id);
  if (!ok) return NextResponse.json({ error: 'Lançamento não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu lançamento financeiro', alvo ? `${alvo.categoria} — ${alvo.descricao} — R$ ${alvo.valor.toFixed(2)}` : id);
  return NextResponse.json({ ok: true });
}
