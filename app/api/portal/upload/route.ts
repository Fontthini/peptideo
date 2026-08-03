import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarMembroPorToken } from '@/lib/db-memory';
import { ensureEquipe } from '@/lib/ensure-equipe';
import { supabase } from '@/lib/supabase-client';

async function checkDesigner(req: NextRequest) {
  await ensureEquipe();
  const token = req.headers.get('x-member-token') || '';
  const m = mem_buscarMembroPorToken(token);
  return m && ['designer', 'superadmin', 'gerente'].includes(m.cargo) ? m : null;
}

export async function POST(req: NextRequest) {
  if (!await checkDesigner(req)) return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo inválido. Use JPG, PNG, WebP, GIF ou PDF.' }, { status: 400 });
    }

    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'Arquivo muito grande. Máximo 10MB.' }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
    const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage.from('uploads').upload(filename, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
    });
    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from('uploads').getPublicUrl(filename);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err) {
    console.error('[PORTAL-UPLOAD]', err);
    return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 });
  }
}
