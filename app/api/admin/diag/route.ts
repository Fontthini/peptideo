import { NextRequest, NextResponse } from 'next/server';

// Diagnostico TEMPORARIO: mostra o formato das env vars do Supabase sem expor os valores.
// Remover depois de resolver o problema da SUPABASE_SERVICE_ROLE_KEY.
export async function GET(req: NextRequest) {
  if (req.headers.get('x-diag-key') !== 'peptidez2025') {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  }

  const inspect = (name: string) => {
    const raw = process.env[name];
    if (raw === undefined) return { presente: false };
    const naoAscii = [...raw].filter(ch => ch.charCodeAt(0) < 0x21 || ch.charCodeAt(0) > 0x7e);
    return {
      presente: true,
      tamanho: raw.length,
      inicio: raw.slice(0, 14),
      fim: raw.slice(-10),
      partes_jwt: raw.split('.').length,
      tem_nome_da_var_junto: raw.includes('='),
      caracteres_invalidos: naoAscii.map(ch => ch.charCodeAt(0)),
    };
  };

  return NextResponse.json({
    SUPABASE_SERVICE_ROLE_KEY: inspect('SUPABASE_SERVICE_ROLE_KEY'),
    SUPABASE_KEY: inspect('SUPABASE_KEY'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: inspect('NEXT_PUBLIC_SUPABASE_ANON_KEY'),
    NEXT_PUBLIC_SUPABASE_URL: inspect('NEXT_PUBLIC_SUPABASE_URL'),
    // tamanho esperado da service key correta: 219, partes_jwt: 3
    tamanho_esperado_service_key: 219,
  });
}
