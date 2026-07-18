import { createClient } from '@supabase/supabase-js';

// Remove qualquer caractere não-ASCII imprimível (BOM, bullets •, espaços/quebras
// coladas acidentalmente no painel de env vars) que corromperia os headers HTTP.
const clean = (s: string | undefined) => (s || '').replace(/[^\x21-\x7E]/g, '').trim();

// Uma chave só vale se for um JWT de verdade (header.payload.assinatura). Isso
// descarta o valor mascarado do painel da Vercel ("eyJhbGci••••"), que tem o
// tamanho certo mas vira uma parte só depois da limpeza.
const isJwt = (s: string) => s.split('.').length === 3 && s.length > 100;
const firstValidKey = (...vals: (string | undefined)[]) => vals.map(clean).find(isJwt) || '';

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = firstValidKey(
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  process.env.SUPABASE_KEY,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
);

export const supabase = createClient(url, key);
export const useSupabase = () => !!clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
