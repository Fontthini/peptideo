// Formata um número no padrão brasileiro (separador de milhar "." e decimal
// ","), ex: 1234.5 -> "1.234,50". Usado em todo valor exibido em tela ou
// exportado em CSV (que já usa ";" como separador, ao gosto do Excel BR) —
// nunca em valores que vão de volta pra uma requisição/parseFloat.
export function brl(valor: number, casas = 2): string {
  return valor.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas });
}
