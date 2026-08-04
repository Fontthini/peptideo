// Paleta reutilizada do restante do admin (NAV_COLOR, status pills etc.) para
// que etiquetas de lead fiquem visualmente consistentes com o resto do painel.
export const ETIQUETA_CORES = [
  '#16a34a', '#4f46e5', '#0d9488', '#db2777', '#0891b2',
  '#ca8a04', '#dc2626', '#7c3aed', '#ea580c', '#2563eb', '#be123c',
] as const;

// Mesmo nome de etiqueta sempre cai na mesma cor (hash simples e estavel).
export function corDaEtiqueta(nome: string): string {
  let hash = 0;
  for (let i = 0; i < nome.length; i++) hash = (hash * 31 + nome.charCodeAt(i)) >>> 0;
  return ETIQUETA_CORES[hash % ETIQUETA_CORES.length];
}
