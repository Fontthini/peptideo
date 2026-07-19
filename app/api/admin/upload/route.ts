import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || '48139148');
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) return NextResponse.json({ error: 'Nenhum arquivo enviado' }, { status: 400 });

    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Tipo inválido. Use JPG, PNG, WebP ou GIF.' }, { status: 400 });
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
    console.error('[UPLOAD]', err);
    return NextResponse.json({ error: 'Erro ao salvar arquivo' }, { status: 500 });
  }
}
