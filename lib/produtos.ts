export type Produto = {
  id: number;
  nome: string;
  dose: string;
  preco: number;
  categoria: string;
  descricao: string;
  imagem: string;
};

export const CATEGORIAS = [
  'Emagrecimento',
  'Libido',
  'Regenerativos',
  'Imunomodeladores',
  'Cognição',
  'Pele',
  'Saúde do Sono',
  'Anti-Aging',
  'Estimulantes de GH',
  'Mitocondriais',
];

export const PRODUTOS: Produto[] = [
  { id: 1, nome: 'BPC-157', dose: '10mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 2, nome: 'TB-500', dose: '10mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 3, nome: 'GHK-Cu', dose: '100mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 4, nome: 'Epitalon', dose: '50mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 5, nome: 'DSIP', dose: '5mg', preco: 0, categoria: 'Saúde do Sono', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 6, nome: 'Ipamorelin', dose: '10mg', preco: 0, categoria: 'Emagrecimento', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 7, nome: 'Tesamorelin', dose: '10mg', preco: 0, categoria: 'Emagrecimento', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 8, nome: 'CJC-1295 without DAC', dose: '10mg', preco: 0, categoria: 'Emagrecimento', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 9, nome: 'KLOW', dose: '80mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 10, nome: 'MOTSc', dose: '40mg', preco: 0, categoria: 'Emagrecimento', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 11, nome: 'SS-31', dose: '50mg', preco: 0, categoria: 'Anti-Aging', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 12, nome: 'KPV', dose: '10mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 13, nome: 'PT-141', dose: '10mg', preco: 0, categoria: 'Libido', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 14, nome: 'Semax', dose: '10mg', preco: 0, categoria: 'Cognição', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 15, nome: 'Selank', dose: '10mg', preco: 0, categoria: 'Cognição', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 16, nome: 'ARA-290', dose: '15mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 17, nome: 'SLU-PP-332', dose: '5mg', preco: 0, categoria: 'Emagrecimento', descricao: '', imagem: '/produtos/frasco.svg' },
  { id: 18, nome: 'Thymosin Alpha-1', dose: '10mg', preco: 0, categoria: 'Regenerativos', descricao: '', imagem: '/produtos/frasco.svg' },
];

export function getProdutosPorCategoria(categoria: string) {
  return PRODUTOS.filter(p => p.categoria === categoria);
}
