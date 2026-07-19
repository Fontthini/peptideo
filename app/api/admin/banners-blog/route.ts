import { NextRequest, NextResponse } from 'next/server';
import { mem_listarTodosBannersBlog, mem_adicionarBannerBlog, mem_deletarBannerBlog, mem_toggleBannerBlog } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json(mem_listarTodosBannersBlog());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();
  if (!data.imagem) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 });
  return NextResponse.json(mem_adicionarBannerBlog(data));
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  const ok = mem_deletarBannerBlog(id);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  const b = mem_toggleBannerBlog(id);
  if (!b) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(b);
}
