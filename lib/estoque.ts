// Casa item vendido -> produto do catalogo mesmo quando o nome foi digitado
// de forma diferente na hora da venda (com/sem traço final, com/sem "- 30mg"
// no nome em vez de usar o campo dose). Sem isso, vendas com nome levemente
// diferente do catalogo somem da baixa de estoque (ficam de fora do Map por
// nome exato) e o produto aparece com mais estoque do que realmente tem.
function baseNomeProduto(nome: string): string {
  return nome
    .trim()
    .toLowerCase()
    .replace(/\s*-?\s*\d+\s*mg\s*$/i, '')
    .replace(/\s*-\s*$/, '')
    .trim();
}

// Acha qual produto do catalogo um item vendido representa, mesmo com nome
// digitado diferente — casa pelo nome base e desempata pelo preco mais
// proximo (as doses diferentes do mesmo peptideo tem precos diferentes).
export function casarProdutoId<P extends { id: string; nome: string; preco: number }>(
  produtos: P[],
  item: { nome: string; preco: number }
): string | null {
  const base = baseNomeProduto(item.nome);
  let melhor: P | null = null;
  let menorDiff = Infinity;
  produtos.forEach(p => {
    if (baseNomeProduto(p.nome) !== base) return;
    const diff = Math.abs((p.preco || 0) - item.preco);
    if (diff < menorDiff) { menorDiff = diff; melhor = p; }
  });
  return melhor ? (melhor as P).id : null;
}

export function calcularVendidoPorProduto<P extends { id: string; nome: string; preco: number }>(
  produtos: P[],
  itensVendidos: { nome: string; preco: number; quantidade: number }[]
): Map<string, number> {
  const vendidoPorId = new Map<string, number>();
  itensVendidos.forEach(it => {
    const id = casarProdutoId(produtos, it);
    if (!id) return;
    vendidoPorId.set(id, (vendidoPorId.get(id) || 0) + it.quantidade);
  });
  return vendidoPorId;
}
