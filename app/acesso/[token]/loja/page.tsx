import Link from 'next/link';
import { mem_buscarToken, mem_listarProdutos, mem_seedProdutos, mem_getConfig, mem_listarBanners } from '@/lib/db-memory';
import { PRODUTOS, CATEGORIAS } from '@/lib/produtos';
import { reloadFromSupabase } from '@/lib/ensure-equipe';
import LojaClient from './LojaClient';

async function getUsuario(token: string) {
  await reloadFromSupabase();
  return mem_buscarToken(token);
}

export type ProdutoUnificado = {
  id: string;
  nome: string;
  dose: string;
  preco: number;
  categoria: string;
  categoria2?: string | null;
  descricao: string;
  imagem: string;
  video?: string;
  galeria?: string[];
};

export default async function LojaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const usuario = await getUsuario(token);

  if (!usuario) {
    return (
      <div style={{ minHeight: '100vh', background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>🔒</div>
          <p style={{ color: '#6b7280' }}>Acesso inválido.</p>
          <Link href="/" style={{ color: '#16a34a' }}>Voltar ao início</Link>
        </div>
      </div>
    );
  }

  mem_seedProdutos(PRODUTOS);
  const todosProdutos: ProdutoUnificado[] = mem_listarProdutos().map(p => ({
    ...p,
    imagem: p.imagem === '/produtos/frasco.png' ? '/produtos/frasco.svg' : (p.imagem || '/produtos/frasco.svg'),
  }));
  const categoriasUsadas = new Set(todosProdutos.flatMap(p => [p.categoria, p.categoria2].filter(Boolean) as string[]));
  const todasCategorias = [...CATEGORIAS, ...Array.from(categoriasUsadas).filter(c => !CATEGORIAS.includes(c))];

  const cfg = mem_getConfig();
  const banners = mem_listarBanners();

  return (
    <LojaClient
      token={token}
      nomeUsuario={usuario.nome}
      sobrenomeUsuario={usuario.sobrenome || ''}
      whatsappUsuario={usuario.whatsapp || ''}
      produtos={todosProdutos}
      categorias={todasCategorias}
      whatsappNumero={cfg.whatsapp_numero || '5511999999999'}
      banners={banners}
    />
  );
}
