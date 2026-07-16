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
  // Emagrecimento
  {
    id: 1,
    nome: 'SLU PP 332',
    dose: '5mg',
    preco: 999.00,
    categoria: 'Emagrecimento',
    descricao: 'Peptídeo para controle de peso e metabolismo lipídico.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 2,
    nome: 'AOD-9604',
    dose: '5mg',
    preco: 749.90,
    categoria: 'Emagrecimento',
    descricao: 'Fragmento do hormônio do crescimento, auxilia na queima de gordura.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 3,
    nome: 'CJC-1295 + Ipamorelin',
    dose: '5mg / 5mg',
    preco: 1299.00,
    categoria: 'Emagrecimento',
    descricao: 'Combinação sinérgica para estimulação do GH e emagrecimento.',
    imagem: '/produtos/frasco.svg',
  },
  // Libido
  {
    id: 4,
    nome: 'PT-141 (Bremelanotida)',
    dose: '10mg',
    preco: 899.00,
    categoria: 'Libido',
    descricao: 'Peptídeo com ação direta no sistema nervoso central para disfunção sexual.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 5,
    nome: 'Kisspeptin',
    dose: '5mg',
    preco: 799.90,
    categoria: 'Libido',
    descricao: 'Neuropeptídeo que regula a função reprodutiva e libido.',
    imagem: '/produtos/frasco.svg',
  },
  // Regenerativos
  {
    id: 6,
    nome: 'ARA-290',
    dose: '15mg',
    preco: 699.90,
    categoria: 'Regenerativos',
    descricao: 'Análogo da eritropoietina com potente ação anti-inflamatória e regeneradora.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 7,
    nome: 'BPC-157',
    dose: '5mg',
    preco: 649.90,
    categoria: 'Regenerativos',
    descricao: 'Pentadecapeptídeo com capacidade de regeneração de tecidos e tendões.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 8,
    nome: 'TB-500 (Thymosin Beta 4)',
    dose: '5mg',
    preco: 899.00,
    categoria: 'Regenerativos',
    descricao: 'Promove cicatrização acelerada e regeneração muscular.',
    imagem: '/produtos/frasco.svg',
  },
  // Imunomodeladores
  {
    id: 9,
    nome: 'Thymosin Alpha 1',
    dose: '10mg',
    preco: 1599.00,
    categoria: 'Imunomodeladores',
    descricao: 'Peptídeo imunomodulador produzido naturalmente pelo timo, fortalece a imunidade.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 10,
    nome: 'LL-37',
    dose: '5mg',
    preco: 1199.00,
    categoria: 'Imunomodeladores',
    descricao: 'Peptídeo antimicrobiano com propriedades imunomoduladoras.',
    imagem: '/produtos/frasco.svg',
  },
  // Cognição
  {
    id: 11,
    nome: 'Selank',
    dose: '10mg Liofilizado',
    preco: 649.90,
    categoria: 'Cognição',
    descricao: 'Peptídeo ansiolítico e nootrópico com melhora da memória e foco.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 12,
    nome: 'Semax',
    dose: '30mg',
    preco: 699.90,
    categoria: 'Cognição',
    descricao: 'Análogo do ACTH, melhora função cognitiva, foco e neuroproteção.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 13,
    nome: 'Dihexa',
    dose: '50mg',
    preco: 1299.00,
    categoria: 'Cognição',
    descricao: 'Potente nootrópico para regeneração e plasticidade neural.',
    imagem: '/produtos/frasco.svg',
  },
  // Pele
  {
    id: 14,
    nome: 'GHK-Cu (Cobre)',
    dose: '50mg',
    preco: 549.90,
    categoria: 'Pele',
    descricao: 'Peptídeo com cobre para rejuvenescimento e reparação da pele.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 15,
    nome: 'Melanotan II',
    dose: '10mg',
    preco: 599.90,
    categoria: 'Pele',
    descricao: 'Estimula melanogênese, bronzeamento e proteção solar natural.',
    imagem: '/produtos/frasco.svg',
  },
  // Saúde do Sono
  {
    id: 16,
    nome: 'DSIP (Sleep Inducing Peptide)',
    dose: '5mg',
    preco: 799.00,
    categoria: 'Saúde do Sono',
    descricao: 'Peptídeo indutor do sono delta, melhora qualidade e profundidade do sono.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 17,
    nome: 'Epithalon',
    dose: '100mg',
    preco: 1499.00,
    categoria: 'Anti-Aging',
    descricao: 'Tetrâmetro peptídico com ação anti-aging, ativa a telomerase.',
    imagem: '/produtos/frasco.svg',
  },
  // Estimulantes de GH
  {
    id: 18,
    nome: 'GHRP-6',
    dose: '5mg',
    preco: 499.90,
    categoria: 'Estimulantes de GH',
    descricao: 'Peptídeo liberador de GH de segunda geração, estimula forte pico de GH.',
    imagem: '/produtos/frasco.svg',
  },
  {
    id: 19,
    nome: 'Hexarelin',
    dose: '2mg',
    preco: 599.90,
    categoria: 'Estimulantes de GH',
    descricao: 'Secretagogo de GH com atividade cardioativa e regenerativa.',
    imagem: '/produtos/frasco.svg',
  },
  // Mitocondriais
  {
    id: 20,
    nome: 'SS-31 (Elamipretide)',
    dose: '10mg',
    preco: 1899.00,
    categoria: 'Mitocondriais',
    descricao: 'Peptídeo que penetra na membrana mitocondrial, protege e otimiza a função mitocondrial.',
    imagem: '/produtos/frasco.svg',
  },
];

export function getProdutosPorCategoria(categoria: string) {
  return PRODUTOS.filter(p => p.categoria === categoria);
}
