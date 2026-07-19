// Remove qualquer caractere não-ASCII imprimível (BOM, bullets •, espaços/quebras
// coladas acidentalmente ao colar a chave no painel de env vars) que corromperia
// os headers HTTP (mesmo problema já visto na chave do Supabase).
export function cleanSecret(s: string | undefined): string {
  return (s || '').replace(/[^\x21-\x7E]/g, '').trim();
}
