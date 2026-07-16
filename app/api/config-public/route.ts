import { NextResponse } from 'next/server';
import { mem_getConfig } from '@/lib/db-memory';

export async function GET() {
  const cfg = mem_getConfig();
  return NextResponse.json({
    logo: cfg.logo || '',
    corPrimaria: cfg.corPrimaria || '#111827',
    corAcento: cfg.corAcento || '#16a34a',
  });
}
