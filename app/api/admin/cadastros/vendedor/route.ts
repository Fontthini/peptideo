import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_atribuirVendedor, mem_buscarId, mem_registrarLog, mem_listarEquipe } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

export async function PUT(req: NextRequest) {
  if (!isAdminKeyValid(req.headers.get('x-admin-key'))) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadFromSupabase();
  const { id, vendedor_id } = await req.json();
  if (!id || !vendedor_id) return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  const vendedor = mem_listarEquipe().find(m => m.id === vendedor_id);
  if (!vendedor) return NextResponse.json({ error: 'Consultor não encontrado' }, { status: 404 });

  const c = mem_atribuirVendedor(id, vendedor_id);
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Transferiu lead de consultor', `${c.nome} ${c.sobrenome || ''}`.trim() + ` → ${vendedor.nome}`);
  return NextResponse.json(c);
}
