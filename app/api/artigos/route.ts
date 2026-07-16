import { NextResponse } from 'next/server';
import { mem_listarArtigos } from '@/lib/db-memory';

export async function GET() {
  return NextResponse.json(mem_listarArtigos(true));
}
