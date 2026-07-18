import { createClient } from '@supabase/supabase-js';

// Remove qualquer caractere não-ASCII imprimível (BOM, bullets •, espaços/quebras
// coladas acidentalmente no painel de env vars) que corromperia os headers HTTP.
const clean = (s: string | undefined) => (s || '').replace(/[^\x21-\x7E]/g, '').trim();

const url = clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
const key = clean(process.env.SUPABASE_SERVICE_ROLE_KEY) || clean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

export const supabase = createClient(url, key);
export const useSupabase = () => !!clean(process.env.NEXT_PUBLIC_SUPABASE_URL);
