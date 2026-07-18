import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase-client';

function checkAdmin(req: NextRequest) {
  return req.headers.get('x-admin-key') === (process.env.ADMIN_PASSWORD || 'peptidez2025');
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  try {
    const { data, error } = await supabase.storage.from('uploads').list('', {
      sortBy: { column: 'created_at', order: 'desc' },
    });
    if (error || !data) return NextResponse.json([]);
    const files = data
      .filter(f => /\.(png|jpg|jpeg|webp|gif|svg)$/i.test(f.name))
      .map(f => supabase.storage.from('uploads').getPublicUrl(f.name).data.publicUrl);
    return NextResponse.json(files);
  } catch {
    return NextResponse.json([]);
  }
}
