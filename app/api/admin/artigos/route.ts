import { NextRequest, NextResponse } from 'next/server';
import { mem_listarArtigos, mem_criarArtigo, mem_editarArtigo, mem_deletarArtigo } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  return NextResponse.json(mem_listarArtigos());
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const data = await req.json();
  if (!data.titulo) return NextResponse.json({ error: 'Título obrigatório' }, { status: 400 });
  const a = mem_criarArtigo({
    titulo: data.titulo, conteudo: data.conteudo || '',
    imagem: data.imagem || undefined, video: data.video || undefined,
    categoria: data.categoria || undefined,
    materiais: Array.isArray(data.materiais) ? data.materiais : [],
    publicado: data.publicado ?? false,
  });
  try { const { sbSaveArtigo } = await import('@/lib/supabase-sync'); await sbSaveArtigo(a); } catch (e) { console.error('[ARTIGO] save error:', e); }
  return NextResponse.json(a, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const a = mem_editarArtigo(data.id, {
    titulo: data.titulo, conteudo: data.conteudo || '',
    imagem: data.imagem || undefined, video: data.video || undefined,
    categoria: data.categoria || undefined,
    materiais: Array.isArray(data.materiais) ? data.materiais : [],
    publicado: data.publicado ?? false,
  });
  if (!a) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
  try { const { sbSaveArtigo } = await import('@/lib/supabase-sync'); await sbSaveArtigo(a); } catch (e) { console.error('[ARTIGO] save error:', e); }
  return NextResponse.json(a);
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const { id } = await req.json();
  try {
    const { sbDeleteArtigo } = await import('@/lib/supabase-sync');
    await sbDeleteArtigo(id);
  } catch (e) {
    console.error('[ARTIGO] Supabase delete error:', e);
    return NextResponse.json({ error: 'Erro ao excluir no banco de dados.' }, { status: 500 });
  }
  const ok = mem_deletarArtigo(id);
  if (!ok) return NextResponse.json({ error: 'Artigo não encontrado' }, { status: 404 });
  return NextResponse.json({ ok: true });
}
