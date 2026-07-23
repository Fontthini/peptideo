import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarTodosBannersBlog, mem_adicionarBannerBlog, mem_deletarBannerBlog, mem_toggleBannerBlog, mem_registrarLog } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json(mem_listarTodosBannersBlog());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();
  if (!data.imagem) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 });
  const banner = mem_adicionarBannerBlog(data);
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Criou banner (blog)', banner.titulo || banner.id);
  return NextResponse.json(banner);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  const alvo = mem_listarTodosBannersBlog().find(b => b.id === id);
  const ok = mem_deletarBannerBlog(id);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu banner (blog)', alvo?.titulo || id);
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  const b = mem_toggleBannerBlog(id);
  if (!b) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), `Banner (blog) ${b.ativo ? 'ativado' : 'desativado'}`, b.titulo || b.id);
  return NextResponse.json(b);
}
