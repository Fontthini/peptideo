import Link from 'next/link';
import { mem_buscarToken, mem_listarArtigos, mem_listarBannersBlog } from '@/lib/db-memory';
import { reloadFromSupabase } from '@/lib/ensure-equipe';
import BlogClient from './BlogClient';

async function getUsuario(token: string) {
  await reloadFromSupabase();
  return mem_buscarToken(token);
}

export default async function BlogPage({ params }: { params: Promise<{ token: string }> }) {
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

  const artigos = mem_listarArtigos(true);
  const banners = mem_listarBannersBlog().map(b => ({ imagem: b.imagem, titulo: b.titulo, subtitulo: b.subtitulo }));

  return <BlogClient token={token} nomeUsuario={usuario.nome} artigos={artigos} banners={banners} />;
}
