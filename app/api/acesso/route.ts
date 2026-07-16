import { NextRequest, NextResponse } from 'next/server';
import { mem_buscarToken } from '@/lib/db-memory';

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get('token');
  if (!token) return NextResponse.json(null);

  if (process.env.DATABASE_URL || process.env.POSTGRES_URL) {
    try {
      const { buscarPorToken } = await import('@/lib/db');
      const u = await buscarPorToken(token);
      return NextResponse.json(u ?? null);
    } catch (e) {
      console.error('[DB]', e);
    }
  }

  return NextResponse.json(mem_buscarToken(token) ?? null);
}
