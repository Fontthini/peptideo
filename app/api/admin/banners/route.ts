import { NextRequest, NextResponse } from 'next/server';
import { mem_listarTodosBanners, mem_adicionarBanner, mem_deletarBanner, mem_toggleBanner } from '@/lib/db-memory';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  return NextResponse.json(mem_listarTodosBanners());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const data = await req.json();
  if (!data.imagem) return NextResponse.json({ error: 'Imagem obrigatória' }, { status: 400 });
  const banner = mem_adicionarBanner({ imagem: data.imagem, titulo: data.titulo || '', subtitulo: data.subtitulo || '' });
  return NextResponse.json(banner, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  const b = mem_toggleBanner(id);
  if (!b) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json(b);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  const { id } = await req.json();
  const ok = mem_deletarBanner(id);
  if (!ok) return NextResponse.json({ error: 'Não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
