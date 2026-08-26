import { NextRequest, NextResponse } from 'next/server';
import { isAdminKeyValid, isSuperadminKey, adminAtorFromKey } from '@/lib/admin-auth';
import { mem_listarProdutos, mem_criarProdutoComPersistencia, mem_deletarProdutoComPersistencia, mem_editarProduto, mem_seedProdutos, mem_duplicarProduto, mem_registrarLog } from '@/lib/db-memory';
import { PRODUTOS } from '@/lib/produtos';
import { reloadFromSupabase } from '@/lib/ensure-equipe';

function checkAdmin(req: NextRequest) {
  return isAdminKeyValid(req.headers.get('x-admin-key'));
}

function isSeeded(id: string) {
  return /^\d+$/.test(id) && parseInt(id, 10) <= 20;
}

export async function GET(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  mem_seedProdutos(PRODUTOS);
  return NextResponse.json(mem_listarProdutos().map(p => ({ ...p, custom: !isSeeded(p.id) })));
}

export async function POST(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  const data = await req.json();

  if (data.duplicar && data.id) {
    mem_seedProdutos(PRODUTOS);
    const copia = mem_duplicarProduto(data.id);
    if (!copia) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
    mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Duplicou produto', copia.nome);
    return NextResponse.json({ ...copia, custom: true }, { status: 201 });
  }

  if (!data.nome || !data.preco) return NextResponse.json({ error: 'Nome e preço obrigatórios' }, { status: 400 });
  const p = mem_criarProdutoComPersistencia({
    nome: data.nome,
    dose: data.dose || '',
    preco: parseFloat(data.preco) || 0,
    categoria: data.categoria || 'Outros',
    categoria2: data.categoria2 || null,
    descricao: data.descricao || '',
    imagem: data.imagem || '',
    video: data.video || undefined,
    protocolo: data.protocolo || undefined,
    galeria: Array.isArray(data.galeria) ? data.galeria : undefined,
  });
  try { const { sbSaveProduto } = await import('@/lib/supabase-sync'); await sbSaveProduto(p); } catch (e) { console.error('[PRODUTO] save error:', e); }
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Criou produto', p.nome);
  return NextResponse.json({ ...p, custom: true }, { status: 201 });
}

export async function PUT(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  await reloadFromSupabase();
  mem_seedProdutos(PRODUTOS);
  const data = await req.json();
  if (!data.id) return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 });
  const atual = mem_listarProdutos().find(x => x.id === data.id);
  if (!atual) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  const p = mem_editarProduto(data.id, {
    nome: data.nome !== undefined ? data.nome : atual.nome,
    dose: data.dose !== undefined ? data.dose : atual.dose,
    preco: data.preco !== undefined ? (parseFloat(data.preco) || 0) : atual.preco,
    categoria: data.categoria !== undefined ? data.categoria : atual.categoria,
    categoria2: data.categoria2 !== undefined ? data.categoria2 : atual.categoria2,
    descricao: data.descricao !== undefined ? data.descricao : atual.descricao,
    imagem: data.imagem !== undefined ? data.imagem : atual.imagem,
    video: data.video !== undefined ? data.video : atual.video,
    protocolo: data.protocolo !== undefined ? data.protocolo : atual.protocolo,
    galeria: data.galeria !== undefined ? (Array.isArray(data.galeria) ? data.galeria : []) : atual.galeria,
    estoque_inicial: data.estoque_inicial !== undefined ? (parseFloat(data.estoque_inicial) || 0) : atual.estoque_inicial,
    estoque_minimo: data.estoque_minimo !== undefined ? (parseFloat(data.estoque_minimo) || 0) : atual.estoque_minimo,
    custo: data.custo !== undefined ? (parseFloat(data.custo) || 0) : atual.custo,
  });
  if (!p) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  try { const { sbSaveProduto } = await import('@/lib/supabase-sync'); await sbSaveProduto(p); } catch (e) { console.error('[PRODUTO] save error:', e); }
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Editou produto', p.nome);
  return NextResponse.json({ ...p, custom: !isSeeded(p.id) });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdmin(req)) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
  if (!isSuperadminKey(req.headers.get('x-admin-key'))) return NextResponse.json({ error: 'Apenas o superadmin pode excluir.' }, { status: 403 });
  await reloadFromSupabase();
  const { id } = await req.json();
  if (isSeeded(id)) return NextResponse.json({ error: 'Produtos do catálogo não podem ser removidos' }, { status: 403 });
  const alvo = mem_listarProdutos().find(p => p.id === id);
  const ok = mem_deletarProdutoComPersistencia(id);
  if (!ok) return NextResponse.json({ error: 'Produto não encontrado' }, { status: 404 });
  mem_registrarLog(adminAtorFromKey(req.headers.get('x-admin-key')), 'Excluiu produto', alvo?.nome || id);
  return NextResponse.json({ ok: true });
}
