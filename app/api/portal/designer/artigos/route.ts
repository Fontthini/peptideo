import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken, mem_listarArtigos, mem_criarArtigo, mem_editarArtigo, mem_deletarArtigo, mem_registrarLog } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';

async function checkDesigner(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const m = mem_buscarMembroPorToken(token);
  return m && ['designer', 'superadmin', 'gerente'].includes(m.cargo) ? m : null;
}

export async function GET(req: NextRequest) {
  if (!await checkDesigner(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  return NextResponse.json(mem_listarArtigos());
}

export async function POST(req: NextRequest) {
  const membro = await checkDesigner(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const data = await req.json();
  if (!data.titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
  const a = mem_criarArtigo({ titulo: data.titulo, conteudo: data.conteudo || '', imagem: data.imagem, video: data.video, categoria: data.categoria, materiais: data.materiais || [], publicado: data.publicado ?? false });
  try { const { sbSaveArtigo } = await import('@/lib/supabase-sync'); await sbSaveArtigo(a); } catch (e) { console.error('[ARTIGO] save error:', e); }
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Criou artigo (portal)', a.titulo);
  return NextResponse.json(a, { status: 201 });
}

export async function PUT(req: NextRequest) {
  const membro = await checkDesigner(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const { id, ...rest } = data;
  const a = mem_editarArtigo(id, rest);
  if (!a) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
  try { const { sbSaveArtigo } = await import('@/lib/supabase-sync'); await sbSaveArtigo(a); } catch (e) { console.error('[ARTIGO] save error:', e); }
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Editou artigo (portal)', a.titulo);
  return NextResponse.json(a);
}

export async function DELETE(req: NextRequest) {
  const membro = await checkDesigner(req);
  if (!membro) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
  const { id } = await req.json();
  const alvo = mem_listarArtigos().find(a => a.id === id);
  const ok = mem_deletarArtigo(id);
  if (!ok) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
  mem_registrarLog(`${membro.nome} (${membro.cargo})`, 'Excluiu artigo (portal)', alvo?.titulo || id);
  return NextResponse.json({ ok: true });
}
