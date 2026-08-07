import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listar, mem_deletarCadastro, mem_editarCadastro, mem_buscarId, mem_registrarLog, mem_criar, mem_buscarEmail, mem_proximoVendedor, mem_atribuirVendedor } from '@/lib/db-memory';
import { reloadCadastros, ensureEquipe } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }
  await reloadCadastros();
  return NextResponse.json(mem_listar());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadCadastros();
  await ensureEquipe();
  const { nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu } = await req.json();
  if (!nome || !email || !whatsapp) return NextResponse.json({ error: 'Nome, e-mail e WhatsApp são obrigatórios' }, { status: 400 });
  if (mem_buscarEmail(email)) return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });

  const c = mem_criar({ nome, sobrenome: sobrenome || '', email, whatsapp, endereco: endereco || '', crm: crm || null, onde_conheceu: onde_conheceu || null });
  const vendedorId = mem_proximoVendedor();
  if (vendedorId) mem_atribuirVendedor(c.id, vendedorId);

  try {
    const { sbSaveCadastro } = await import('@/lib/supabase-sync');
    await sbSaveCadastro({ ...c, vendedor_id: vendedorId || undefined });
  } catch (e) {
    console.error('[CADASTRO] Supabase save error:', e);
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes('cadastros_email_key') || msg.includes('23505')) {
      return NextResponse.json({ error: 'E-mail já cadastrado.' }, { status: 409 });
    }
  }

  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Cadastrou médico manualmente', `${c.nome} ${c.sobrenome || ''}`.trim());
  return NextResponse.json({ ...c, vendedor_id: vendedorId || undefined }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadCadastros();
  const { id, nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu, cidade, estado, especialidade, cpf, produtos_interesse } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const c = mem_editarCadastro(id, { nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu, cidade, estado, especialidade, cpf, produtos_interesse });
  if (!c) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou cadastro', `${c.nome} ${c.sobrenome || ''}`.trim());
  return NextResponse.json(c);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  await reloadCadastros();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const alvo = mem_buscarId(id);

  // Apaga no Supabase primeiro: se falhar (ex: pedidos vinculados a este cadastro),
  // nao mexe na memoria local e devolve o motivo real em vez de um sucesso falso.
  try {
    const { sbDeleteCadastro } = await import('@/lib/supabase-sync');
    await sbDeleteCadastro(id);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[CADASTRO] Supabase delete error:', e);
    if (msg.includes('23503')) {
      return NextResponse.json({ error: 'Este cadastro tem pedidos vinculados e não pode ser excluído. Exclua os pedidos primeiro.' }, { status: 409 });
    }
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }

  const ok = mem_deletarCadastro(id);
  if (!ok) return NextResponse.json({ error: 'Cadastro não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu cadastro', alvo ? `${alvo.nome} ${alvo.sobrenome || ''}`.trim() : id);
  return NextResponse.json({ ok: true });
}
