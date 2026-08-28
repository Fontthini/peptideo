'use client';
import { useState, useEffect } from 'react';
import { CATEGORIAS } from '@/lib/produtos';
import { estaOnline, HBarChart, LeadsChart30d, FaturamentoChart30d, type HBarItem } from '@/components/DashboardCharts';
import { DashboardOverview } from '@/components/DashboardOverview';
import { corDaEtiqueta } from '@/lib/etiquetas';

type Cadastro = {
  id: string; nome: string; sobrenome: string; email: string; whatsapp: string;
  endereco: string; crm: string | null; onde_conheceu: string | null;
  status: string; token: string | null; created_at: string;
  updated_at?: string; vendedor_id?: string | null; solicitacao?: string | null;
  last_seen_loja?: string | null; last_seen_blog?: string | null;
  tags?: string[];
  cidade?: string | null; estado?: string | null; especialidade?: string | null; cpf?: string | null;
  produtos_interesse?: string[];
  funil_status?: string; motivo_perda?: string | null;
};
type Produto = {
  id: string; nome: string; dose: string; preco: number;
  categoria: string; categoria2?: string | null; descricao: string; imagem: string;
  video?: string; galeria?: string[]; protocolo?: string;
  custom: boolean;
  views?: number; cart_adds?: number;
  views_hoje?: number; cart_adds_hoje?: number;
  estoque_inicial?: number; estoque_minimo?: number; custo?: number;
};
type Config = {
  mercadopago_token: string; resend_api_key: string; whatsapp_numero: string; base_url: string;
  banner_titulo: string; banner_subtitulo: string; banner_imagem: string; logo?: string; corPrimaria?: string; corAcento?: string;
  emails_enviados_hoje?: number; emails_dia_referencia?: string;
  emails_enviados_mes?: number; emails_mes_referencia?: string;
  limite_emails_dia?: number; limite_emails_mes?: number;
  cliques_cards?: Record<string, number>;
  cliques_cards_hoje?: Record<string, number>;
};
type BannerItem = { id: string; imagem: string; titulo: string; subtitulo: string; ativo: boolean; ordem: number; };
type Material = { nome: string; url: string };
type Artigo = { id: string; titulo: string; conteudo: string; imagem?: string; video?: string; categoria?: string; materiais: Material[]; publicado: boolean; created_at: string; updated_at: string; };
type Membro = { id: string; nome: string; email: string; cargo: string; ativo: boolean; created_at: string; senha?: string; token_acesso?: string; last_seen?: string | null; };
type PedidoItem = { nome: string; preco: number; quantidade: number };
type Pedido = { id: string; cadastro_id: string; cadastro_nome: string; cadastro_email: string; cadastro_whatsapp?: string; indicacao_id?: string | null; paciente_nome?: string; produto_nome: string; preco: number; itens?: PedidoItem[]; vendedor_id?: string; status: string; obs?: string; created_at: string; };
type Indicacao = { id: string; medico_id: string; medico_nome: string; nome: string; sobrenome: string; whatsapp: string; email: string; endereco: string; status: string; created_at: string; tipo?: 'paciente' | 'medico'; crm?: string; comissao_valor?: number | null; comissao_paga?: boolean; comissao_despesa_id?: string | null; };
type Despesa = { id: string; tipo: 'entrada' | 'saida'; categoria: string; descricao: string; valor: number; data: string; comprovante_url?: string; created_at: string; updated_at?: string; };

// Status compartilhado entre Pedidos e Indicações de pacientes (mesmo pipeline de venda).
const PIPELINE_STATUS_LABEL: Record<string, string> = {
  em_atendimento: 'Em Atendimento', negociacao: 'Negociação', pago: 'Pago', cancelado: 'Cancelado',
};
const PIPELINE_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  em_atendimento: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
  negociacao: { bg: 'var(--surface-hover)', text: 'var(--text)' },
  pago: { bg: '#f0fdf4', text: '#15803d' },
  cancelado: { bg: '#fef2f2', text: '#dc2626' },
};
// Status das indicações médico-para-médico (pipeline de recrutamento, diferente do de vendas).
const INDICACAO_MEDICA_STATUS_LABEL: Record<string, string> = {
  novo: 'Novo', contatado: 'Contatado', convertido: 'Convertido', reprovado: 'Reprovado',
};
const INDICACAO_MEDICA_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  novo: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' }, contatado: { bg: 'var(--surface-hover)', text: 'var(--text)' },
  convertido: { bg: '#f0fdf4', text: '#15803d' }, reprovado: { bg: '#fef2f2', text: '#dc2626' },
};

const ADMIN_KEY_LOCAL = 'admin_key';
const ADMIN_NOME_LOCAL = 'admin_nome';
const ADMIN_SUPERADMIN_LOCAL = 'admin_superadmin';
const ONLINE_THRESHOLD_MS = 90 * 1000;
type AdminLog = { id: string; ator: string; acao: string; detalhe?: string; created_at: string; };

function getKey() {
  return typeof window !== 'undefined' ? localStorage.getItem(ADMIN_KEY_LOCAL) || '' : '';
}

const inputStyle: React.CSSProperties = {
  width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8,
  padding: '10px 13px', color: 'var(--text)', fontSize: 14, fontFamily: 'inherit',
  outline: 'none', boxSizing: 'border-box',
};
const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700,
  color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px',
};

const FUNIL_ETAPAS = ['novo', 'primeiro_contato', 'aguardando_resposta', 'interessado', 'link_pix_enviado', 'cliente', 'perdido'] as const;
const FUNIL_LABEL: Record<string, string> = {
  novo: 'Novo Lead', primeiro_contato: 'Primeiro Contato', aguardando_resposta: 'Aguardando Resposta',
  interessado: 'Interessado', link_pix_enviado: 'Link/Pix Enviado', cliente: 'Cliente', perdido: 'Perdido',
};
const FUNIL_COLOR: Record<string, string> = {
  novo: 'var(--text-soft, #9ca3af)', primeiro_contato: 'var(--text-muted, #6b7280)', aguardando_resposta: 'var(--text-secondary, #374151)',
  interessado: 'var(--text-secondary, #374151)', link_pix_enviado: 'var(--text)', cliente: '#16a34a', perdido: '#dc2626',
};
// Cores fixas (nao seguem o tema) para o select do funil, que tem fundo sempre claro (#f1f5f9)
const FUNIL_COLOR_FIXO: Record<string, string> = {
  novo: '#9ca3af', primeiro_contato: '#6b7280', aguardando_resposta: '#4b5563',
  interessado: '#374151', link_pix_enviado: '#111827', cliente: '#16a34a', perdido: '#dc2626',
};
const MOTIVOS_PERDA = ['Sem dinheiro', 'Adiou para depois', 'Escolheu concorrente', 'Não respondeu', 'Sem tempo', 'Desistiu', 'Outro'];

function ToggleListaKanban({ kanban, onChange }: { kanban: boolean; onChange: (v: boolean) => void }) {
  return (
    <div style={{ display: 'inline-flex', background: 'var(--surface-hover)', borderRadius: 8, padding: 3, gap: 2 }}>
      {[['Lista', false], ['Kanban', true]].map(([label, val]) => (
        <button key={label as string} type="button" onClick={() => onChange(val as boolean)}
          style={{ padding: '6px 14px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: 700, fontFamily: 'inherit', background: kanban === val ? 'var(--btn-primary-bg)' : 'transparent', color: kanban === val ? 'var(--btn-primary-text)' : 'var(--text-muted, #6b7280)' }}>
          {label}
        </button>
      ))}
    </div>
  );
}

function KanbanBoard({ children }: { children: React.ReactNode }) {
  return <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 8, alignItems: 'flex-start' }}>{children}</div>;
}

function KanbanColuna({ titulo, cor, total, children }: { titulo: string; cor: string; total: number; children: React.ReactNode }) {
  return (
    <div style={{ minWidth: 250, maxWidth: 250, flexShrink: 0, background: 'var(--surface-hover)', borderRadius: 12, border: '1px solid var(--border)', display: 'flex', flexDirection: 'column', maxHeight: 'calc(100vh - 320px)' }}>
      <div style={{ padding: '11px 14px', borderTop: `3px solid ${cor}`, borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)', borderRadius: '10px 10px 0 0' }}>
        <span style={{ fontSize: 12, fontWeight: 800, color: cor }}>{titulo}</span>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', padding: '1px 8px', borderRadius: 10 }}>{total}</span>
      </div>
      <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 8, overflowY: 'auto', flex: 1 }}>
        {total === 0
          ? <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--text-soft, #9ca3af)', fontSize: 12 }}>Vazio</div>
          : children}
      </div>
    </div>
  );
}

function KanbanCard({ children, onClick }: { children: React.ReactNode; onClick?: () => void }) {
  return (
    <div onClick={onClick}
      style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.04)', cursor: onClick ? 'pointer' : 'default' }}>
      {children}
    </div>
  );
}

function ComissaoWidget({ id, comissaoValor, comissaoPaga, mostrar, totalBase, promptId, setPromptId, input, setInput, onConfirmar }: {
  id: string; comissaoValor?: number | null; comissaoPaga?: boolean; mostrar: boolean; totalBase: number;
  promptId: string | null; setPromptId: (id: string | null) => void;
  input: string; setInput: (v: string) => void; onConfirmar: (id: string, valor: number) => void;
}) {
  if (!mostrar) return null;
  if (comissaoPaga && promptId !== id) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>
          OK Comissão: {totalBase > 0 ? `${((comissaoValor || 0) / totalBase * 100).toFixed(2)}%` : `R$ ${(comissaoValor || 0).toFixed(2)}`}
        </div>
        <button onClick={() => {
          setPromptId(id);
          setInput(totalBase > 0 ? ((comissaoValor || 0) / totalBase * 100).toFixed(2) : String(comissaoValor || ''));
        }} style={{ background: 'none', border: 'none', color: '#6b7280', textDecoration: 'underline', cursor: 'pointer', fontSize: 10.5, fontFamily: 'inherit' }}>Editar</button>
      </div>
    );
  }
  if (promptId === id) {
    if (totalBase > 0) {
      const pct = parseFloat(input.replace(',', '.')) || 0;
      const valorCalculado = totalBase * pct / 100;
      return (
        <div style={{ marginTop: 4 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 10, color: '#6b7280' }}>Total: R$ {totalBase.toFixed(2)}</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
            <input autoFocus type="number" min="0" step="0.1" value={input} onChange={e => setInput(e.target.value)}
              placeholder="%" style={{ width: 50, border: '1px solid #d1d5db', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }} />
            <span style={{ fontSize: 11, color: '#6b7280' }}>%</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>= R$ {valorCalculado.toFixed(2)}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button onClick={() => onConfirmar(id, valorCalculado)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
            <button onClick={() => setPromptId(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>×</button>
          </div>
        </div>
      );
    }
    const valorManual = parseFloat(input.replace(',', '.')) || 0;
    return (
      <div style={{ marginTop: 4 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 9.5, color: '#9ca3af' }}>Sem pedido vinculado — informe o valor</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <input autoFocus type="number" min="0" step="0.01" value={input} onChange={e => setInput(e.target.value)}
            placeholder="R$ comissão" style={{ width: 90, border: '1px solid #d1d5db', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }} />
          <button onClick={() => onConfirmar(id, valorManual)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
          <button onClick={() => setPromptId(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13 }}>×</button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={e => { e.stopPropagation(); setPromptId(id); setInput(''); }}
      style={{ marginTop: 4, background: '#f0fdf4', color: '#16a34a', border: '1px dashed #86efac', padding: '2px 8px', borderRadius: 6, fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
      + Comissão
    </button>
  );
}

function EstoqueRow({ produto, vendido, onSalvar }: {
  produto: Produto; vendido: number;
  onSalvar: (id: string, dados: { estoque_inicial: number; custo: number }) => Promise<void>;
}) {
  const [inicial, setInicial] = useState(String(produto.estoque_inicial ?? 0));
  const [custo, setCusto] = useState(String(produto.custo ?? 0));
  const [salvando, setSalvando] = useState(false);

  const inicialNum = parseFloat(inicial) || 0;
  const custoNum = parseFloat(custo) || 0;
  const atual = inicialNum - vendido;
  const valorEstoque = Math.max(atual, 0) * custoNum;
  const status = inicialNum <= 0 ? 'nao_configurado' : atual <= 0 ? 'esgotado' : 'ok';
  const dirty = inicialNum !== (produto.estoque_inicial ?? 0) || custoNum !== (produto.custo ?? 0);

  const numInputStyle: React.CSSProperties = { width: 80, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' };

  return (
    <tr style={{ borderBottom: '1px solid var(--border)' }}>
      <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 600 }}>
        {produto.nome} <span style={{ color: 'var(--text-soft, #9ca3af)', fontWeight: 400 }}>{produto.dose}</span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <input type="number" min="0" step="1" value={inicial} onChange={e => setInicial(e.target.value)} style={numInputStyle} />
      </td>
      <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)' }}>{vendido}</td>
      <td style={{ padding: '10px 14px', fontWeight: 700, color: status === 'esgotado' ? '#dc2626' : status === 'nao_configurado' ? 'var(--text-muted, #6b7280)' : '#16a34a', fontVariantNumeric: 'tabular-nums' }}>{atual}</td>
      <td style={{ padding: '10px 14px' }}>
        <input type="number" min="0" step="0.01" value={custo} onChange={e => setCusto(e.target.value)} style={numInputStyle} />
      </td>
      <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)', fontVariantNumeric: 'tabular-nums' }}>R$ {produto.preco.toFixed(2)}</td>
      <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)', fontVariantNumeric: 'tabular-nums' }}>R$ {valorEstoque.toFixed(2)}</td>
      <td style={{ padding: '10px 14px' }}>
        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: status === 'esgotado' ? '#fef2f2' : status === 'nao_configurado' ? 'var(--surface-hover)' : '#f0fdf4', color: status === 'esgotado' ? '#dc2626' : status === 'nao_configurado' ? 'var(--text-muted, #6b7280)' : '#16a34a' }}>
          {status === 'esgotado' ? 'Esgotado' : status === 'nao_configurado' ? 'Não configurado' : 'OK'}
        </span>
      </td>
      <td style={{ padding: '10px 14px' }}>
        <button disabled={!dirty || salvando} onClick={async () => {
          setSalvando(true);
          await onSalvar(produto.id, { estoque_inicial: inicialNum, custo: custoNum });
          setSalvando(false);
        }} style={{ background: dirty ? 'var(--btn-primary-bg)' : 'var(--surface-hover)', color: dirty ? 'var(--btn-primary-text)' : 'var(--text-soft, #9ca3af)', border: 'none', padding: '6px 12px', borderRadius: 6, cursor: dirty ? 'pointer' : 'default', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>
          {salvando ? '...' : 'Salvar'}
        </button>
      </td>
    </tr>
  );
}

function dentroPeriodo(dataStr: string | undefined | null, inicio: string, fim: string): boolean {
  if (!dataStr) return false;
  const d = dataStr.slice(0, 10);
  if (inicio && d < inicio) return false;
  if (fim && d > fim) return false;
  return true;
}

function baixarCSV(nomeArquivo: string, headers: string[], linhas: (string | number)[][]) {
  const escapar = (v: string | number) => {
    const s = String(v);
    return /[;"\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const csv = [headers, ...linhas].map(row => row.map(escapar).join(';')).join('\n');
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = nomeArquivo;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const [tema, setTema] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const salvo = typeof window !== 'undefined' ? localStorage.getItem('admin_tema') : null;
    if (salvo === 'dark' || salvo === 'light') setTema(salvo);
  }, []);
  const alternarTema = () => {
    const novo = tema === 'light' ? 'dark' : 'light';
    setTema(novo);
    localStorage.setItem('admin_tema', novo);
  };

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [logado, setLogado] = useState(false);
  const [adminNome, setAdminNome] = useState('');
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [aba, setAba] = useState<'leads' | 'clientes' | 'produtos' | 'banners' | 'blog' | 'despesas' | 'equipe' | 'indicacoes' | 'indicacoes-medicas' | 'pedidos' | 'config' | 'dashboard' | 'logs' | 'mentoria' | 'carrinho' | 'rastreio' | 'relatorios' | 'estoque'>('dashboard');
  const [msg, setMsg] = useState('');
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [mentoriaCliques, setMentoriaCliques] = useState<{ id: string; medico_id: string; medico_nome: string; created_at: string }[]>([]);
  const [loadingMentoria, setLoadingMentoria] = useState(false);

  const [carrinhoEventos, setCarrinhoEventos] = useState<{ id: string; medico_id: string; medico_nome: string; produto_id: string; produto_nome: string; created_at: string }[]>([]);
  const [loadingCarrinho, setLoadingCarrinho] = useState(false);

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [relatorioTipo, setRelatorioTipo] = useState<'faturamento' | 'medicos' | 'comissoes' | 'financeiro'>('faturamento');
  const [relFiltroInicio, setRelFiltroInicio] = useState('');
  const [relFiltroFim, setRelFiltroFim] = useState('');
  const [relFiltroMedico, setRelFiltroMedico] = useState('');
  const [relFiltroTipoFin, setRelFiltroTipoFin] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [relAgrupamento, setRelAgrupamento] = useState<'dia' | 'mes'>('mes');
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<string[]>([]);
  const [novaCategoriaFinanceira, setNovaCategoriaFinanceira] = useState('');
  const [mostrarCatsFinanceiras, setMostrarCatsFinanceiras] = useState(false);
  const [novaDespesa, setNovaDespesa] = useState({ tipo: 'saida' as 'entrada' | 'saida', categoria: '', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), comprovante_url: '' });
  const [editandoDespesa, setEditandoDespesa] = useState<Despesa | null>(null);

  const [cadastros, setCadastros] = useState<Cadastro[]>([]);
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [filtro, setFiltro] = useState('todos');
  const [buscaLead, setBuscaLead] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todas');
  const [buscaIndicacao, setBuscaIndicacao] = useState('');
  const [novoCadastroTipo, setNovoCadastroTipo] = useState<'escolher' | 'medico' | 'paciente' | null>(null);
  const [novoMedico, setNovoMedico] = useState({ nome: '', sobrenome: '', email: '', whatsapp: '', endereco: '', crm: '', onde_conheceu: '' });
  const [novoPaciente, setNovoPaciente] = useState({ medico_id: '', nome: '', sobrenome: '', whatsapp: '', email: '', endereco: '' });
  const [buscaMedicoIndicador, setBuscaMedicoIndicador] = useState('');
  const [salvandoNovoCadastro, setSalvandoNovoCadastro] = useState(false);

  const fecharNovoCadastro = () => {
    setNovoCadastroTipo(null);
    setNovoMedico({ nome: '', sobrenome: '', email: '', whatsapp: '', endereco: '', crm: '', onde_conheceu: '' });
    setNovoPaciente({ medico_id: '', nome: '', sobrenome: '', whatsapp: '', email: '', endereco: '' });
    setBuscaMedicoIndicador('');
  };

  const criarMedicoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoNovoCadastro(true);
    const r = await fetch('/api/admin/cadastros', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(novoMedico),
    });
    setSalvandoNovoCadastro(false);
    if (r.ok) { showMsg('OK: Médico cadastrado!'); fecharNovoCadastro(); carregarCadastros(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao cadastrar médico')); }
  };

  const criarPacienteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPaciente.medico_id) { showMsg('R Busque o médico indicador e clique no nome dele na lista antes de cadastrar'); return; }
    setSalvandoNovoCadastro(true);
    const r = await fetch('/api/admin/indicacoes', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(novoPaciente),
    });
    setSalvandoNovoCadastro(false);
    if (r.ok) { showMsg('OK: Paciente cadastrado!'); fecharNovoCadastro(); carregarIndicacoes(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao cadastrar paciente')); }
  };
  const [filtroIndicacao, setFiltroIndicacao] = useState('todos');
  const [filtroPedido, setFiltroPedido] = useState('todos');
  const [novoPedidoAberto, setNovoPedidoAberto] = useState(false);
  const [novoPedidoTipoCliente, setNovoPedidoTipoCliente] = useState<'medico' | 'paciente'>('medico');
  const [novoPedidoMedicoId, setNovoPedidoMedicoId] = useState('');
  const [buscaMedicoPedido, setBuscaMedicoPedido] = useState('');
  const [novoPedidoIndicacaoId, setNovoPedidoIndicacaoId] = useState('');
  const [buscaPacientePedido, setBuscaPacientePedido] = useState('');
  const [novoPedidoItens, setNovoPedidoItens] = useState<{ nome: string; preco: string; quantidade: string }[]>([{ nome: '', preco: '', quantidade: '1' }]);
  const [novoPedidoStatus, setNovoPedidoStatus] = useState('em_atendimento');
  const [salvandoPedido, setSalvandoPedido] = useState(false);

  const fecharNovoPedido = () => {
    setNovoPedidoAberto(false);
    setNovoPedidoTipoCliente('medico');
    setNovoPedidoMedicoId(''); setBuscaMedicoPedido('');
    setNovoPedidoIndicacaoId(''); setBuscaPacientePedido('');
    setNovoPedidoItens([{ nome: '', preco: '', quantidade: '1' }]);
    setNovoPedidoStatus('em_atendimento');
  };

  const criarPedidoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoPedidoTipoCliente === 'medico' && !novoPedidoMedicoId) { showMsg('R Selecione o médico'); return; }
    if (novoPedidoTipoCliente === 'paciente' && !novoPedidoIndicacaoId) { showMsg('R Selecione o paciente'); return; }
    const itensValidos = novoPedidoItens.filter(it => it.nome.trim());
    if (itensValidos.length === 0) { showMsg('R Adicione ao menos um produto'); return; }
    setSalvandoPedido(true);
    const body = novoPedidoTipoCliente === 'medico'
      ? { cadastro_id: novoPedidoMedicoId, itens: itensValidos, status: novoPedidoStatus }
      : { indicacao_id: novoPedidoIndicacaoId, itens: itensValidos, status: novoPedidoStatus };
    const r = await fetch('/api/admin/pedidos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(body),
    });
    setSalvandoPedido(false);
    if (r.ok) { showMsg('OK: Pedido criado!'); fecharNovoPedido(); carregarPedidos(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao criar pedido')); }
  };
  const [verLeadsKanban, setVerLeadsKanban] = useState(true);
  const [verIndicacoesKanban, setVerIndicacoesKanban] = useState(true);
  const [verIndicacoesMedicasKanban, setVerIndicacoesMedicasKanban] = useState(true);

  const [buscaRastreio, setBuscaRastreio] = useState('');
  const [rastreioSelecionado, setRastreioSelecionado] = useState<{ id: string; nome: string; whatsapp: string; tipo: 'medico' | 'paciente' } | null>(null);
  const [linkRastreio, setLinkRastreio] = useState('');
  const [baixandoArteRastreio, setBaixandoArteRastreio] = useState(false);

  const baixarArteRastreio = async (nomeArquivo: string, nome: string, link: string) => {
    setBaixandoArteRastreio(true);
    try {
      const { gerarArteRastreioPNG } = await import('@/lib/gerar-arte-rastreio');
      const dataUrl = gerarArteRastreioPNG(nome, link);
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `rastreio-${nomeArquivo}.png`;
      a.click();
    } catch (e) {
      console.error('[RASTREIO] Erro ao gerar imagem:', e);
      showMsg('R Não consegui gerar a imagem. Tente novamente.');
    } finally {
      setBaixandoArteRastreio(false);
    }
  };
  const [editandoLead, setEditandoLead] = useState<Cadastro | null>(null);
  const [salvandoLead, setSalvandoLead] = useState(false);
  const [novoProdutoInteresseInput, setNovoProdutoInteresseInput] = useState('');
  const [reenviandoId, setReenviandoId] = useState<string | null>(null);
  const [editandoTagsId, setEditandoTagsId] = useState<string | null>(null);
  const [novaTagInput, setNovaTagInput] = useState('');

  const atualizarTagsLead = async (id: string, tags: string[]) => {
    setCadastros(prev => prev.map(c => c.id === id ? { ...c, tags } : c));
    const r = await fetch('/api/admin/cadastros/tags', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, tags }),
    });
    if (!r.ok) { showMsg('R Erro ao salvar etiquetas'); carregarCadastros(); }
  };

  const atualizarProdutosInteresseLead = async (id: string, produtos_interesse: string[]) => {
    setCadastros(prev => prev.map(c => c.id === id ? { ...c, produtos_interesse } : c));
    const r = await fetch('/api/admin/cadastros/produtos-interesse', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, produtos_interesse }),
    });
    if (!r.ok) { showMsg('R Erro ao salvar produtos de interesse'); carregarCadastros(); }
  };
  const [editandoProdutoCardId, setEditandoProdutoCardId] = useState<string | null>(null);
  const [novoProdutoCardInput, setNovoProdutoCardInput] = useState('');

  const [perdaPromptId, setPerdaPromptId] = useState<string | null>(null);
  const [motivoPerdaInput, setMotivoPerdaInput] = useState('');

  const atualizarFunilLead = async (id: string, funil_status: string, motivo_perda?: string | null) => {
    setCadastros(prev => prev.map(c => c.id === id ? { ...c, funil_status, motivo_perda: funil_status === 'perdido' ? (motivo_perda || null) : null } : c));
    const r = await fetch('/api/admin/cadastros/funil', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, funil_status, motivo_perda }),
    });
    if (!r.ok) { showMsg('R Erro ao mover no funil'); carregarCadastros(); }
  };

  const transferirConsultor = async (id: string, vendedor_id: string) => {
    setCadastros(prev => prev.map(c => c.id === id ? { ...c, vendedor_id } : c));
    const r = await fetch('/api/admin/cadastros/vendedor', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, vendedor_id }),
    });
    if (r.ok) showMsg('OK: Lead transferido!');
    else { showMsg('R Erro ao transferir'); carregarCadastros(); }
  };

  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [loadingProd, setLoadingProd] = useState(false);
  const [novoProd, setNovoProd] = useState({ nome: '', dose: '', preco: '', categoria: 'Emagrecimento', categoria2: '', descricao: '', imagem: '', video: '', protocolo: '' });
  const [editando, setEditando] = useState<Produto | null>(null);
  const [galeriaUrls, setGaleriaUrls] = useState<string[]>([]);
  const [mostrarGaleria, setMostrarGaleria] = useState(false);
  const [galeriaAlvo, setGaleriaAlvo] = useState<'imagem' | 'galeria'>('imagem');
  const [mostrarProtocoloNovo, setMostrarProtocoloNovo] = useState(false);
  const [mostrarProtocoloEdit, setMostrarProtocoloEdit] = useState(false);

  const [config, setConfig] = useState<Config>({ mercadopago_token: '', resend_api_key: '', whatsapp_numero: '', base_url: '', banner_titulo: '', banner_subtitulo: '', banner_imagem: '', logo: '', corPrimaria: '#111827', corAcento: '#16a34a', limite_emails_dia: 100, limite_emails_mes: 3000 });
  const [uploadando, setUploadando] = useState<string | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(false);

  const [banners, setBanners] = useState<BannerItem[]>([]);
  const [loadingBanners, setLoadingBanners] = useState(false);
  const [novoBanner, setNovoBanner] = useState({ imagem: '', titulo: '', subtitulo: '' });

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [editandoArtigo, setEditandoArtigo] = useState<Artigo | null>(null);
  const [novoArtigo, setNovoArtigo] = useState({ titulo: '', conteudo: '', imagem: '', video: '', categoria: '', materiais: [] as Material[], publicado: false });
  const [novoMaterial, setNovoMaterial] = useState({ nome: '', url: '' });

  const [equipe, setEquipe] = useState<Membro[]>([]);
  const [loadingEquipe, setLoadingEquipe] = useState(false);
  const [editandoMembro, setEditandoMembro] = useState<Membro | null>(null);
  const [novoMembro, setNovoMembro] = useState({ nome: '', email: '', cargo: 'vendedor', ativo: true, senha: '' });

  const [categoriasCustom, setCategoriasCustom] = useState<string[]>([]);
  const [novaCategoria, setNovaCategoria] = useState('');
  const [mostrarCats, setMostrarCats] = useState(false);

  const [categoriasBlog, setCategoriasBlog] = useState<string[]>([]);
  const [novaCategoriaBlog, setNovaCategoriaBlog] = useState('');
  const [mostrarCatsBlog, setMostrarCatsBlog] = useState(false);

  const [bannersBlog, setBannersBlog] = useState<BannerItem[]>([]);
  const [novoBannerBlog, setNovoBannerBlog] = useState({ imagem: '', titulo: '', subtitulo: '' });
  const [mostrarBannersBlog, setMostrarBannersBlog] = useState(false);

  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [loadingIndicacoes, setLoadingIndicacoes] = useState(false);

  useEffect(() => {
    const k = getKey();
    if (k) {
      setLogado(true);
      // Sessao de antes deste recurso existir: so a senha mestra logava, entao
      // sem a flag salva assumimos Superadmin (nao existia usuario nomeado ainda).
      const flagSalva = localStorage.getItem(ADMIN_SUPERADMIN_LOCAL);
      setAdminNome(localStorage.getItem(ADMIN_NOME_LOCAL) || 'Superadmin');
      setIsSuperadmin(flagSalva === null ? true : flagSalva === '1');
      carregarCadastros(k); carregarConfig(); carregarIndicacoes(); carregarEquipe(); carregarProdutos(); carregarPedidos(); carregarDespesas();
    }
  }, []);

  useEffect(() => {
    if (aba !== 'equipe' || !logado) return;
    const id = setInterval(() => { carregarEquipe(); }, 20000);
    return () => clearInterval(id);
  }, [aba, logado]);

  // "Online na Loja Agora" depende de last_seen_loja, que so muda quando o
  // heartbeat da loja (a cada 45s) grava no banco — sem isto o admin so via
  // quem estava online no momento em que entrou na aba, nao em tempo real.
  useEffect(() => {
    if (aba !== 'dashboard' || !logado) return;
    const id = setInterval(() => { carregarCadastros(); }, 20000);
    return () => clearInterval(id);
  }, [aba, logado]);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch('/api/admin/login', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha }),
    });
    if (res.ok) {
      const d = await res.json();
      localStorage.setItem(ADMIN_KEY_LOCAL, d.adminKey);
      localStorage.setItem(ADMIN_NOME_LOCAL, d.nome);
      localStorage.setItem(ADMIN_SUPERADMIN_LOCAL, d.superadmin ? '1' : '0');
      setAdminNome(d.nome);
      setIsSuperadmin(!!d.superadmin);
      setLogado(true);
      carregarCadastros(d.adminKey);
      carregarConfig();
      carregarIndicacoes();
      carregarEquipe();
    } else {
      alert('E-mail ou senha incorretos');
    }
  };

  const carregarCadastros = async (key = getKey()) => {
    setLoadingLeads(true);
    try {
      const r = await fetch('/api/admin/cadastros', { headers: { 'x-admin-key': key } });
      if (r.ok) setCadastros(await r.json());
    } finally { setLoadingLeads(false); }
  };

  const carregarProdutos = async () => {
    setLoadingProd(true);
    try {
      const r = await fetch('/api/admin/produtos', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setProdutos(await r.json());
    } finally { setLoadingProd(false); }
  };

  const salvarEstoqueProduto = async (id: string, dados: { estoque_inicial: number; custo: number }) => {
    const r = await fetch('/api/admin/produtos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, ...dados }),
    });
    if (r.ok) {
      const atualizado = await r.json();
      setProdutos(prev => prev.map(p => p.id === id ? atualizado : p));
      showMsg('OK: Estoque atualizado!');
    } else { showMsg('R Erro ao atualizar estoque'); }
  };

  const carregarConfig = async () => {
    setLoadingConfig(true);
    try {
      const r = await fetch('/api/admin/config', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setConfig(await r.json());
    } finally { setLoadingConfig(false); }
  };

  const abrirGaleria = async (alvo: 'imagem' | 'galeria' = 'imagem') => {
    if (galeriaUrls.length === 0) {
      const r = await fetch('/api/admin/uploads', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setGaleriaUrls(await r.json());
    }
    setGaleriaAlvo(alvo);
    setMostrarGaleria(true);
  };

  const carregarBanners = async () => {
    setLoadingBanners(true);
    try {
      const r = await fetch('/api/admin/banners', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setBanners(await r.json());
    } finally { setLoadingBanners(false); }
  };

  const adicionarBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBanner.imagem) return;
    const r = await fetch('/api/admin/banners', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(novoBanner),
    });
    if (r.ok) { showMsg('OK: Banner adicionado!'); setNovoBanner({ imagem: '', titulo: '', subtitulo: '' }); carregarBanners(); }
  };

  const deletarBanner = async (id: string) => {
    if (!confirm('Remover este banner?')) return;
    const r = await fetch('/api/admin/banners', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Banner removido.'); carregarBanners(); }
  };

  const toggleBanner = async (id: string) => {
    await fetch('/api/admin/banners', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    carregarBanners();
  };

  const carregarPedidos = async () => {
    try {
      const r = await fetch('/api/admin/pedidos', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setPedidos(await r.json());
    } catch {}
  };

  const carregarIndicacoes = async () => {
    setLoadingIndicacoes(true);
    try {
      const r = await fetch('/api/admin/indicacoes', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setIndicacoes(await r.json());
    } finally { setLoadingIndicacoes(false); }
  };

  const atualizarStatusIndicacao = async (i: Indicacao, status: string) => {
    setIndicacoes(prev => prev.map(x => x.id === i.id ? { ...x, status } : x));
    const r = await fetch('/api/admin/indicacoes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ ...i, status }),
    });
    if (!r.ok) { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao atualizar')); carregarIndicacoes(); }
  };

  const [comissaoPromptId, setComissaoPromptId] = useState<string | null>(null);
  const [comissaoInput, setComissaoInput] = useState('');
  const [editandoIndicacao, setEditandoIndicacao] = useState<Indicacao | null>(null);
  const [salvandoIndicacao, setSalvandoIndicacao] = useState(false);

  const salvarEdicaoIndicacao = async () => {
    if (!editandoIndicacao) return;
    setSalvandoIndicacao(true);
    const r = await fetch('/api/admin/indicacoes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editandoIndicacao),
    });
    setSalvandoIndicacao(false);
    if (r.ok) {
      showMsg('OK: Indicação atualizada!');
      const salvo = editandoIndicacao;
      setIndicacoes(prev => prev.map(x => x.id === salvo.id ? salvo : x));
      setEditandoIndicacao(null);
    } else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao salvar')); }
  };

  const totalBaseFor = (indicacaoId: string) =>
    pedidos.filter(p => p.indicacao_id === indicacaoId && p.status === 'pago').reduce((s, p) => s + p.preco, 0);

  const lancarComissao = async (id: string, valor: number) => {
    if (!valor || valor <= 0) { showMsg('R Informe um valor válido'); return; }
    const r = await fetch('/api/admin/indicacoes/comissao', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, comissao_valor: valor }),
    });
    if (r.ok) {
      showMsg('OK: Comissão salva no Financeiro!');
      setIndicacoes(prev => prev.map(x => x.id === id ? { ...x, comissao_valor: valor, comissao_paga: true } : x));
      setEditandoIndicacao(prev => prev && prev.id === id ? { ...prev, comissao_valor: valor, comissao_paga: true } : prev);
      setComissaoPromptId(null); setComissaoInput('');
    } else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao lançar comissão')); }
  };

  const excluirIndicacao = async (id: string, nome: string) => {
    if (!confirm(`Excluir permanentemente a indicação de ${nome}?`)) return;
    const r = await fetch('/api/admin/indicacoes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Indicação excluída.'); setIndicacoes(prev => prev.filter(x => x.id !== id)); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao excluir')); }
  };

  const atualizarStatusPedido = async (id: string, status: string) => {
    const r = await fetch('/api/admin/pedidos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, status }),
    });
    if (r.ok) { showMsg('OK: Pedido atualizado!'); carregarPedidos(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao atualizar')); }
  };

  const atualizarValorPedido = async (id: string, preco: number) => {
    const r = await fetch('/api/admin/pedidos', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, preco }),
    });
    if (r.ok) { showMsg('OK: Valor atualizado!'); carregarPedidos(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao atualizar')); }
  };

  const excluirPedido = async (id: string, cliente: string) => {
    if (!confirm(`Excluir permanentemente o pedido de ${cliente}?`)) return;
    const r = await fetch('/api/admin/pedidos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Pedido excluído.'); carregarPedidos(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao excluir')); }
  };

  const mudarAba = (a: typeof aba) => {
    setAba(a);
    if (a === 'produtos') { if (produtos.length === 0) carregarProdutos(); carregarCategorias(); }
    if (a === 'config') carregarConfig();
    if (a === 'banners') carregarBanners();
    if (a === 'blog') { carregarArtigos(); carregarCategoriasBlog(); carregarBannersBlog(); }
    if (a === 'equipe') carregarEquipe();
    if (a === 'indicacoes' || a === 'indicacoes-medicas') { carregarIndicacoes(); if (pedidos.length === 0) carregarPedidos(); }
    if (a === 'pedidos') { carregarPedidos(); if (produtos.length === 0) carregarProdutos(); if (cadastros.length === 0) carregarCadastros(); if (indicacoes.length === 0) carregarIndicacoes(); }
    if (a === 'dashboard') { carregarCadastros(); carregarEquipe(); carregarPedidos(); carregarIndicacoes(); carregarDespesas(); if (produtos.length === 0) carregarProdutos(); }
    if (a === 'leads') {
      if (indicacoes.length === 0) carregarIndicacoes();
      if (equipe.length === 0) carregarEquipe();
      if (produtos.length === 0) carregarProdutos();
    }
    if (a === 'clientes') { carregarPedidos(); if (equipe.length === 0) carregarEquipe(); }
    if (a === 'logs') carregarLogs();
    if (a === 'mentoria') carregarMentoriaCliques();
    if (a === 'despesas') { carregarDespesas(); carregarCategoriasFinanceiras(); }
    if (a === 'carrinho') { carregarCarrinho(); carregarPedidos(); }
    if (a === 'rastreio') { if (cadastros.length === 0) carregarCadastros(); if (indicacoes.length === 0) carregarIndicacoes(); }
    if (a === 'relatorios') { carregarPedidos(); carregarDespesas(); if (cadastros.length === 0) carregarCadastros(); if (indicacoes.length === 0) carregarIndicacoes(); }
    if (a === 'estoque') { if (produtos.length === 0) carregarProdutos(); carregarPedidos(); }
  };

  const aprovar = async (id: string) => {
    const r = await fetch('/api/admin/aprovar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    const d = await r.json();
    if (r.ok) {
      carregarCadastros();
      const emailStatus = d.emailEnviado ? '✅ Email enviado' : '⚠️ Email não enviado';
      const waStatus = d.waEnviado ? '✅ WhatsApp enviado' : '';
      if (d.waLink && !d.waEnviado) {
        // Z-API não configurado — mostra botão para abrir WhatsApp
        const abrir = confirm(`${d.nome} aprovado!\n${emailStatus}\n\nClicar OK abre o WhatsApp para enviar o convite.`);
        if (abrir) window.open(d.waLink, '_blank');
      } else {
        showMsg(`OK: ${d.nome} aprovado! ${emailStatus} ${waStatus}`);
      }
    } else {
      showMsg('R Erro: ' + d.error);
    }
  };

  const rejeitar = async (id: string) => {
    if (!confirm('Rejeitar este cadastro?')) return;
    const r = await fetch('/api/admin/rejeitar', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Cadastro rejeitado.'); carregarCadastros(); }
  };

  const excluirCadastro = async (id: string, nome: string) => {
    if (!confirm(`Excluir permanentemente o cadastro de ${nome}? Esta ação não pode ser desfeita.`)) return;
    const r = await fetch('/api/admin/cadastros', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Cadastro excluido.'); carregarCadastros(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao excluir')); }
  };

  const reenviarEmail = async (id: string, nome: string) => {
    setReenviandoId(id);
    const r = await fetch('/api/admin/reenviar-email', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    setReenviandoId(null);
    if (r.ok) showMsg(`OK: E-mail reenviado para ${nome}!`);
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao reenviar e-mail')); }
  };

  const salvarEdicaoLead = async () => {
    if (!editandoLead) return;
    setSalvandoLead(true);
    const { id, nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu, cidade, estado, especialidade, cpf, produtos_interesse } = editandoLead;
    const r = await fetch('/api/admin/cadastros', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id, nome, sobrenome, email, whatsapp, endereco, crm, onde_conheceu, cidade, estado, especialidade, cpf, produtos_interesse }),
    });
    setSalvandoLead(false);
    if (r.ok) { showMsg('OK: Cadastro atualizado!'); setEditandoLead(null); carregarCadastros(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao salvar')); }
  };

  const adicionarProduto = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/produtos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(novoProd),
    });
    if (r.ok) {
      showMsg('OK: Produto adicionado!');
      setNovoProd({ nome: '', dose: '', preco: '', categoria: 'Emagrecimento', categoria2: '', descricao: '', imagem: '', video: '', protocolo: '' });
      setMostrarProtocoloNovo(false);
      carregarProdutos();
    }
  };

  const salvarEdicao = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editando) return;
    const r = await fetch('/api/admin/produtos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editando),
    });
    if (r.ok) {
      showMsg('OK: Produto atualizado!');
      setEditando(null);
      carregarProdutos();
    } else {
      showMsg('R Erro ao salvar');
    }
  };

  const deletarProduto = async (id: string) => {
    if (!confirm('Remover este produto?')) return;
    const r = await fetch('/api/admin/produtos', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Produto removido.'); carregarProdutos(); }
  };

  const duplicarProduto = async (id: string) => {
    const r = await fetch('/api/admin/produtos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ duplicar: true, id }),
    });
    if (r.ok) { showMsg('OK: Produto duplicado!'); carregarProdutos(); }
    else showMsg('R Erro ao duplicar');
  };

  const salvarConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/config', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(config),
    });
    if (r.ok) showMsg('OK: Configurações salvas!');
  };

  const uploadImagem = async (field: string, file: File, onUrl: (url: string) => void) => {
    setUploadando(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': getKey() }, body: fd });
      const d = await r.json();
      if (r.ok) { onUrl(d.url); showMsg('OK: Imagem carregada!'); }
      else showMsg('R ' + (d.error || 'Erro ao enviar'));
    } finally { setUploadando(null); }
  };

  const carregarBannersBlog = async () => {
    const r = await fetch('/api/admin/banners-blog', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) setBannersBlog(await r.json());
  };
  const adicionarBannerBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoBannerBlog.imagem) return;
    const r = await fetch('/api/admin/banners-blog', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify(novoBannerBlog) });
    if (r.ok) { showMsg('OK: Banner adicionado!'); setNovoBannerBlog({ imagem: '', titulo: '', subtitulo: '' }); carregarBannersBlog(); }
  };
  const deletarBannerBlog = async (id: string) => {
    if (!confirm('Remover este banner?')) return;
    const r = await fetch('/api/admin/banners-blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Banner removido.'); carregarBannersBlog(); }
  };
  const toggleBannerBlog = async (id: string) => {
    await fetch('/api/admin/banners-blog', { method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    carregarBannersBlog();
  };

  const carregarCategoriasBlog = async () => {
    const r = await fetch('/api/admin/categorias-blog', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) setCategoriasBlog(await r.json());
  };
  const adicionarCategoriaBlog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoriaBlog.trim()) return;
    const r = await fetch('/api/admin/categorias-blog', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome: novaCategoriaBlog.trim() }) });
    if (r.ok) { showMsg('OK: Categoria adicionada!'); setNovaCategoriaBlog(''); carregarCategoriasBlog(); }
    else { const d = await r.json(); showMsg('R ' + d.error); }
  };
  const deletarCategoriaBlog = async (nome: string) => {
    const r = await fetch('/api/admin/categorias-blog', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome }) });
    if (r.ok) { showMsg('Categoria removida.'); carregarCategoriasBlog(); }
  };

  const carregarArtigos = async () => {
    setLoadingArtigos(true);
    try { const r = await fetch('/api/admin/artigos', { headers: { 'x-admin-key': getKey() } }); if (r.ok) setArtigos(await r.json()); } finally { setLoadingArtigos(false); }
  };
  const salvarArtigo = async (e: React.FormEvent) => {
    e.preventDefault();
    const base = editandoArtigo || novoArtigo;
    const r = await fetch('/api/admin/artigos', {
      method: editandoArtigo ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editandoArtigo ? editandoArtigo : novoArtigo),
    });
    if (r.ok) { showMsg(editandoArtigo ? 'OK: Artigo atualizado!' : 'OK: Artigo criado!'); setEditandoArtigo(null); setNovoArtigo({ titulo: '', conteudo: '', imagem: '', video: '', categoria: '', materiais: [], publicado: false }); carregarArtigos(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao salvar artigo')); }
  };
  const deletarArtigo = async (id: string) => {
    if (!confirm('Excluir este artigo?')) return;
    const r = await fetch('/api/admin/artigos', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Artigo excluído.'); carregarArtigos(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao excluir')); }
  };
  const togglePublicar = async (a: Artigo) => {
    await fetch('/api/admin/artigos', { method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ ...a, publicado: !a.publicado }) });
    carregarArtigos();
  };

  const carregarEquipe = async () => {
    setLoadingEquipe(true);
    try { const r = await fetch('/api/admin/equipe', { headers: { 'x-admin-key': getKey() } }); if (r.ok) setEquipe(await r.json()); } finally { setLoadingEquipe(false); }
  };
  const salvarMembro = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch('/api/admin/equipe', {
      method: editandoMembro ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(editandoMembro ?? novoMembro),
    });
    if (r.ok) { showMsg(editandoMembro ? 'OK: Membro atualizado!' : 'OK: Membro adicionado!'); setEditandoMembro(null); setNovoMembro({ nome: '', email: '', cargo: 'vendedor', ativo: true, senha: '' }); carregarEquipe(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R Erro: ' + (d.error || r.status)); }
  };
  const deletarMembro = async (id: string, nome: string) => {
    if (!confirm(`Remover ${nome} da equipe?`)) return;
    const r = await fetch('/api/admin/equipe', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Membro removido.'); carregarEquipe(); }
  };

  const carregarCategorias = async () => {
    const r = await fetch('/api/admin/categorias', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) { const d = await r.json(); setCategoriasCustom(d.custom); }
  };
  const adicionarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoria.trim()) return;
    const r = await fetch('/api/admin/categorias', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome: novaCategoria.trim() }) });
    if (r.ok) { showMsg('OK: Categoria adicionada!'); setNovaCategoria(''); carregarCategorias(); }
    else { const d = await r.json(); showMsg('R ' + d.error); }
  };
  const deletarCategoria = async (nome: string) => {
    const r = await fetch('/api/admin/categorias', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome }) });
    if (r.ok) { showMsg('Categoria removida.'); carregarCategorias(); }
  };

  const showMsg = (m: string) => { setMsg(m); setTimeout(() => setMsg(''), 4000); };
  const sair = () => {
    localStorage.removeItem(ADMIN_KEY_LOCAL);
    localStorage.removeItem(ADMIN_NOME_LOCAL);
    localStorage.removeItem(ADMIN_SUPERADMIN_LOCAL);
    setLogado(false); setSenha(''); setAdminNome(''); setIsSuperadmin(false);
  };

  const carregarLogs = async () => {
    setLoadingLogs(true);
    try {
      const r = await fetch('/api/admin/logs', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setLogs(await r.json());
    } finally { setLoadingLogs(false); }
  };

  const carregarMentoriaCliques = async () => {
    setLoadingMentoria(true);
    try {
      const r = await fetch('/api/admin/mentoria-cliques', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setMentoriaCliques(await r.json());
    } finally { setLoadingMentoria(false); }
  };

  const excluirCliqueMentoria = async (id: string, medicoNome: string) => {
    if (!confirm(`Excluir o clique de ${medicoNome}?`)) return;
    const r = await fetch('/api/admin/mentoria-cliques', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { showMsg('Clique excluído.'); carregarMentoriaCliques(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao excluir')); }
  };

  const carregarCarrinho = async () => {
    setLoadingCarrinho(true);
    try {
      const r = await fetch('/api/admin/carrinho', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setCarrinhoEventos(await r.json());
    } finally { setLoadingCarrinho(false); }
  };

  const carregarDespesas = async () => {
    setLoadingDespesas(true);
    try {
      const r = await fetch('/api/admin/despesas', { headers: { 'x-admin-key': getKey() } });
      if (r.ok) setDespesas(await r.json());
    } finally { setLoadingDespesas(false); }
  };

  const carregarCategoriasFinanceiras = async () => {
    const r = await fetch('/api/admin/categorias-financeiras', { headers: { 'x-admin-key': getKey() } });
    if (r.ok) setCategoriasFinanceiras(await r.json());
  };

  const salvarDespesa = async (e: React.FormEvent) => {
    e.preventDefault();
    const body = editandoDespesa ?? novaDespesa;
    const r = await fetch('/api/admin/despesas', {
      method: editandoDespesa ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      showMsg(editandoDespesa ? 'OK: Lançamento atualizado!' : 'OK: Lançamento registrado!');
      setEditandoDespesa(null);
      setNovaDespesa({ tipo: 'saida', categoria: '', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), comprovante_url: '' });
      carregarDespesas();
    } else {
      const d = await r.json().catch(() => ({}));
      showMsg('R Erro: ' + (d.error || r.status));
    }
  };

  const excluirDespesa = async (id: string, descricao: string) => {
    if (!confirm(`Excluir o lançamento "${descricao}"?`)) return;
    const r = await fetch('/api/admin/despesas', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ id }) });
    if (r.ok) { showMsg('Lançamento excluído.'); carregarDespesas(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao excluir')); }
  };

  const adicionarCategoriaFinanceira = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaCategoriaFinanceira.trim()) return;
    const r = await fetch('/api/admin/categorias-financeiras', { method: 'POST', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome: novaCategoriaFinanceira.trim() }) });
    if (r.ok) { setNovaCategoriaFinanceira(''); carregarCategoriasFinanceiras(); }
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao adicionar categoria')); }
  };

  const deletarCategoriaFinanceira = async (nome: string) => {
    if (!confirm(`Remover a categoria "${nome}"?`)) return;
    const r = await fetch('/api/admin/categorias-financeiras', { method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-admin-key': getKey() }, body: JSON.stringify({ nome }) });
    if (r.ok) carregarCategoriasFinanceiras();
    else { const d = await r.json().catch(() => ({})); showMsg('R ' + (d.error || 'Erro ao remover categoria')); }
  };

  /* ---- Login ---- */
  if (!logado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={login} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: 40, width: 360, boxShadow: '0 4px 20px rgba(0,0,0,0.08)' }}>
          <div style={{ textAlign: 'center', marginBottom: 32 }}>
            <img src={config.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
              alt="PeptideZ" style={{ height: 60, maxWidth: 220, objectFit: 'contain' }} />
          </div>
          <label style={labelStyle}>E-mail</label>
          <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="seu@email.com" autoFocus style={{ ...inputStyle, marginBottom: 16 }} />
          <label style={labelStyle}>Senha</label>
          <input type="password" value={senha} onChange={e => setSenha(e.target.value)} placeholder="Digite a senha admin" style={inputStyle} />
          <button type="submit" style={{ marginTop: 20, width: '100%', background: '#111827', color: '#fff', fontWeight: 700, padding: 14, borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
            Entrar
          </button>
        </form>
      </div>
    );
  }

  const todasEtiquetas = Array.from(new Set(cadastros.flatMap(c => c.tags || []))).sort();
  const filtrados = (filtro === 'todos' ? cadastros : cadastros.filter(c => c.status === filtro))
    .filter(c => filtroEtiqueta === 'todas' || (c.tags || []).includes(filtroEtiqueta))
    .filter(c => {
      const q = buscaLead.trim().toLowerCase();
      if (!q) return true;
      return `${c.nome} ${c.sobrenome} ${c.email} ${c.whatsapp} ${c.crm || ''}`.toLowerCase().includes(q);
    });
  const whatsappCounts: Record<string, number> = {};
  cadastros.forEach(c => {
    const w = (c.whatsapp || '').replace(/\D/g, '');
    if (w) whatsappCounts[w] = (whatsappCounts[w] || 0) + 1;
  });
  const counts = {
    todos: cadastros.length,
    pendente: cadastros.filter(c => c.status === 'pendente').length,
    aprovado: cadastros.filter(c => c.status === 'aprovado').length,
    rejeitado: cadastros.filter(c => c.status === 'rejeitado').length,
  };
  const totalPacientes = indicacoes.filter(i => i.tipo !== 'medico').length;

  const navItem = (key: typeof aba, icon: string, label: string) => {
    const ativo = aba === key;
    return (
      <button
        key={key}
        className="admin-navitem"
        onClick={() => mudarAba(key)}
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '9px 12px 9px 10px', border: 'none', borderRadius: 8,
          borderLeft: `3px solid ${ativo ? 'var(--accent)' : 'transparent'}`,
          background: ativo ? 'var(--accent-soft)' : 'transparent',
          color: ativo ? 'var(--accent-text)' : 'var(--text-muted)',
          fontWeight: ativo ? 700 : 500, fontSize: 13.5, fontFamily: 'inherit',
          cursor: 'pointer', textAlign: 'left', transition: 'background .15s, color .15s',
        }}
      >
        <span style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          width: 24, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 800, flexShrink: 0,
          background: ativo ? 'var(--accent)' : 'var(--surface-hover)', color: ativo ? '#fff' : 'var(--text-soft)',
        }}>{icon}</span>
        {label}
      </button>
    );
  };

  return (
    <div className="admin-root" data-theme={tema} style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column' }}>

      <style>{`
        .admin-root {
          --bg: #f8fafc; --surface: #ffffff; --surface-hover: #f3f4f6;
          --border: #e5e7eb; --text: #111827; --text-secondary: #374151; --text-muted: #6b7280; --text-soft: #9ca3af;
          --accent: #16a34a; --accent-text: #15803d; --accent-soft: #f0fdf4; --accent-border: #86efac;
          --btn-primary-bg: #111827; --btn-primary-text: #ffffff;
          --shadow-header: 0 1px 0 rgba(0,0,0,0.03);
          color: var(--text);
        }
        .admin-root[data-theme="dark"] {
          --bg: #0d0f12; --surface: #16181d; --surface-hover: #1f2229;
          --border: #272b33; --text: #f3f4f6; --text-secondary: #d1d5db; --text-muted: #9ca3af; --text-soft: #6b7280;
          --accent: #22c55e; --accent-text: #4ade80; --accent-soft: rgba(34,197,94,0.14); --accent-border: rgba(34,197,94,0.35);
          --btn-primary-bg: #e5e7eb; --btn-primary-text: #111827;
          --shadow-header: 0 1px 0 rgba(0,0,0,0.4);
        }
        .admin-shell { display: flex; flex-direction: row; }
        .admin-sidebar { width: 220px; flex-direction: column; border-right: 1px solid var(--border); padding: 20px 12px; }
        .admin-sidebar-extra { display: block; }
        .admin-navitem { width: 100%; margin-bottom: 2px; }
        .admin-navitem:hover { background: var(--surface-hover) !important; }
        .admin-main { padding: 24px 28px; }
        @media (max-width: 860px) {
          .admin-shell { flex-direction: column; }
          .admin-sidebar { width: auto; flex-direction: row; flex-wrap: wrap; border-right: none; border-bottom: 1px solid var(--border); padding: 8px 10px; align-items: center; gap: 6px; }
          .admin-sidebar-title, .admin-sidebar-extra { display: none; }
          .admin-navitem { width: auto; margin-bottom: 0; white-space: nowrap; }
          .admin-main { padding: 16px 14px; }
        }
        .admin-grid-auto { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .admin-grid-thumbs { grid-template-columns: repeat(auto-fill, minmax(50px, 1fr)); }
        .admin-split-360 { grid-template-columns: 1fr 360px; }
        .admin-split-340 { grid-template-columns: 1fr 340px; }
        .admin-split-380 { grid-template-columns: 1fr 380px; }
        @media (max-width: 900px) {
          .admin-split-360, .admin-split-340, .admin-split-380 { grid-template-columns: 1fr; }
        }
        .admin-table-scroll { overflow-x: auto; }
        .admin-theme-toggle:hover { background: var(--surface-hover) !important; }
      `}</style>

      {/* Header */}
      <header style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '12px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, flexShrink: 0, boxShadow: 'var(--shadow-header)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ padding: 3, borderRadius: 10, background: '#111827' }}>
            <img src={config.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
              alt="PeptideZ" style={{ height: 36, maxWidth: 150, objectFit: 'contain', display: 'block', borderRadius: 7, background: '#fff', padding: '2px 6px' }} />
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <button onClick={alternarTema} className="admin-theme-toggle" title={tema === 'light' ? 'Modo escuro' : 'Modo claro'}
            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tema === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => { carregarCadastros(); showMsg('Atualizado!'); }}
            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>
            Atualizar
          </button>
          <button onClick={sair}
            style={{ background: 'transparent', color: 'var(--text-muted)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 }}>
            Sair
          </button>
        </div>
      </header>

      <div className="admin-shell" style={{ flex: 1, overflow: 'hidden' }}>

        {/* Sidebar */}
        <aside className="admin-sidebar" style={{ background: 'var(--surface)', flexShrink: 0, display: 'flex' }}>
          <div className="admin-sidebar-title" style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-soft)', letterSpacing: 1, marginBottom: 10, paddingLeft: 6, textTransform: 'uppercase' }}>Menu</div>
          {navItem('dashboard', '#', 'Dashboard')}
          {navItem('leads', '-', 'Leads')}
          {navItem('clientes', 'C', 'Clientes')}
          {navItem('produtos', '+', 'Produtos')}
          {navItem('estoque', 'E', 'Estoque')}
          {navItem('banners', '*', 'Banners')}
          {navItem('blog', '~', 'Blog')}
          {navItem('despesas', '&', 'Financeiro')}
          {navItem('equipe', '@', 'Equipe')}
          {navItem('indicacoes', '>', 'Indicações')}
          {navItem('indicacoes-medicas', '+', 'Indicações Médicas')}
          {navItem('pedidos', '$', 'Pedidos')}
          {navItem('relatorios', 'i', 'Relatórios')}
          {navItem('config', '=', 'Config')}
          {navItem('mentoria', '%', 'Mentoria')}
          {navItem('carrinho', 'C', 'Monitoramento de Carrinho')}
          {navItem('rastreio', 'R', 'Link de Rastreio')}
          {isSuperadmin && navItem('logs', '!', 'Log')}

          <div className="admin-sidebar-extra" style={{ marginTop: 'auto', paddingTop: 20, borderTop: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
              {counts.aprovado} aprovados<br />{counts.pendente} pendentes
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="admin-main" style={{ flex: 1, overflowY: 'auto' }}>

          {/* Mensagem global */}
          {msg && (
            <div style={{ marginBottom: 20, background: msg.startsWith('OK:') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msg.startsWith('OK:') ? '#86efac' : '#fecaca'}`, color: msg.startsWith('OK:') ? '#15803d' : '#dc2626', padding: '12px 16px', borderRadius: 8, fontSize: 14, display: 'flex', justifyContent: 'space-between' }}>
              {msg.startsWith('OK:') ? msg.slice(3).trim() : msg}
              <button onClick={() => setMsg('')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', fontSize: 16 }}>-</button>
            </div>
          )}

          {/* ======== ABA LEADS ======== */}
          {aba === 'leads' && (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Leads</h2>
                <button onClick={() => setNovoCadastroTipo('escolher')}
                  style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 16px', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                  + Cadastro Novo
                </button>
              </div>

              {/* Total / Médicos / Pacientes */}
              <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: 14 }}>
                {[
                  { label: 'Total', val: counts.todos + totalPacientes },
                  { label: 'Médicos', val: counts.todos },
                  { label: 'Pacientes', val: totalPacientes },
                ].map(s => (
                  <div key={s.label} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Stats médicos */}
              <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
                {[
                  { label: 'Pendentes', val: counts.pendente, cor: null },
                  { label: 'Aprovados', val: counts.aprovado, cor: '#15803d' },
                  { label: 'Rejeitados', val: counts.rejeitado, cor: '#dc2626' },
                ].map(s => (
                  <div key={s.label} style={{ background: s.cor ? `${s.cor}0d` : 'var(--surface-hover)', border: `1px solid ${s.cor ? s.cor + '33' : 'var(--border)'}`, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${s.cor || 'var(--text-soft, #9ca3af)'}` }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: s.cor || 'var(--text)' }}>{s.val}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
                {[['todos', 'Todos', ''], ['pendente', 'Pendentes', ''], ['aprovado', 'Aprovados', '#15803d'], ['rejeitado', 'Rejeitados', '#dc2626']].map(([val, label, cor]) => (
                  <button key={val} onClick={() => setFiltro(val)}
                    style={{
                      background: filtro === val ? (cor || 'var(--btn-primary-bg)') : 'var(--surface)',
                      color: filtro === val ? (cor ? '#fff' : 'var(--btn-primary-text)') : 'var(--text-secondary, #374151)',
                      border: `1px solid ${filtro === val ? (cor || 'var(--btn-primary-bg)') : 'var(--border)'}`,
                      padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: filtro === val ? 700 : 400, fontFamily: 'inherit', fontSize: 13,
                    }}>
                    {label} ({counts[val as keyof typeof counts]})
                  </button>
                ))}
              </div>

              {/* Filtro por etiqueta */}
              {todasEtiquetas.length > 0 && (
                <div style={{ display: 'flex', gap: 6, marginBottom: 16, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft, #9ca3af)', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 2 }}>Etiqueta:</span>
                  <button onClick={() => setFiltroEtiqueta('todas')}
                    style={{ background: filtroEtiqueta === 'todas' ? 'var(--btn-primary-bg)' : 'var(--surface)', color: filtroEtiqueta === 'todas' ? 'var(--btn-primary-text)' : 'var(--text-secondary, #374151)', border: `1px solid ${filtroEtiqueta === 'todas' ? 'var(--btn-primary-bg)' : '#d1d5db'}`, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: filtroEtiqueta === 'todas' ? 700 : 500, fontFamily: 'inherit', fontSize: 12 }}>
                    Todas
                  </button>
                  {todasEtiquetas.map(tag => {
                    const cor = corDaEtiqueta(tag);
                    const ativo = filtroEtiqueta === tag;
                    return (
                      <button key={tag} onClick={() => setFiltroEtiqueta(ativo ? 'todas' : tag)}
                        style={{ background: ativo ? cor : `${cor}1a`, color: ativo ? '#fff' : cor, border: `1px solid ${cor}55`, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 12 }}>
                        {tag} ({cadastros.filter(c => (c.tags || []).includes(tag)).length})
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Busca + alternador de visualização */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input value={buscaLead} onChange={e => setBuscaLead(e.target.value)}
                  placeholder="Buscar médico por nome, e-mail, WhatsApp ou CRM..."
                  style={{ ...inputStyle, maxWidth: 420, marginBottom: 0 }} />
                <ToggleListaKanban kanban={verLeadsKanban} onChange={setVerLeadsKanban} />
              </div>

              {verLeadsKanban ? (
                <>
                <datalist id="produtos-catalogo-kanban">
                  {produtos.map(p => <option key={p.id} value={p.nome} />)}
                </datalist>
                <KanbanBoard>
                  {FUNIL_ETAPAS.map(etapa => {
                    const itens = filtrados.filter(c => (c.funil_status || 'novo') === etapa);
                    return (
                      <KanbanColuna key={etapa} titulo={FUNIL_LABEL[etapa]} cor={FUNIL_COLOR[etapa]} total={itens.length}>
                        {itens.map(c => (
                          <KanbanCard key={c.id} onClick={() => { setEditandoLead(c); setNovoProdutoInteresseInput(''); }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</div>
                            <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11.5, color: '#16a34a', textDecoration: 'none' }}>{c.whatsapp}</a>
                            <div onClick={e => e.stopPropagation()} style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 5, alignItems: 'center' }}>
                              {(c.produtos_interesse || []).map(p => (
                                <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 3, fontSize: 9.5, fontWeight: 700, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', padding: '1px 6px', borderRadius: 10 }}>
                                  {p}
                                  <button onClick={() => atualizarProdutosInteresseLead(c.id, (c.produtos_interesse || []).filter(x => x !== p))}
                                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #374151)', fontSize: 11, lineHeight: 1, padding: 0, fontWeight: 900 }}>×</button>
                                </span>
                              ))}
                              {editandoProdutoCardId === c.id ? (
                                <input autoFocus value={novoProdutoCardInput} onChange={e => setNovoProdutoCardInput(e.target.value)}
                                  list="produtos-catalogo-kanban"
                                  onBlur={() => { setEditandoProdutoCardId(null); setNovoProdutoCardInput(''); }}
                                  onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                      const v = novoProdutoCardInput.trim();
                                      if (v && !(c.produtos_interesse || []).includes(v)) atualizarProdutosInteresseLead(c.id, [...(c.produtos_interesse || []), v]);
                                      setNovoProdutoCardInput(''); setEditandoProdutoCardId(null);
                                    } else if (e.key === 'Escape') { setNovoProdutoCardInput(''); setEditandoProdutoCardId(null); }
                                  }}
                                  placeholder="produto..." style={{ width: 70, border: '1px solid var(--border)', borderRadius: 10, padding: '1px 6px', fontSize: 9.5, fontFamily: 'inherit' }} />
                              ) : (
                                <button onClick={() => setEditandoProdutoCardId(c.id)}
                                  style={{ background: 'var(--surface-hover)', color: 'var(--text-muted, #6b7280)', border: '1px dashed var(--border)', padding: '1px 6px', borderRadius: 10, fontSize: 9.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                  + produto
                                </button>
                              )}
                            </div>
                            {(c.tags || []).length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 4 }}>
                                {(c.tags || []).map(t => {
                                  const cor = corDaEtiqueta(t);
                                  return <span key={t} style={{ fontSize: 9.5, fontWeight: 700, background: `${cor}1a`, color: cor, padding: '1px 6px', borderRadius: 10 }}>{t}</span>;
                                })}
                              </div>
                            )}
                            <div style={{ fontSize: 10.5, color: 'var(--text-soft, #9ca3af)', marginTop: 5 }}>{equipe.find(m => m.id === c.vendedor_id)?.nome || 'Sem consultor'}</div>
                            <div onClick={e => e.stopPropagation()}>
                              <select value={etapa} onChange={e => {
                                  const v = e.target.value;
                                  if (v === 'perdido') { setPerdaPromptId(c.id); setMotivoPerdaInput(''); }
                                  else atualizarFunilLead(c.id, v);
                                }}
                                style={{ width: '100%', marginTop: 7, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                                {FUNIL_ETAPAS.map(e => <option key={e} value={e}>{FUNIL_LABEL[e]}</option>)}
                              </select>
                              {perdaPromptId === c.id && (
                                <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                                  <select autoFocus value={motivoPerdaInput} onChange={e => setMotivoPerdaInput(e.target.value)}
                                    style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 4px', fontSize: 10.5, fontFamily: 'inherit' }}>
                                    <option value="">Motivo...</option>
                                    {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  <button onClick={() => { atualizarFunilLead(c.id, 'perdido', motivoPerdaInput); setPerdaPromptId(null); setMotivoPerdaInput(''); }}
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 7px', fontSize: 10.5, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                                </div>
                              )}
                            </div>
                          </KanbanCard>
                        ))}
                      </KanbanColuna>
                    );
                  })}
                </KanbanBoard>
                </>
              ) : (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                {loadingLeads ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : filtrados.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum cadastro encontrado</div>
                ) : (
                  <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 360px)' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {['Nome','Sobrenome','E-mail','WhatsApp','CRM','Onde Conheceu','Etiquetas','Endereço','Status','Funil','Consultor','Data','Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', position: 'sticky', top: 0, background: 'var(--surface-hover)', zIndex: 1 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtrados.map((c, i) => {
                          const whatsDup = whatsappCounts[(c.whatsapp || '').replace(/\D/g, '')] > 1;
                          return (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                            <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {c.nome}
                              {whatsDup && (
                                <span title="Este WhatsApp aparece em mais de um cadastro — pode ser a mesma pessoa cadastrada duas vezes."
                                  style={{ marginLeft: 6, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, cursor: 'help' }}>
                                  ⚠ possível duplicado
                                </span>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap' }}>{c.sobrenome || '-'}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{c.email}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: whatsDup ? 'var(--text-secondary, #374151)' : '#16a34a', textDecoration: 'none', fontWeight: whatsDup ? 700 : 400 }}>{c.whatsapp}</a>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{c.crm || '-'}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap' }}>{c.onde_conheceu || '-'}</td>
                            <td style={{ padding: '11px 14px', minWidth: 160 }} onClick={e => e.stopPropagation()}>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, alignItems: 'center' }}>
                                {(c.tags || []).map(tag => {
                                  const cor = corDaEtiqueta(tag);
                                  return (
                                    <span key={tag} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: `${cor}1a`, color: cor, border: `1px solid ${cor}55`, padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, whiteSpace: 'nowrap' }}>
                                      {tag}
                                      <button onClick={() => atualizarTagsLead(c.id, (c.tags || []).filter(t => t !== tag))}
                                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: cor, fontSize: 13, lineHeight: 1, padding: 0, fontWeight: 900 }}
                                        title="Remover etiqueta">×</button>
                                    </span>
                                  );
                                })}
                                {editandoTagsId === c.id ? (
                                  <input autoFocus value={novaTagInput}
                                    onChange={e => setNovaTagInput(e.target.value)}
                                    onBlur={() => { setEditandoTagsId(null); setNovaTagInput(''); }}
                                    onKeyDown={e => {
                                      if (e.key === 'Enter') {
                                        const v = novaTagInput.trim();
                                        if (v && !(c.tags || []).includes(v)) atualizarTagsLead(c.id, [...(c.tags || []), v]);
                                        setNovaTagInput(''); setEditandoTagsId(null);
                                      } else if (e.key === 'Escape') { setNovaTagInput(''); setEditandoTagsId(null); }
                                    }}
                                    placeholder="nova..."
                                    style={{ width: 76, border: '1px solid var(--border)', borderRadius: 20, padding: '2px 8px', fontSize: 11, fontFamily: 'inherit' }} />
                                ) : (
                                  <button onClick={() => setEditandoTagsId(c.id)}
                                    style={{ background: 'var(--surface-hover)', color: 'var(--text-muted, #6b7280)', border: '1px dashed var(--border)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>
                                    + tag
                                  </button>
                                )}
                              </div>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.endereco}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <span style={{
                                padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                background: c.status === 'aprovado' ? '#dcfce7' : c.status === 'pendente' ? 'var(--surface-hover)' : '#fee2e2',
                                color: c.status === 'aprovado' ? '#15803d' : c.status === 'pendente' ? 'var(--text-secondary, #374151)' : '#dc2626',
                              }}>{c.status}</span>
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                              {perdaPromptId === c.id ? (
                                <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                                  <select autoFocus value={motivoPerdaInput} onChange={e => setMotivoPerdaInput(e.target.value)}
                                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }}>
                                    <option value="">Motivo...</option>
                                    {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
                                  </select>
                                  <button onClick={() => { atualizarFunilLead(c.id, 'perdido', motivoPerdaInput); setPerdaPromptId(null); setMotivoPerdaInput(''); }}
                                    style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                                  <button onClick={() => { setPerdaPromptId(null); setMotivoPerdaInput(''); }}
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 13 }}>×</button>
                                </div>
                              ) : (
                                <select value={c.funil_status || 'novo'}
                                  onChange={e => {
                                    const v = e.target.value;
                                    if (v === 'perdido') { setPerdaPromptId(c.id); setMotivoPerdaInput(''); }
                                    else atualizarFunilLead(c.id, v);
                                  }}
                                  style={{ background: '#f1f5f9', color: FUNIL_COLOR_FIXO[c.funil_status || 'novo'], border: `1px solid ${FUNIL_COLOR_FIXO[c.funil_status || 'novo']}55`, borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}
                                  title={c.funil_status === 'perdido' && c.motivo_perda ? `Motivo: ${c.motivo_perda}` : undefined}>
                                  {FUNIL_ETAPAS.map(e => <option key={e} value={e}>{FUNIL_LABEL[e]}</option>)}
                                </select>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }} onClick={e => e.stopPropagation()}>
                              <select value={c.vendedor_id || ''} onChange={e => e.target.value && transferirConsultor(c.id, e.target.value)}
                                style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11.5, fontFamily: 'inherit', color: 'var(--text-secondary, #374151)', cursor: 'pointer', maxWidth: 130 }}>
                                <option value="">Sem consultor</option>
                                {equipe.filter(m => m.cargo === 'vendedor' && m.ativo).map(m => (
                                  <option key={m.id} value={m.id}>{m.nome}</option>
                                ))}
                              </select>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {new Date(c.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {c.status === 'pendente' && (
                                  <>
                                    <button onClick={() => aprovar(c.id)} style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit' }}>
                                      Aprovar
                                    </button>
                                    <button onClick={() => rejeitar(c.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                      Rejeitar
                                    </button>
                                  </>
                                )}
                                {c.status === 'aprovado' && c.token && (
                                  <>
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/acesso/${c.token}`); showMsg('Link copiado!'); }}
                                      style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                      Copiar Link
                                    </button>
                                    <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/indicar/${c.token}`); showMsg('Link de indicação copiado!'); }}
                                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                      Link Indicação
                                    </button>
                                    <button onClick={() => reenviarEmail(c.id, c.nome)} disabled={reenviandoId === c.id}
                                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: reenviandoId === c.id ? 'default' : 'pointer', fontSize: 12, fontFamily: 'inherit', opacity: reenviandoId === c.id ? 0.6 : 1 }}
                                      title="Reenviar o e-mail de acesso para este médico">
                                      {reenviandoId === c.id ? 'Enviando...' : 'Reenviar E-mail'}
                                    </button>
                                  </>
                                )}
                                <button onClick={() => { setEditandoLead(c); setNovoProdutoInteresseInput(''); }}
                                  style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}
                                  title="Editar dados do cadastro">
                                  Editar
                                </button>
                                {c.whatsapp && (
                                  <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                    style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
                                    WhatsApp
                                  </a>
                                )}
                                {isSuperadmin && (
                                  <button onClick={() => excluirCadastro(c.id, c.nome)}
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 13 }}
                                    title="Excluir cadastro">
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
              )}

              {/* Modal: editar cadastro */}
              {editandoLead && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
                  <div onClick={() => setEditandoLead(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                  <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>{editandoLead.nome} {editandoLead.sobrenome}</div>
                      <button onClick={() => setEditandoLead(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
                    </div>
                    <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      {editandoLead.status === 'pendente' && (
                        <>
                          <button onClick={() => { aprovar(editandoLead.id); setEditandoLead(null); }}
                            style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 12.5, fontFamily: 'inherit' }}>
                            Aprovar
                          </button>
                          <button onClick={() => { rejeitar(editandoLead.id); setEditandoLead(null); }}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
                            Rejeitar
                          </button>
                        </>
                      )}
                      {editandoLead.status === 'aprovado' && editandoLead.token && (
                        <>
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/acesso/${editandoLead.token}`); showMsg('Link copiado!'); }}
                            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
                            Copiar Link
                          </button>
                          <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/indicar/${editandoLead.token}`); showMsg('Link de indicação copiado!'); }}
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
                            Link Indicação
                          </button>
                          <button onClick={() => reenviarEmail(editandoLead.id, editandoLead.nome)} disabled={reenviandoId === editandoLead.id}
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, cursor: reenviandoId === editandoLead.id ? 'default' : 'pointer', fontSize: 12.5, fontFamily: 'inherit', opacity: reenviandoId === editandoLead.id ? 0.6 : 1 }}>
                            {reenviandoId === editandoLead.id ? 'Enviando...' : 'Reenviar E-mail'}
                          </button>
                        </>
                      )}
                      {editandoLead.whatsapp && (
                        <a href={`https://wa.me/55${editandoLead.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit', textDecoration: 'none' }}>
                          WhatsApp
                        </a>
                      )}
                      {isSuperadmin && (
                        <button onClick={() => { excluirCadastro(editandoLead.id, editandoLead.nome); setEditandoLead(null); }}
                          style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
                          Excluir
                        </button>
                      )}
                    </div>
                    <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Nome</label>
                          <input value={editandoLead.nome} onChange={e => setEditandoLead(l => l && { ...l, nome: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Sobrenome</label>
                          <input value={editandoLead.sobrenome || ''} onChange={e => setEditandoLead(l => l && { ...l, sobrenome: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>E-mail</label>
                        <input type="email" value={editandoLead.email} onChange={e => setEditandoLead(l => l && { ...l, email: e.target.value })} style={inputStyle} />
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>WhatsApp</label>
                          <input value={editandoLead.whatsapp} onChange={e => setEditandoLead(l => l && { ...l, whatsapp: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>CRM</label>
                          <input value={editandoLead.crm || ''} onChange={e => setEditandoLead(l => l && { ...l, crm: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Endereço</label>
                        <input value={editandoLead.endereco} onChange={e => setEditandoLead(l => l && { ...l, endereco: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Onde Conheceu</label>
                        <input value={editandoLead.onde_conheceu || ''} onChange={e => setEditandoLead(l => l && { ...l, onde_conheceu: e.target.value })} style={inputStyle} />
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Cidade</label>
                          <input value={editandoLead.cidade || ''} onChange={e => setEditandoLead(l => l && { ...l, cidade: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Estado (UF)</label>
                          <input value={editandoLead.estado || ''} onChange={e => setEditandoLead(l => l && { ...l, estado: e.target.value.toUpperCase().slice(0, 2) })} maxLength={2} style={inputStyle} />
                        </div>
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Especialidade</label>
                          <input value={editandoLead.especialidade || ''} onChange={e => setEditandoLead(l => l && { ...l, especialidade: e.target.value })} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>CPF</label>
                          <input value={editandoLead.cpf || ''} onChange={e => setEditandoLead(l => l && { ...l, cpf: e.target.value })} style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Produtos de Interesse</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
                          {(editandoLead.produtos_interesse || []).map(p => (
                            <span key={p} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                              {p}
                              <button type="button" onClick={() => setEditandoLead(l => l && { ...l, produtos_interesse: (l.produtos_interesse || []).filter(x => x !== p) })}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-secondary, #374151)', fontSize: 13, lineHeight: 1, padding: 0, fontWeight: 900 }}>×</button>
                            </span>
                          ))}
                          <input value={novoProdutoInteresseInput} onChange={e => setNovoProdutoInteresseInput(e.target.value)}
                            list="produtos-catalogo"
                            onKeyDown={e => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const v = novoProdutoInteresseInput.trim();
                                if (v && !(editandoLead.produtos_interesse || []).includes(v)) {
                                  setEditandoLead(l => l && { ...l, produtos_interesse: [...(l.produtos_interesse || []), v] });
                                }
                                setNovoProdutoInteresseInput('');
                              }
                            }}
                            placeholder="+ produto..." style={{ width: 130, border: '1px solid var(--border)', borderRadius: 20, padding: '4px 10px', fontSize: 12, fontFamily: 'inherit' }} />
                          <datalist id="produtos-catalogo">
                            {produtos.map(p => <option key={p.id} value={p.nome} />)}
                          </datalist>
                        </div>
                      </div>
                    </div>
                    <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                      <button onClick={() => setEditandoLead(null)} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                      <button onClick={salvarEdicaoLead} disabled={salvandoLead} style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoLead ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: salvandoLead ? 0.6 : 1 }}>
                        {salvandoLead ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Modal: novo cadastro (médico ou paciente) */}
              {novoCadastroTipo && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
                  <div onClick={fecharNovoCadastro} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                  <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                        {novoCadastroTipo === 'escolher' ? 'Cadastro Novo' : novoCadastroTipo === 'medico' ? 'Cadastrar Médico' : 'Cadastrar Paciente'}
                      </div>
                      <button onClick={fecharNovoCadastro} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
                    </div>

                    {novoCadastroTipo === 'escolher' && (
                      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button onClick={() => setNovoCadastroTipo('medico')}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 24 }}>🩺</span>
                          <span>
                            <div style={{ fontWeight: 800, color: 'var(--text-secondary, #374151)', fontSize: 14 }}>Cadastrar Médico</div>
                            <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, marginTop: 2 }}>Registrar um novo profissional diretamente</div>
                          </span>
                        </button>
                        <button onClick={() => setNovoCadastroTipo('paciente')}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 24 }}>🧑</span>
                          <span>
                            <div style={{ fontWeight: 800, color: 'var(--text-secondary, #374151)', fontSize: 14 }}>Cadastrar Paciente</div>
                            <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, marginTop: 2 }}>Registrar um paciente indicado por um médico</div>
                          </span>
                        </button>
                      </div>
                    )}

                    {novoCadastroTipo === 'medico' && (
                      <form onSubmit={criarMedicoManual} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                          <div>
                            <label style={labelStyle}>Nome *</label>
                            <input value={novoMedico.nome} onChange={e => setNovoMedico(p => ({ ...p, nome: e.target.value }))} required style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Sobrenome</label>
                            <input value={novoMedico.sobrenome} onChange={e => setNovoMedico(p => ({ ...p, sobrenome: e.target.value }))} style={inputStyle} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>E-mail *</label>
                          <input type="email" value={novoMedico.email} onChange={e => setNovoMedico(p => ({ ...p, email: e.target.value }))} required style={inputStyle} />
                        </div>
                        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                          <div>
                            <label style={labelStyle}>WhatsApp *</label>
                            <input value={novoMedico.whatsapp} onChange={e => setNovoMedico(p => ({ ...p, whatsapp: e.target.value }))} required style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>CRM</label>
                            <input value={novoMedico.crm} onChange={e => setNovoMedico(p => ({ ...p, crm: e.target.value }))} style={inputStyle} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Endereço</label>
                          <input value={novoMedico.endereco} onChange={e => setNovoMedico(p => ({ ...p, endereco: e.target.value }))} style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Onde Conheceu</label>
                          <select value={novoMedico.onde_conheceu} onChange={e => setNovoMedico(p => ({ ...p, onde_conheceu: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">Selecione...</option>
                            {['Convidado pela PeptideZ Health', 'Pós Graduação LR', 'Indicação de Médico', 'Mentoria ICS', 'Blog da PeptideZ Health', 'Outro'].map(o => (
                              <option key={o} value={o}>{o}</option>
                            ))}
                          </select>
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="button" onClick={() => setNovoCadastroTipo('escolher')} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                            Voltar
                          </button>
                          <button type="submit" disabled={salvandoNovoCadastro} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoNovoCadastro ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: salvandoNovoCadastro ? 0.6 : 1 }}>
                            {salvandoNovoCadastro ? 'Salvando...' : 'Cadastrar Médico'}
                          </button>
                        </div>
                      </form>
                    )}

                    {novoCadastroTipo === 'paciente' && (
                      <form onSubmit={criarPacienteManual} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                        <div>
                          <label style={labelStyle}>Médico Indicador *</label>
                          {novoPaciente.medico_id ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                                {cadastros.find(c => c.id === novoPaciente.medico_id)?.nome} {cadastros.find(c => c.id === novoPaciente.medico_id)?.sobrenome}
                              </span>
                              <button type="button" onClick={() => setNovoPaciente(p => ({ ...p, medico_id: '' }))} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Trocar</button>
                            </div>
                          ) : (
                            <>
                              <input value={buscaMedicoIndicador} onChange={e => setBuscaMedicoIndicador(e.target.value)}
                                placeholder="Buscar médico aprovado por nome..." style={inputStyle} />
                              <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 4 }}>Clique no nome do médico na lista para selecionar.</div>
                              {buscaMedicoIndicador.trim().length >= 2 && (
                                <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                                  {cadastros.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoIndicador.trim().toLowerCase())).slice(0, 8).map(c => (
                                    <div key={c.id} onClick={() => { setNovoPaciente(p => ({ ...p, medico_id: c.id })); setBuscaMedicoIndicador(''); }}
                                      style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</span>
                                      {c.crm && <span style={{ color: 'var(--text-muted, #6b7280)' }}> · {c.crm}</span>}
                                    </div>
                                  ))}
                                  {cadastros.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoIndicador.trim().toLowerCase())).length === 0 && (
                                    <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Nenhum médico aprovado encontrado.</div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                          <div>
                            <label style={labelStyle}>Nome *</label>
                            <input value={novoPaciente.nome} onChange={e => setNovoPaciente(p => ({ ...p, nome: e.target.value }))} required style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Sobrenome</label>
                            <input value={novoPaciente.sobrenome} onChange={e => setNovoPaciente(p => ({ ...p, sobrenome: e.target.value }))} style={inputStyle} />
                          </div>
                        </div>
                        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                          <div>
                            <label style={labelStyle}>WhatsApp *</label>
                            <input value={novoPaciente.whatsapp} onChange={e => setNovoPaciente(p => ({ ...p, whatsapp: e.target.value }))} required style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>E-mail</label>
                            <input type="email" value={novoPaciente.email} onChange={e => setNovoPaciente(p => ({ ...p, email: e.target.value }))} style={inputStyle} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Endereço</label>
                          <input value={novoPaciente.endereco} onChange={e => setNovoPaciente(p => ({ ...p, endereco: e.target.value }))} style={inputStyle} />
                        </div>
                        <div style={{ display: 'flex', gap: 10 }}>
                          <button type="button" onClick={() => setNovoCadastroTipo('escolher')} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                            Voltar
                          </button>
                          <button type="submit" disabled={salvandoNovoCadastro} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoNovoCadastro ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: (salvandoNovoCadastro || !novoPaciente.medico_id) ? 0.6 : 1 }}>
                            {salvandoNovoCadastro ? 'Salvando...' : 'Cadastrar Paciente'}
                          </button>
                        </div>
                      </form>
                    )}
                  </div>
                </div>
              )}
            </>
          )}

          {/* ======== ABA CLIENTES ======== */}
          {aba === 'clientes' && (() => {
            const clientes = cadastros.filter(c => c.funil_status === 'cliente');
            const q = buscaLead.trim().toLowerCase();
            const clientesFiltrados = !q ? clientes : clientes.filter(c =>
              `${c.nome} ${c.sobrenome} ${c.email} ${c.whatsapp}`.toLowerCase().includes(q));
            return (
              <>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0 }}>
                  Clientes <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({clientes.length})</span>
                </h2>
                <input value={buscaLead} onChange={e => setBuscaLead(e.target.value)}
                  placeholder="Buscar cliente por nome, e-mail ou WhatsApp..."
                  style={{ ...inputStyle, marginBottom: 16, maxWidth: 420 }} />
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {clientesFiltrados.length === 0 ? (
                    <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>
                      {clientes.length === 0 ? 'Nenhum cliente ainda. Leads viram cliente automaticamente quando um pedido é marcado como pago.' : 'Nenhum cliente encontrado para essa busca.'}
                    </div>
                  ) : (
                    <div style={{ overflow: 'auto', maxHeight: 'calc(100vh - 300px)' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                            {['Nome', 'WhatsApp', 'E-mail', 'Cidade/UF', 'Total Gasto', 'Produtos Comprados', 'Último Pedido', 'Consultor'].map(h => (
                              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {clientesFiltrados.map((c, i) => {
                            const pedidosCliente = pedidos.filter(p => p.cadastro_id === c.id);
                            const pedidosPagos = pedidosCliente.filter(p => p.status === 'pago');
                            const totalGasto = pedidosPagos.reduce((s, p) => s + p.preco, 0);
                            const produtosComprados = Array.from(new Set(pedidosPagos.map(p => p.produto_nome)));
                            const ultimoPedido = pedidosCliente.length > 0
                              ? [...pedidosCliente].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                              : null;
                            const consultor = equipe.find(m => m.id === c.vendedor_id)?.nome;
                            return (
                              <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                                <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>{c.nome} {c.sobrenome}</td>
                                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                  <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', textDecoration: 'none' }}>{c.whatsapp}</a>
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{c.email}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap' }}>{c.cidade ? `${c.cidade}/${c.estado || ''}` : '-'}</td>
                                <td style={{ padding: '11px 14px', color: '#16a34a', fontWeight: 800 }}>R$ {totalGasto.toFixed(2)}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={produtosComprados.join(', ')}>
                                  {produtosComprados.length > 0 ? produtosComprados.join(', ') : '-'}
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                                  {ultimoPedido ? new Date(ultimoPedido.created_at).toLocaleDateString('pt-BR') : '-'}
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)' }}>{consultor || <span style={{ color: 'var(--text-soft, #9ca3af)' }}>-</span>}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            );
          })()}

          {/* ======== ABA PRODUTOS ======== */}
          {aba === 'produtos' && (
            <div className="admin-split-360" style={{ display: 'grid', gap: 28, alignItems: 'start' }}>

              {/* Lista de produtos */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0 }}>
                  Catalogo <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({produtos.length})</span>
                </h2>
                {loadingProd ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : (
                  <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                    {produtos.map(p => (
                      <div key={p.id} style={{ background: 'var(--surface)', border: `1px solid ${p.custom ? '#bbf7d0' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
                        <div style={{ background: 'var(--surface-hover)', height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                          {p.imagem && (p.imagem.startsWith('http') || p.imagem.startsWith('/')) ? (
                            <img src={p.imagem} alt={p.nome} style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 8 }} />
                          ) : (
                            <img src="/produtos/frasco.svg" alt={p.nome} style={{ width: 70, height: 'auto' }} />
                          )}
                        </div>
                        <div style={{ padding: '11px 13px' }}>
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 3 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: '#16a34a', letterSpacing: 0.5, textTransform: 'uppercase' }}>{p.categoria}</span>
                            {p.categoria2 && (
                              <span style={{ fontSize: 9, fontWeight: 700, color: 'var(--text)', letterSpacing: 0.5, textTransform: 'uppercase' }}>+ {p.categoria2}</span>
                            )}
                          </div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', lineHeight: 1.3 }}>{p.nome}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{p.dose}</div>
                          <div style={{ fontSize: 15, fontWeight: 900, color: 'var(--text)', marginTop: 6 }}>
                            R$ {p.preco.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                          </div>
                          <div style={{ display: 'flex', gap: 5, marginTop: 8 }}>
                            <button
                              onClick={() => { setEditando({ ...p }); setMostrarProtocoloEdit(false); }}
                              style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 0', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                              Editar
                            </button>
                            <button onClick={() => duplicarProduto(p.id)}
                              style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}
                              title="Duplicar produto">
                              Dup
                            </button>
                            {p.custom && isSuperadmin && (
                              <button onClick={() => deletarProduto(p.id)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel direito: Categorias + Adicionar/Editar */}
              <div style={{ position: 'sticky', top: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>

                {/* Categorias */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <button type="button" onClick={() => { setMostrarCats(p => !p); if (!mostrarCats) carregarCategorias(); }}
                    style={{ width: '100%', padding: '13px 18px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #374151)' }}>
                    <span>Gerenciar Categorias</span>
                    <span style={{ color: 'var(--text-muted, #6b7280)' }}>{mostrarCats ? '-' : '-'}</span>
                  </button>
                  {mostrarCats && (
                    <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                      <div style={{ paddingTop: 12, marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted, #6b7280)', letterSpacing: 1, marginBottom: 6 }}>PADRAO (nao editavel)</div>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {CATEGORIAS.map(c => (
                            <span key={c} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-muted, #6b7280)', padding: '3px 10px', borderRadius: 12, fontSize: 11 }}>{c}</span>
                          ))}
                        </div>
                      </div>
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted, #6b7280)', letterSpacing: 1, marginBottom: 6 }}>PERSONALIZADAS</div>
                        {categoriasCustom.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', fontStyle: 'italic' }}>Nenhuma ainda.</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                          {categoriasCustom.map(c => (
                            <span key={c} style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '3px 10px', borderRadius: 12, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {c}
                                {isSuperadmin && (
                                  <button type="button" onClick={() => deletarCategoria(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>-</button>
                                )}
                              </span>
                            ))}
                          </div>
                        </div>
                      <form onSubmit={adicionarCategoria} style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <input value={novaCategoria} onChange={e => setNovaCategoria(e.target.value)} placeholder="Nova categoria..." style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 12 }} />
                        <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                      </form>
                    </div>
                  )}
                </div>

                {editando ? (
                  <div style={{ background: 'var(--surface)', border: '1px solid #bbf7d0', borderRadius: 12, padding: 24 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                      <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Editar Produto</h3>
                      <button onClick={() => setEditando(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20 }}>-</button>
                    </div>
                    <form onSubmit={salvarEdicao} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      <div>
                        <label style={labelStyle}>Nome do produto *</label>
                        <input value={editando.nome} onChange={e => setEditando(p => p && ({ ...p, nome: e.target.value }))} required style={inputStyle} />
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Categoria</label>
                          <select value={editando.categoria} onChange={e => setEditando(p => p && ({ ...p, categoria: e.target.value }))}
                            style={{ ...inputStyle, cursor: 'pointer' }}>
                            {[...CATEGORIAS, ...categoriasCustom].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>2ª Categoria <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                          <select value={editando.categoria2 || ''} onChange={e => setEditando(p => p && ({ ...p, categoria2: e.target.value || null }))}
                            style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">Nenhuma</option>
                            {[...CATEGORIAS, ...categoriasCustom].filter(c => c !== editando.categoria).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Dose</label>
                          <input value={editando.dose} onChange={e => setEditando(p => p && ({ ...p, dose: e.target.value }))} placeholder="Ex: 5mg" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Preço (R$) *</label>
                          <input type="number" min="0" step="0.01" value={editando.preco} onChange={e => setEditando(p => p && ({ ...p, preco: parseFloat(e.target.value) || 0 }))} required style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Imagem do produto</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={editando.imagem} onChange={e => setEditando(p => p && ({ ...p, imagem: e.target.value }))} placeholder="URL da imagem ou escolha um arquivo" style={{ ...inputStyle, flex: 1 }} />
                          <label style={{ background: uploadando === 'edit' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {uploadando === 'edit' ? '...' : 'Enviar'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('edit', f, url => { setEditando(p => p && ({ ...p, imagem: url })); setGaleriaUrls([]); }); e.target.value = ''; }} />
                          </label>
                        </div>
                        {editando.imagem && (
                          <div style={{ marginTop: 8, background: 'var(--surface-hover)', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={editando.imagem} alt="preview" style={{ maxHeight: 66, maxWidth: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                        <button type="button" onClick={() => abrirGaleria('imagem')}
                          style={{ marginTop: 8, width: '100%', background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                          x-️ Escolher da Galeria de Uploads ({galeriaUrls.length || '?'})
                        </button>
                        {mostrarGaleria && galeriaAlvo === 'imagem' && (
                          <div style={{ marginTop: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: 10, maxHeight: 200, overflowY: 'auto' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)' }}>SEUS UPLOADS ({galeriaUrls.length})</span>
                              <button type="button" onClick={() => setMostrarGaleria(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 16 }}>-</button>
                            </div>
                            <div className="admin-grid-thumbs" style={{ display: 'grid', gap: 6 }}>
                              {galeriaUrls.map(url => (
                                <div key={url} onClick={() => { setEditando(p => p && ({ ...p, imagem: url })); setMostrarGaleria(false); }}
                                  style={{ cursor: 'pointer', background: editando.imagem === url ? '#dcfce7' : 'var(--surface)', border: `2px solid ${editando.imagem === url ? '#16a34a' : 'var(--border)'}`, borderRadius: 6, overflow: 'hidden', height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {/* Galeria de Fotos */}
                      <div>
                        <label style={labelStyle}>Galeria de Fotos <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(fotos extras)</span></label>
                        {(editando.galeria || []).length > 0 && (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 8 }}>
                            {(editando.galeria || []).map((url, i) => (
                              <div key={i} style={{ position: 'relative', width: 52, height: 52, background: 'var(--surface-hover)', borderRadius: 6, overflow: 'hidden', border: '1px solid var(--border)', flexShrink: 0 }}>
                                <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                <button type="button" onClick={() => setEditando(p => p && ({ ...p, galeria: (p.galeria || []).filter((_, j) => j !== i) }))}
                                  style={{ position: 'absolute', top: 1, right: 1, background: 'rgba(220,38,38,0.9)', color: '#fff', border: 'none', borderRadius: '50%', width: 16, height: 16, fontSize: 10, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }}>-</button>
                              </div>
                            ))}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button type="button" onClick={() => abrirGaleria('galeria')}
                            style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '8px 0', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                            x-️ Adicionar da Galeria
                          </button>
                          <label style={{ background: uploadando === 'galeria' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 7, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                            {uploadando === 'galeria' ? '...' : 'Enviar'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('galeria', f, url => { setEditando(p => p && ({ ...p, galeria: [...(p.galeria || []), url] })); setGaleriaUrls([]); }); e.target.value = ''; }} />
                          </label>
                        </div>
                        {mostrarGaleria && galeriaAlvo === 'galeria' && (
                          <div style={{ marginTop: 8, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                              <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)' }}>CLIQUE PARA ADICIONAR / REMOVER</span>
                              <button type="button" onClick={() => setMostrarGaleria(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 16 }}>-</button>
                            </div>
                            <div className="admin-grid-thumbs" style={{ display: 'grid', gap: 6, maxHeight: 160, overflowY: 'auto' }}>
                              {galeriaUrls.map(url => {
                                const sel = (editando.galeria || []).includes(url);
                                return (
                                  <div key={url}
                                    onClick={() => setEditando(p => p && ({ ...p, galeria: sel ? (p.galeria || []).filter(u => u !== url) : [...(p.galeria || []), url] }))}
                                    style={{ cursor: 'pointer', background: sel ? '#dcfce7' : 'var(--surface)', border: `2px solid ${sel ? '#16a34a' : 'var(--border)'}`, borderRadius: 6, overflow: 'hidden', height: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                                    <img src={url} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', padding: 2 }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                                    {sel && <div style={{ position: 'absolute', top: 1, right: 2, fontSize: 10, color: '#16a34a', fontWeight: 900 }}>S"</div>}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Vídeo YouTube */}
                      <div>
                        <label style={labelStyle}>Vídeo YouTube <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                        <input value={editando.video || ''} onChange={e => setEditando(p => p && ({ ...p, video: e.target.value }))} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                        {editando.video && (() => {
                          const m = (editando.video || '').match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/);
                          return m
                            ? <div style={{ marginTop: 6, borderRadius: 6, overflow: 'hidden', aspectRatio: '16/9' }}><iframe src={`https://www.youtube.com/embed/${m[1]}`} style={{ width: '100%', height: '100%', border: 'none' }} allowFullScreen /></div>
                            : <p style={{ color: '#dc2626', fontSize: 11, margin: '4px 0 0' }}>URL inválida. Use youtube.com/watch?v=... ou youtu.be/...</p>;
                        })()}
                      </div>

                      <div>
                        <label style={labelStyle}>Descrição</label>
                        <textarea value={editando.descricao} onChange={e => setEditando(p => p && ({ ...p, descricao: e.target.value }))} placeholder="Descrição detalhada do produto..." rows={4} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                      </div>
                      <div>
                        {!mostrarProtocoloEdit && !editando.protocolo ? (
                          <button type="button" onClick={() => setMostrarProtocoloEdit(true)}
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px dashed var(--border)', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', width: '100%' }}>
                            + Protocolo Básico
                          </button>
                        ) : (
                          <>
                            <label style={labelStyle}>Protocolo Básico <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                            <textarea value={editando.protocolo || ''} onChange={e => setEditando(p => p && ({ ...p, protocolo: e.target.value }))} placeholder="Escreva aqui o protocolo básico de uso..." rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                          </>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="submit" style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                          Salvar Alterações
                        </button>
                        <button type="button" onClick={() => setEditando(null)} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', fontWeight: 600, padding: '11px 16px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                          Cancelar
                        </button>
                      </div>
                    </form>
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 18, color: 'var(--text)', margin: '0 0 18px' }}>Adicionar Produto</h3>
                    <form onSubmit={adicionarProduto} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                      <div>
                        <label style={labelStyle}>Nome do produto *</label>
                        <input value={novoProd.nome} onChange={e => setNovoProd(p => ({ ...p, nome: e.target.value }))} required placeholder="Ex: BPC-157" style={inputStyle} />
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Categoria</label>
                          <select value={novoProd.categoria} onChange={e => setNovoProd(p => ({ ...p, categoria: e.target.value }))}
                            style={{ ...inputStyle, cursor: 'pointer' }}>
                            {[...CATEGORIAS, ...categoriasCustom].map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>2ª Categoria <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                          <select value={novoProd.categoria2} onChange={e => setNovoProd(p => ({ ...p, categoria2: e.target.value }))}
                            style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">Nenhuma</option>
                            {[...CATEGORIAS, ...categoriasCustom].filter(c => c !== novoProd.categoria).map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                      </div>
                      <div className="admin-grid-auto" style={{ display: 'grid', gap: 10 }}>
                        <div>
                          <label style={labelStyle}>Dose</label>
                          <input value={novoProd.dose} onChange={e => setNovoProd(p => ({ ...p, dose: e.target.value }))} placeholder="Ex: 5mg" style={inputStyle} />
                        </div>
                        <div>
                          <label style={labelStyle}>Preço (R$) *</label>
                          <input type="number" min="0" step="0.01" value={novoProd.preco} onChange={e => setNovoProd(p => ({ ...p, preco: e.target.value }))} required placeholder="799.90" style={inputStyle} />
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Imagem do produto</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <input value={novoProd.imagem} onChange={e => setNovoProd(p => ({ ...p, imagem: e.target.value }))} placeholder="URL da imagem ou escolha um arquivo" style={{ ...inputStyle, flex: 1 }} />
                          <label style={{ background: uploadando === 'novo' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                            {uploadando === 'novo' ? '...' : 'Enviar'}
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('novo', f, url => setNovoProd(p => ({ ...p, imagem: url }))); e.target.value = ''; }} />
                          </label>
                        </div>
                        {novoProd.imagem && (
                          <div style={{ marginTop: 8, background: 'var(--surface-hover)', borderRadius: 6, height: 70, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                            <img src={novoProd.imagem} alt="preview" style={{ maxHeight: 66, maxWidth: '100%', objectFit: 'contain' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        )}
                      </div>
                      <div>
                        <label style={labelStyle}>Descrição</label>
                        <textarea value={novoProd.descricao} onChange={e => setNovoProd(p => ({ ...p, descricao: e.target.value }))} placeholder="Descrição detalhada do produto..." rows={3} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                      </div>
                      <div>
                        {!mostrarProtocoloNovo && !novoProd.protocolo ? (
                          <button type="button" onClick={() => setMostrarProtocoloNovo(true)}
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px dashed var(--border)', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', width: '100%' }}>
                            + Protocolo Básico
                          </button>
                        ) : (
                          <>
                            <label style={labelStyle}>Protocolo Básico <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                            <textarea value={novoProd.protocolo} onChange={e => setNovoProd(p => ({ ...p, protocolo: e.target.value }))} placeholder="Escreva aqui o protocolo básico de uso..." rows={5} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.55 }} />
                          </>
                        )}
                      </div>
                      <div>
                        <label style={labelStyle}>Vídeo YouTube <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                        <input value={novoProd.video} onChange={e => setNovoProd(p => ({ ...p, video: e.target.value }))} placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                      </div>
                      <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        Salvar Produto
                      </button>
                    </form>
                  </div>
                )}
              </div>{/* fim painel direito */}
            </div>
          )}

          {/* ======== ABA BANNERS ======== */}
          {aba === 'banners' && (
            <div className="admin-split-340" style={{ display: 'grid', gap: 28, alignItems: 'start' }}>

              {/* Lista de banners */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0 }}>
                  x-️ Banners do Carrossel <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({banners.filter(b => b.ativo).length} ativos)</span>
                </h2>
                {loadingBanners ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : banners.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    Nenhum banner. Adicione um ao lado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    {banners.map(b => (
                      <div key={b.id} style={{ background: 'var(--surface)', border: `1px solid ${b.ativo ? 'var(--border)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', opacity: b.ativo ? 1 : 0.5, display: 'flex', gap: 0 }}>
                        <div style={{ width: 200, flexShrink: 0, background: 'var(--surface-hover)', overflow: 'hidden', maxHeight: 80 }}>
                          <img src={b.imagem} alt={b.titulo} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }}
                            onError={e => { (e.target as HTMLImageElement).src = '/produtos/frasco.svg'; }} />
                        </div>
                        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>{b.titulo || '(sem título)'}</div>
                            {b.subtitulo && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>{b.subtitulo}</div>}
                            <div style={{ marginTop: 6 }}>
                              <span style={{ padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: b.ativo ? '#dcfce7' : 'var(--surface-hover)', color: b.ativo ? '#15803d' : 'var(--text-muted, #6b7280)' }}>
                                {b.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                            <button onClick={() => toggleBanner(b.id)}
                              style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                              {b.ativo ? '⏸ Pausar' : '- Ativar'}
                            </button>
                            {isSuperadmin && (
                              <button onClick={() => deletarBanner(b.id)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '6px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel: Adicionar Banner */}
              <div style={{ position: 'sticky', top: 24, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 800, margin: '0 0 18px', color: 'var(--text)' }}>Novo Banner</h3>
                <form onSubmit={adicionarBanner} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Imagem *</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={novoBanner.imagem} onChange={e => setNovoBanner(b => ({ ...b, imagem: e.target.value }))}
                        placeholder="URL ou escolha um arquivo" style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ background: uploadando === 'nb' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                        {uploadando === 'nb' ? '...' : 'Enviar'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('nb', f, url => setNovoBanner(b => ({ ...b, imagem: url }))); e.target.value = ''; }} />
                      </label>
                    </div>
                    {novoBanner.imagem && (
                      <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', height: 80, background: 'var(--surface-hover)' }}>
                        <img src={novoBanner.imagem} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    )}
                  </div>
                  <div>
                    <label style={labelStyle}>Título (opcional)</label>
                    <input value={novoBanner.titulo} onChange={e => setNovoBanner(b => ({ ...b, titulo: e.target.value }))} placeholder="Ex: Otimização Bioativa" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Subtítulo (opcional)</label>
                    <input value={novoBanner.subtitulo} onChange={e => setNovoBanner(b => ({ ...b, subtitulo: e.target.value }))} placeholder="Ex: Peptídeos para Prescrição Médica" style={inputStyle} />
                  </div>
                  <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    Adicionar ao Carrossel
                  </button>
                </form>
                <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 11, marginTop: 12, lineHeight: 1.6 }}>
                  Banners ativos aparecem no carrossel da loja em ordem de cadastro. Use o botão ⏸ para pausar sem excluir.
                </p>
              </div>
            </div>
          )}

          {/* ======== ABA BLOG ======== */}
          {aba === 'blog' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

            {/* ---- Banners do Blog ---- */}
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <button type="button" onClick={() => { setMostrarBannersBlog(p => !p); if (!mostrarBannersBlog) carregarBannersBlog(); }}
                style={{ width: '100%', padding: '15px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>
                <span>x-️ Banners do Blog <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, fontSize: 12 }}>({bannersBlog.filter(b => b.ativo).length} ativos)</span></span>
                <span style={{ color: 'var(--text-muted, #6b7280)' }}>{mostrarBannersBlog ? '-' : '-'}</span>
              </button>
              {mostrarBannersBlog && (
                <div style={{ padding: '0 20px 20px', borderTop: '1px solid var(--border)' }}>
                  {/* Lista de banners */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 16 }}>
                    {bannersBlog.map(b => (
                      <div key={b.id} style={{ display: 'flex', gap: 12, alignItems: 'center', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px', opacity: b.ativo ? 1 : 0.5 }}>
                        <div style={{ width: 80, height: 44, background: 'var(--surface-hover)', borderRadius: 6, overflow: 'hidden', flexShrink: 0 }}>
                          <img src={b.imagem} alt={b.titulo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.titulo || '(sem título)'}</div>
                          <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.imagem}</div>
                        </div>
                        <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                          <button onClick={() => toggleBannerBlog(b.id)} style={{ background: b.ativo ? '#f0fdf4' : 'var(--surface-hover)', color: b.ativo ? '#15803d' : 'var(--text-muted, #6b7280)', border: `1px solid ${b.ativo ? '#86efac' : 'var(--border)'}`, padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontWeight: 700, fontFamily: 'inherit' }}>
                            {b.ativo ? 'Ativo' : 'Inativo'}
                          </button>
                          {isSuperadmin && (
                            <button onClick={() => deletarBannerBlog(b.id)} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 9px', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}>-</button>
                          )}
                        </div>
                      </div>
                    ))}
                    {bannersBlog.length === 0 && <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, fontStyle: 'italic', paddingTop: 4 }}>Nenhum banner cadastrado.</div>}
                  </div>
                  {/* Formulário novo banner */}
                  <form onSubmit={adicionarBannerBlog} className="admin-grid-auto" style={{ display: 'grid', gap: 8, marginTop: 16, paddingTop: 16, borderTop: '1px solid var(--border)' }}>
                    <div style={{ gridColumn: '1 / -1', display: 'flex', gap: 8 }}>
                      <input value={novoBannerBlog.imagem} onChange={e => setNovoBannerBlog(b => ({ ...b, imagem: e.target.value }))} placeholder="URL da imagem *" required style={{ ...inputStyle, flex: 1, fontSize: 13 }} />
                      <label style={{ background: uploadando === 'banner-blog' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                        {uploadando === 'banner-blog' ? '...' : 'Enviar'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('banner-blog', f, url => setNovoBannerBlog(b => ({ ...b, imagem: url }))); e.target.value = ''; }} />
                      </label>
                    </div>
                    <input value={novoBannerBlog.titulo} onChange={e => setNovoBannerBlog(b => ({ ...b, titulo: e.target.value }))} placeholder="Título (opcional)" style={{ ...inputStyle, fontSize: 13 }} />
                    <input value={novoBannerBlog.subtitulo} onChange={e => setNovoBannerBlog(b => ({ ...b, subtitulo: e.target.value }))} placeholder="Subtítulo (opcional)" style={{ ...inputStyle, fontSize: 13 }} />
                    <button type="submit" style={{ gridColumn: '1 / -1', background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '10px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                      + Adicionar Banner
                    </button>
                  </form>
                </div>
              )}
            </div>

            {/* ---- Artigos + Formulário ---- */}
            <div className="admin-split-380" style={{ display: 'grid', gap: 28, alignItems: 'start' }}>
              {/* Lista de artigos */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0 }}>
                  Blog & Materiais <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({artigos.filter(a => a.publicado).length}/{artigos.length} publicados)</span>
                </h2>
                {loadingArtigos ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : artigos.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    Nenhum artigo. Crie um ao lado.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {artigos.map(a => (
                      <div key={a.id} style={{ background: 'var(--surface)', border: `1px solid ${a.publicado ? 'var(--border)' : 'var(--border)'}`, borderRadius: 12, overflow: 'hidden', display: 'flex', gap: 0, opacity: a.publicado ? 1 : 0.7 }}>
                        {a.imagem ? (
                          <div style={{ width: 100, flexShrink: 0, background: 'var(--surface-hover)', overflow: 'hidden' }}>
                            <img src={a.imagem} alt={a.titulo} style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                          </div>
                        ) : (
                          <div style={{ width: 80, flexShrink: 0, background: 'linear-gradient(135deg, #0f172a, #16a34a)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>x"</div>
                        )}
                        <div style={{ flex: 1, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)', marginBottom: 4 }}>{a.titulo}</div>
                            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                              <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: a.publicado ? '#dcfce7' : 'var(--surface-hover)', color: a.publicado ? '#15803d' : 'var(--text-muted, #6b7280)' }}>
                                {a.publicado ? 'Publicado' : 'Rascunho'}
                              </span>
                              {a.video && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: '#fef2f2', color: '#dc2626' }}>- Vídeo</span>}
                              {a.materiais.length > 0 && <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)' }}>{a.materiais.length} mat.</span>}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                            <button onClick={() => togglePublicar(a)}
                              style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                              {a.publicado ? '⏸' : '-'}
                            </button>
                            <button onClick={() => setEditandoArtigo({ ...a })}
                              style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                              Editar
                            </button>
                            {isSuperadmin && (
                              <button onClick={() => deletarArtigo(a.id)}
                                style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 12 }}>
                                -
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Painel: Formulário Artigo */}
              <div style={{ position: 'sticky', top: 24, background: 'var(--surface)', border: `1px solid ${editandoArtigo ? '#bbf7d0' : 'var(--border)'}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{editandoArtigo ? 'Editar Artigo' : 'Novo Artigo'}</h3>
                  {editandoArtigo && <button onClick={() => setEditandoArtigo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20 }}>-</button>}
                </div>
                <form onSubmit={salvarArtigo} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {/* Título */}
                  <div>
                    <label style={labelStyle}>Título *</label>
                    <input value={editandoArtigo ? editandoArtigo.titulo : novoArtigo.titulo}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, titulo: e.target.value })) : setNovoArtigo(a => ({ ...a, titulo: e.target.value }))}
                      required placeholder="Título do artigo" style={inputStyle} />
                  </div>
                  {/* Gerenciar categorias do blog */}
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
                    <button type="button" onClick={() => { setMostrarCatsBlog(p => !p); if (!mostrarCatsBlog) carregarCategoriasBlog(); }}
                      style={{ width: '100%', padding: '10px 14px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontFamily: 'inherit', fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #374151)' }}>
                      <span>Gerenciar Categorias do Blog</span>
                      <span style={{ color: 'var(--text-muted, #6b7280)' }}>{mostrarCatsBlog ? '-' : '-'}</span>
                    </button>
                    {mostrarCatsBlog && (
                      <div style={{ padding: '0 14px 14px', borderTop: '1px solid var(--border)' }}>
                        {categoriasBlog.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', fontStyle: 'italic', paddingTop: 10 }}>Nenhuma categoria criada ainda.</div>}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, paddingTop: 10 }}>
                          {categoriasBlog.map(c => (
                            <span key={c} style={{ background: '#f0fdf4', border: '1px solid #86efac', color: '#15803d', padding: '3px 10px', borderRadius: 12, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                              {c}
                              {isSuperadmin && (
                                <button type="button" onClick={() => deletarCategoriaBlog(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>-</button>
                              )}
                            </span>
                          ))}
                        </div>
                        <form onSubmit={adicionarCategoriaBlog} style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                          <input value={novaCategoriaBlog} onChange={e => setNovaCategoriaBlog(e.target.value)} placeholder="Nova categoria..." style={{ ...inputStyle, flex: 1, padding: '7px 10px', fontSize: 12 }} />
                          <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 7, padding: '7px 12px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                        </form>
                      </div>
                    )}
                  </div>
                  {/* Categoria */}
                  <div>
                    <label style={labelStyle}>Categoria</label>
                    <select value={editandoArtigo ? (editandoArtigo.categoria || '') : novoArtigo.categoria}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, categoria: e.target.value })) : setNovoArtigo(a => ({ ...a, categoria: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="">" Sem categoria "</option>
                      {categoriasBlog.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  {/* Imagem capa */}
                  <div>
                    <label style={labelStyle}>Imagem de Capa</label>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input value={editandoArtigo ? (editandoArtigo.imagem || '') : novoArtigo.imagem}
                        onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: e.target.value })) : setNovoArtigo(a => ({ ...a, imagem: e.target.value }))}
                        placeholder="URL da imagem" style={{ ...inputStyle, flex: 1 }} />
                      <label style={{ background: uploadando === 'artigo' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                        {uploadando === 'artigo' ? '...' : 'Enviar'}
                        <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadImagem('artigo', f, url => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: url })) : setNovoArtigo(a => ({ ...a, imagem: url }))); e.target.value = ''; }} />
                      </label>
                    </div>
                  </div>
                  {/* Conteúdo */}
                  <div>
                    <label style={labelStyle}>Conteúdo / Texto</label>
                    <textarea value={editandoArtigo ? editandoArtigo.conteudo : novoArtigo.conteudo}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, conteudo: e.target.value })) : setNovoArtigo(a => ({ ...a, conteudo: e.target.value }))}
                      placeholder="Escreva o artigo aqui..." rows={7} style={{ ...inputStyle, resize: 'vertical', lineHeight: 1.6 }} />
                  </div>
                  {/* Vídeo */}
                  <div>
                    <label style={labelStyle}>Vídeo YouTube <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
                    <input value={editandoArtigo ? (editandoArtigo.video || '') : novoArtigo.video}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, video: e.target.value })) : setNovoArtigo(a => ({ ...a, video: e.target.value }))}
                      placeholder="https://youtube.com/watch?v=..." style={inputStyle} />
                  </div>
                  {/* Materiais */}
                  <div>
                    <label style={labelStyle}>Materiais para Download <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(PDFs, links)</span></label>
                    {(editandoArtigo ? editandoArtigo.materiais : novoArtigo.materiais).map((m, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5 }}>
                        <span style={{ flex: 1, fontSize: 12, color: 'var(--text-secondary, #374151)', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.nome}</span>
                        <button type="button" onClick={() => {
                          if (editandoArtigo) setEditandoArtigo(a => a && ({ ...a, materiais: a.materiais.filter((_, j) => j !== i) }));
                          else setNovoArtigo(a => ({ ...a, materiais: a.materiais.filter((_, j) => j !== i) }));
                        }} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: 5, padding: '4px 8px', cursor: 'pointer', fontSize: 12, flexShrink: 0 }}>-</button>
                      </div>
                    ))}
                    <div style={{ display: 'flex', gap: 6, marginTop: 6, flexWrap: 'wrap' }}>
                      <input value={novoMaterial.nome} onChange={e => setNovoMaterial(m => ({ ...m, nome: e.target.value }))} placeholder="Nome do arquivo" style={{ ...inputStyle, flex: '1 1 120px', padding: '8px 10px', fontSize: 12 }} />
                      <input value={novoMaterial.url} onChange={e => setNovoMaterial(m => ({ ...m, url: e.target.value }))} placeholder="URL ou cole link" style={{ ...inputStyle, flex: '2 1 140px', padding: '8px 10px', fontSize: 12 }} />
                      <label style={{ background: uploadando === 'material' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', cursor: 'pointer', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0, whiteSpace: 'nowrap' }}>
                        {uploadando === 'material' ? '...' : 'Enviar'}
                        <input type="file" accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.zip,image/*" style={{ display: 'none' }} onChange={async e => {
                          const f = e.target.files?.[0]; if (!f) return;
                          const nome = novoMaterial.nome || f.name.replace(/\.[^.]+$/, '');
                          setNovoMaterial(m => ({ ...m, nome }));
                          await uploadImagem('material', f, url => setNovoMaterial(m => ({ ...m, url })));
                          e.target.value = '';
                        }} />
                      </label>
                      <button type="button" onClick={() => {
                        if (!novoMaterial.nome || !novoMaterial.url) return;
                        if (editandoArtigo) setEditandoArtigo(a => a && ({ ...a, materiais: [...a.materiais, novoMaterial] }));
                        else setNovoArtigo(a => ({ ...a, materiais: [...a.materiais, novoMaterial] }));
                        setNovoMaterial({ nome: '', url: '' });
                      }} style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 6, padding: '8px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', flexShrink: 0 }}>+ Add</button>
                    </div>
                  </div>
                  {/* Publicado */}
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                    <input type="checkbox"
                      checked={editandoArtigo ? editandoArtigo.publicado : novoArtigo.publicado}
                      onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, publicado: e.target.checked })) : setNovoArtigo(a => ({ ...a, publicado: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    Publicar (visível para membros)
                  </label>
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                      {editandoArtigo ? 'Salvar Alterações' : 'Criar Artigo'}
                    </button>
                    {editandoArtigo && (
                      <button type="button" onClick={() => setEditandoArtigo(null)} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', fontWeight: 600, padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </div>
            </div>
          )}

          {/* ======== ABA DASHBOARD ======== */}
          {aba === 'dashboard' && (
            <DashboardOverview
              cadastros={cadastros} pedidos={pedidos} equipe={equipe} produtos={produtos} config={config}
              despesas={despesas} indicacoes={indicacoes} mostrarVisaoNegocio
              onVerTodosLeads={() => mudarAba('leads')}
              onIrParaRelatorios={() => mudarAba('relatorios')}
              onIrParaEstoque={() => mudarAba('estoque')}
              onIrParaFinanceiro={() => mudarAba('despesas')}
              totalPacientes={totalPacientes}
            />
          )}

          {/* ======== ABA EQUIPE ======== */}
          {aba === 'equipe' && (
            <div className={isSuperadmin ? 'admin-split-340' : undefined} style={isSuperadmin ? { display: 'grid', gap: 28, alignItems: 'start' } : undefined}>
              {/* Lista */}
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
                  Equipe <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({equipe.filter(m => m.ativo).length} ativos)</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                    {equipe.filter(m => estaOnline(m.last_seen)).length} online agora
                  </span>
                </h2>
                {loadingEquipe ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : equipe.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    Nenhum membro. Adicione ao lado.
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="admin-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {(isSuperadmin ? ['Nome', 'Cargo', 'E-mail', 'Status', 'Online', 'Ações'] : ['Nome', 'Cargo', 'E-mail', 'Status', 'Online']).map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {equipe.map((m, i) => (
                          <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{m.nome}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.cargo === 'superadmin' ? 'var(--btn-primary-bg)' : m.cargo === 'vendedor' ? '#f0fdf4' : 'var(--surface-hover)', color: m.cargo === 'superadmin' ? 'var(--btn-primary-text)' : m.cargo === 'vendedor' ? '#15803d' : 'var(--text-secondary, #374151)' }}>
                                {m.cargo}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{m.email || '—'}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: m.ativo ? '#dcfce7' : 'var(--surface-hover)', color: m.ativo ? '#15803d' : 'var(--text-muted, #6b7280)' }}>
                                {m.ativo ? 'Ativo' : 'Inativo'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              {estaOnline(m.last_seen) ? (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, fontWeight: 700, color: '#15803d' }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#16a34a', display: 'inline-block' }} />
                                  Online
                                </span>
                              ) : (
                                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-soft, #9ca3af)' }}>
                                  <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }} />
                                  {m.last_seen ? `Visto ${new Date(m.last_seen).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}` : 'Nunca acessou'}
                                </span>
                              )}
                            </td>
                            {isSuperadmin && (
                              <td style={{ padding: '11px 14px' }}>
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => setEditandoMembro({ ...m })}
                                    style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>Editar</button>
                                  <button onClick={() => deletarMembro(m.id, m.nome)}
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>-</button>
                                </div>
                              </td>
                            )}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
                <div style={{ marginTop: 20, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: 'var(--text-secondary, #374151)' }}>
                  Portal da equipe disponível em <strong>/equipe/login</strong> para vendedores e gerentes.
                </div>
              </div>

              {/* Painel: Form Membro */}
              {isSuperadmin && (
              <div style={{ position: 'sticky', top: 24, background: 'var(--surface)', border: `1px solid ${editandoMembro ? '#bbf7d0' : 'var(--border)'}`, borderRadius: 12, padding: 24 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{editandoMembro ? 'Editar Membro' : 'Novo Membro'}</h3>
                  {editandoMembro && <button onClick={() => setEditandoMembro(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20 }}>-</button>}
                </div>
                <form onSubmit={salvarMembro} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nome *</label>
                    <input value={editandoMembro ? editandoMembro.nome : novoMembro.nome}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, nome: e.target.value })) : setNovoMembro(m => ({ ...m, nome: e.target.value }))}
                      required placeholder="Nome completo" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>E-mail</label>
                    <input type="email" value={editandoMembro ? editandoMembro.email : novoMembro.email}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, email: e.target.value })) : setNovoMembro(m => ({ ...m, email: e.target.value }))}
                      placeholder="email@exemplo.com" style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Cargo *</label>
                    <select value={editandoMembro ? editandoMembro.cargo : novoMembro.cargo}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, cargo: e.target.value })) : setNovoMembro(m => ({ ...m, cargo: e.target.value }))}
                      style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="admin">Admin (acesso total ao painel /admin)</option>
                      <option value="superadmin">Superadmin (portal da equipe)</option>
                      <option value="gerente">Gerente</option>
                      <option value="vendedor">Vendedor</option>
                    </select>
                  </div>
                  <div>
                    <label style={labelStyle}>Senha {(editandoMembro ? editandoMembro.cargo : novoMembro.cargo) === 'admin' ? 'do Painel' : 'do Portal'} *</label>
                    <input type="password"
                      value={editandoMembro ? (editandoMembro.senha || '') : novoMembro.senha}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, senha: e.target.value })) : setNovoMembro(m => ({ ...m, senha: e.target.value }))}
                      placeholder={editandoMembro ? '(deixe em branco para manter)' : 'mínimo 6 caracteres'}
                      style={inputStyle} />
                    <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 11, margin: '4px 0 0' }}>
                      {(editandoMembro ? editandoMembro.cargo : novoMembro.cargo) === 'admin'
                        ? <>Usada no acesso em <strong>/admin</strong>, junto com o e-mail</>
                        : <>Usada no acesso em <strong>/equipe/login</strong></>}
                    </p>
                  </div>
                  <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', fontSize: 14, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                    <input type="checkbox"
                      checked={editandoMembro ? editandoMembro.ativo : novoMembro.ativo}
                      onChange={e => editandoMembro ? setEditandoMembro(m => m && ({ ...m, ativo: e.target.checked })) : setNovoMembro(m => ({ ...m, ativo: e.target.checked }))}
                      style={{ width: 18, height: 18, cursor: 'pointer' }} />
                    Membro ativo
                  </label>
                  {editandoMembro?.token_acesso && (
                    <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                      <div style={{ color: '#15803d', fontWeight: 700, marginBottom: 4 }}>Link do Portal</div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <code style={{ fontSize: 10, color: 'var(--text-secondary, #374151)', wordBreak: 'break-all', flex: 1 }}>/equipe/{editandoMembro.token_acesso}</code>
                        <button type="button" onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/equipe/${editandoMembro!.token_acesso}`); showMsg('OK: Link copiado!'); }}
                          style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap' }}>
                          Copiar
                        </button>
                      </div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 10 }}>
                    <button type="submit" style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '11px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                      {editandoMembro ? 'Salvar' : 'Adicionar'}
                    </button>
                    {editandoMembro && (
                      <button type="button" onClick={() => setEditandoMembro(null)} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', fontWeight: 600, padding: '11px 14px', borderRadius: 8, border: '1px solid var(--border)', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                        Cancelar
                      </button>
                    )}
                  </div>
                </form>
              </div>
              )}
            </div>
          )}

          {/* ======== ABA INDICAÇÕES ======== */}
          {aba === 'indicacoes' && (() => {
            const indicacoesPacientes = indicacoes.filter(i => i.tipo !== 'medico');
            return (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>
                Indicações <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({indicacoesPacientes.length})</span>
              </h2>
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 20 }}>
                Pacientes cadastrados pelo link de indicação de um médico aprovado, com vínculo automático.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                <input value={buscaIndicacao} onChange={e => setBuscaIndicacao(e.target.value)}
                  placeholder="Buscar por médico indicador ou paciente indicado..."
                  style={{ ...inputStyle, maxWidth: 420, marginBottom: 0 }} />
                <ToggleListaKanban kanban={verIndicacoesKanban} onChange={setVerIndicacoesKanban} />
              </div>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {(['todos', 'em_atendimento', 'negociacao', 'pago', 'cancelado'] as const).map(val => {
                  const corSemantica = val === 'pago' ? '#15803d' : val === 'cancelado' ? '#dc2626' : null;
                  const label = val === 'todos' ? 'Todos' : PIPELINE_STATUS_LABEL[val];
                  const n = val === 'todos' ? indicacoesPacientes.length : indicacoesPacientes.filter(i => i.status === val).length;
                  const ativo = filtroIndicacao === val;
                  return (
                    <button key={val} onClick={() => setFiltroIndicacao(val)}
                      style={{
                        background: ativo ? (corSemantica || 'var(--btn-primary-bg)') : 'var(--surface)',
                        color: ativo ? (corSemantica ? '#fff' : 'var(--btn-primary-text)') : 'var(--text-secondary, #374151)',
                        border: `1px solid ${ativo ? (corSemantica || 'var(--btn-primary-bg)') : 'var(--border)'}`,
                        padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: ativo ? 700 : 400, fontFamily: 'inherit', fontSize: 13,
                      }}>
                      {label} ({n})
                    </button>
                  );
                })}
              </div>

              {(() => {
                const porFiltro = filtroIndicacao === 'todos' ? indicacoesPacientes : indicacoesPacientes.filter(i => i.status === filtroIndicacao);
                const q = buscaIndicacao.trim().toLowerCase();
                const indicacoesFiltradas = !q ? porFiltro : porFiltro.filter(i =>
                  `${i.medico_nome} ${i.nome} ${i.sobrenome} ${i.email || ''}`.toLowerCase().includes(q));

                const porMedico = new Map<string, number>();
                indicacoesFiltradas.forEach(i => porMedico.set(i.medico_nome, (porMedico.get(i.medico_nome) || 0) + 1));
                const ranking = [...porMedico.entries()].sort((a, b) => b[1] - a[1]);
                const maxIndic = Math.max(...ranking.map(([, n]) => n), 1);

                const comComissao = indicacoesPacientes.filter(i => i.comissao_paga);
                const totalComissoes = comComissao.reduce((s, i) => s + (i.comissao_valor || 0), 0);

                return (
                  <>
                    {ranking.length > 0 && (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Indicações por Médico</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                          {ranking.map(([medico, n]) => (
                            <div key={medico}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                                <span style={{ color: 'var(--text-secondary, #374151)', fontWeight: 600 }}>{medico}</span>
                                <span style={{ color: 'var(--text)', fontWeight: 700 }}>{n} indicaç{n === 1 ? 'ão' : 'ões'}</span>
                              </div>
                              <div style={{ background: 'var(--surface-hover)', borderRadius: 4, height: 6 }}>
                                <div style={{ background: 'var(--btn-primary-bg)', borderRadius: 4, height: '100%', width: `${(n / maxIndic) * 100}%` }} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: comComissao.length > 0 ? 16 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Comissões Pagas</div>
                          <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 2 }}>Lançada quando uma indicação chega em &quot;Pago&quot; e você informa o valor no botão + Comissão</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a', whiteSpace: 'nowrap' }}>R$ {totalComissoes.toFixed(2)}</div>
                      </div>
                      {comComissao.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16 }}>
                          {comComissao.map(i => (
                            <div key={i.id} onClick={() => setEditandoIndicacao(i)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                              <span style={{ color: 'var(--text-secondary, #374151)' }}>{i.medico_nome} <span style={{ color: 'var(--text-soft, #9ca3af)' }}>· indicou {i.nome} {i.sobrenome}</span></span>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>R$ {(i.comissao_valor || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {loadingIndicacoes ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                    ) : indicacoesFiltradas.length === 0 ? (
                      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                        {indicacoesPacientes.length === 0
                          ? <>Nenhuma indicação ainda. O botão &quot;Copiar Link de Indicação&quot; aparece na aba Leads para médicos aprovados.</>
                          : <>Nenhuma indicação encontrada para essa busca.</>}
                      </div>
                    ) : verIndicacoesKanban ? (
                      <KanbanBoard>
                        {(['em_atendimento', 'negociacao', 'pago', 'cancelado'] as const).map(etapa => {
                          const itens = indicacoesFiltradas.filter(i => i.status === etapa);
                          const cor = PIPELINE_STATUS_COLOR[etapa]?.text || 'var(--text-secondary, #374151)';
                          return (
                            <KanbanColuna key={etapa} titulo={PIPELINE_STATUS_LABEL[etapa]} cor={cor} total={itens.length}>
                              {itens.map(i => (
                                <KanbanCard key={i.id} onClick={() => setEditandoIndicacao(i)}>
                                  <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Indicado por {i.medico_nome}</div>
                                  <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{i.nome} {i.sobrenome}</div>
                                  {i.whatsapp && (
                                    <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11.5, color: '#16a34a', textDecoration: 'none', display: 'block', marginTop: 2 }}>{i.whatsapp}</a>
                                  )}
                                  <div onClick={e => e.stopPropagation()}>
                                    <select value={etapa} onChange={e => atualizarStatusIndicacao(i, e.target.value)}
                                      style={{ width: '100%', marginTop: 7, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                                      <option value="em_atendimento">Em Atendimento</option>
                                      <option value="negociacao">Negociação</option>
                                      <option value="pago">Pago</option>
                                      <option value="cancelado">Cancelado</option>
                                    </select>
                                    <ComissaoWidget id={i.id} comissaoValor={i.comissao_valor} comissaoPaga={i.comissao_paga} totalBase={totalBaseFor(i.id)}
                                      mostrar={etapa === 'pago'} promptId={comissaoPromptId} setPromptId={setComissaoPromptId}
                                      input={comissaoInput} setInput={setComissaoInput} onConfirmar={lancarComissao} />
                                  </div>
                                </KanbanCard>
                              ))}
                            </KanbanColuna>
                          );
                        })}
                      </KanbanBoard>
                    ) : (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        <div className="admin-table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                              {['Paciente', 'WhatsApp', 'E-mail', 'Endereço', 'Médico Indicador', 'Status', 'Data', 'Ações'].map(h => (
                                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {indicacoesFiltradas.map((i, idx) => (
                              <tr key={i.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                                <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{i.nome} {i.sobrenome}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  {i.whatsapp && (
                                    <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                                      style={{ color: '#128C46', textDecoration: 'none', fontWeight: 600 }}>{i.whatsapp}</a>
                                  )}
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{i.email || '—'}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.endereco}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 700 }}>{i.medico_nome}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  <select value={i.status} onChange={e => atualizarStatusIndicacao(i, e.target.value)}
                                    style={{ background: (PIPELINE_STATUS_COLOR[i.status] || { bg: 'var(--surface)' }).bg, color: (PIPELINE_STATUS_COLOR[i.status] || { text: 'var(--text)' }).text, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                                    <option value="em_atendimento">Em Atendimento</option>
                                    <option value="negociacao">Negociação</option>
                                    <option value="pago">Pago</option>
                                    <option value="cancelado">Cancelado</option>
                                  </select>
                                  <ComissaoWidget id={i.id} comissaoValor={i.comissao_valor} comissaoPaga={i.comissao_paga} totalBase={totalBaseFor(i.id)}
                                    mostrar={i.status === 'pago'} promptId={comissaoPromptId} setPromptId={setComissaoPromptId}
                                    input={comissaoInput} setInput={setComissaoInput} onConfirmar={lancarComissao} />
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                                  {new Date(i.created_at).toLocaleDateString('pt-BR')}
                                </td>
                                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    {i.whatsapp && (
                                      <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                        style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
                                        WhatsApp
                                      </a>
                                    )}
                                    {isSuperadmin && (
                                      <button onClick={() => excluirIndicacao(i.id, `${i.nome} ${i.sobrenome}`)}
                                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                        Excluir
                                      </button>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            );
          })()}

          {/* ======== ABA INDICAÇÕES MÉDICAS ======== */}
          {aba === 'indicacoes-medicas' && (() => {
            const indicacoesMedicas = indicacoes.filter(i => i.tipo === 'medico');
            const q = buscaIndicacao.trim().toLowerCase();
            const filtradas = !q ? indicacoesMedicas : indicacoesMedicas.filter(i =>
              `${i.medico_nome} ${i.nome} ${i.sobrenome} ${i.email || ''} ${i.crm || ''}`.toLowerCase().includes(q));

            const porMedico = new Map<string, number>();
            filtradas.forEach(i => porMedico.set(i.medico_nome, (porMedico.get(i.medico_nome) || 0) + 1));
            const ranking = [...porMedico.entries()].sort((a, b) => b[1] - a[1]);
            const maxIndic = Math.max(...ranking.map(([, n]) => n), 1);

            return (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>
                  Indicações Médicas <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({indicacoesMedicas.length})</span>
                </h2>
                <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 20 }}>
                  Médicos indicados por outros médicos já aprovados, pelo card &quot;Indicar Médico&quot; na tela inicial.
                </p>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
                  <input value={buscaIndicacao} onChange={e => setBuscaIndicacao(e.target.value)}
                    placeholder="Buscar por médico indicador, indicado ou CRM..."
                    style={{ ...inputStyle, maxWidth: 420, marginBottom: 0 }} />
                  <ToggleListaKanban kanban={verIndicacoesMedicasKanban} onChange={setVerIndicacoesMedicasKanban} />
                </div>

                {ranking.length > 0 && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Indicações Médicas por Médico</div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {ranking.map(([medico, n]) => (
                        <div key={medico}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                            <span style={{ color: 'var(--text-secondary, #374151)', fontWeight: 600 }}>{medico}</span>
                            <span style={{ color: 'var(--text-secondary, #374151)', fontWeight: 700 }}>{n} indicaç{n === 1 ? 'ão' : 'ões'}</span>
                          </div>
                          <div style={{ background: 'var(--surface-hover)', borderRadius: 4, height: 6 }}>
                            <div style={{ background: 'var(--btn-primary-bg)', borderRadius: 4, height: '100%', width: `${(n / maxIndic) * 100}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(() => {
                  const comComissao = indicacoesMedicas.filter(i => i.comissao_paga);
                  const totalComissoes = comComissao.reduce((s, i) => s + (i.comissao_valor || 0), 0);
                  return (
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: comComissao.length > 0 ? 16 : 0 }}>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>Comissões Pagas</div>
                          <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 2 }}>Lançada quando uma indicação chega em &quot;Convertido&quot; e você informa o valor no botão + Comissão</div>
                        </div>
                        <div style={{ fontSize: 16, fontWeight: 900, color: '#16a34a', whiteSpace: 'nowrap' }}>R$ {totalComissoes.toFixed(2)}</div>
                      </div>
                      {comComissao.length > 0 && (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginTop: 16 }}>
                          {comComissao.map(i => (
                            <div key={i.id} onClick={() => setEditandoIndicacao(i)} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, padding: '8px 0', borderBottom: '1px solid var(--border)', cursor: 'pointer' }}>
                              <span style={{ color: 'var(--text-secondary, #374151)' }}>{i.medico_nome} <span style={{ color: 'var(--text-soft, #9ca3af)' }}>· indicou {i.nome} {i.sobrenome}</span></span>
                              <span style={{ color: '#16a34a', fontWeight: 700 }}>R$ {(i.comissao_valor || 0).toFixed(2)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}

                {loadingIndicacoes ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : filtradas.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    {indicacoesMedicas.length === 0
                      ? <>Nenhuma indicação médica ainda. O card &quot;Indicar Médico&quot; aparece na tela inicial para médicos aprovados.</>
                      : <>Nenhuma indicação encontrada para essa busca.</>}
                  </div>
                ) : verIndicacoesMedicasKanban ? (
                  <KanbanBoard>
                    {(['novo', 'contatado', 'convertido', 'reprovado'] as const).map(etapa => {
                      const itens = filtradas.filter(i => i.status === etapa);
                      const cor = INDICACAO_MEDICA_STATUS_COLOR[etapa]?.text || 'var(--text-secondary, #374151)';
                      return (
                        <KanbanColuna key={etapa} titulo={INDICACAO_MEDICA_STATUS_LABEL[etapa]} cor={cor} total={itens.length}>
                          {itens.map(i => (
                            <KanbanCard key={i.id} onClick={() => setEditandoIndicacao(i)}>
                              <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: 0.3 }}>Indicado por {i.medico_nome}</div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)', marginTop: 2 }}>{i.nome} {i.sobrenome}</div>
                              {i.crm && <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>CRM {i.crm}</div>}
                              {i.whatsapp && (
                                <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} style={{ fontSize: 11.5, color: '#16a34a', textDecoration: 'none', display: 'block', marginTop: 2 }}>{i.whatsapp}</a>
                              )}
                              <div onClick={e => e.stopPropagation()}>
                                <select value={etapa} onChange={e => atualizarStatusIndicacao(i, e.target.value)}
                                  style={{ width: '100%', marginTop: 7, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 6px', fontSize: 11, fontFamily: 'inherit', cursor: 'pointer' }}>
                                  <option value="novo">Novo</option>
                                  <option value="contatado">Contatado</option>
                                  <option value="convertido">Convertido</option>
                                  <option value="reprovado">Reprovado</option>
                                </select>
                                <ComissaoWidget id={i.id} comissaoValor={i.comissao_valor} comissaoPaga={i.comissao_paga} totalBase={totalBaseFor(i.id)}
                                  mostrar={etapa === 'convertido'} promptId={comissaoPromptId} setPromptId={setComissaoPromptId}
                                  input={comissaoInput} setInput={setComissaoInput} onConfirmar={lancarComissao} />
                              </div>
                            </KanbanCard>
                          ))}
                        </KanbanColuna>
                      );
                    })}
                  </KanbanBoard>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="admin-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {['Médico Indicador', 'Médico Indicado', 'CRM', 'WhatsApp', 'E-mail', 'Endereço', 'Status', 'Data', 'Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {filtradas.map((i, idx) => (
                          <tr key={i.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                            <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', fontWeight: 700 }}>{i.medico_nome}</td>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{i.nome} {i.sobrenome}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{i.crm || '—'}</td>
                            <td style={{ padding: '11px 14px' }}>
                              {i.whatsapp && (
                                <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                                  style={{ color: '#128C46', textDecoration: 'none', fontWeight: 600 }}>{i.whatsapp}</a>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{i.email || '—'}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{i.endereco}</td>
                            <td style={{ padding: '11px 14px' }}>
                              <select value={i.status} onChange={e => atualizarStatusIndicacao(i, e.target.value)}
                                style={{ background: (INDICACAO_MEDICA_STATUS_COLOR[i.status] || { bg: 'var(--surface)', text: 'var(--text)' }).bg, color: (INDICACAO_MEDICA_STATUS_COLOR[i.status] || { bg: 'var(--surface)', text: 'var(--text)' }).text, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                                <option value="novo">Novo</option>
                                <option value="contatado">Contatado</option>
                                <option value="convertido">Convertido</option>
                                <option value="reprovado">Reprovado</option>
                              </select>
                              <ComissaoWidget id={i.id} comissaoValor={i.comissao_valor} comissaoPaga={i.comissao_paga} totalBase={totalBaseFor(i.id)}
                                mostrar={i.status === 'convertido'} promptId={comissaoPromptId} setPromptId={setComissaoPromptId}
                                input={comissaoInput} setInput={setComissaoInput} onConfirmar={lancarComissao} />
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {new Date(i.created_at).toLocaleDateString('pt-BR')}
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              <div style={{ display: 'flex', gap: 6 }}>
                                {i.whatsapp && (
                                  <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                    style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
                                    WhatsApp
                                  </a>
                                )}
                                {i.status !== 'reprovado' && (
                                  <button onClick={() => atualizarStatusIndicacao(i, 'reprovado')}
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                                    Reprovar
                                  </button>
                                )}
                                {isSuperadmin && (
                                  <button onClick={() => excluirIndicacao(i.id, `${i.nome} ${i.sobrenome}`)}
                                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                    Excluir
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======== ABA PEDIDOS ======== */}
          {aba === 'pedidos' && (() => {
            const pedidosCounts = {
              todos: pedidos.length,
              em_atendimento: pedidos.filter(p => p.status === 'em_atendimento').length,
              negociacao: pedidos.filter(p => p.status === 'negociacao').length,
              pago: pedidos.filter(p => p.status === 'pago').length,
              cancelado: pedidos.filter(p => p.status === 'cancelado').length,
            };
            const pedidosFiltrados = filtroPedido === 'todos' ? pedidos : pedidos.filter(p => p.status === filtroPedido);

            return (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6, flexWrap: 'wrap' }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>
                  Pedidos <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({pedidos.length})</span>
                </h2>
                <button onClick={() => setNovoPedidoAberto(true)}
                  style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 16px', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                  + Novo Pedido
                </button>
              </div>
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 20 }}>
                Todos os pedidos feitos na loja pelos médicos aprovados. Você pode alterar o status ou excluir pedidos de teste.
              </p>

              {/* Filtros */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
                {(['todos', 'em_atendimento', 'negociacao', 'pago', 'cancelado'] as const).map(val => {
                  const corSemantica = val === 'pago' ? '#15803d' : val === 'cancelado' ? '#dc2626' : null;
                  const label = val === 'todos' ? 'Todos' : PIPELINE_STATUS_LABEL[val];
                  const ativo = filtroPedido === val;
                  return (
                    <button key={val} onClick={() => setFiltroPedido(val)}
                      style={{
                        background: ativo ? (corSemantica || 'var(--btn-primary-bg)') : 'var(--surface)',
                        color: ativo ? (corSemantica ? '#fff' : 'var(--btn-primary-text)') : 'var(--text-secondary, #374151)',
                        border: `1px solid ${ativo ? (corSemantica || 'var(--btn-primary-bg)') : 'var(--border)'}`,
                        padding: '7px 16px', borderRadius: 6, cursor: 'pointer', fontWeight: ativo ? 700 : 400, fontFamily: 'inherit', fontSize: 13,
                      }}>
                      {label} ({pedidosCounts[val]})
                    </button>
                  );
                })}
              </div>

              {pedidosFiltrados.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  Nenhum pedido encontrado para esse filtro.
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="admin-table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {['Cliente', 'Produto(s)', 'Valor', 'Status', 'Data', 'Ações'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pedidosFiltrados.map((p, idx) => {
                        const cc = PIPELINE_STATUS_COLOR[p.status] || { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' };
                        return (
                        <tr key={p.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ fontWeight: 700, color: 'var(--text)' }}>{p.indicacao_id ? p.paciente_nome : p.cadastro_nome}</div>
                            {p.indicacao_id ? (
                              <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>indicado por {p.cadastro_nome}</div>
                            ) : (
                              <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{p.cadastro_email}</div>
                            )}
                          </td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', maxWidth: 220, fontSize: 12 }}>
                            {p.itens && p.itens.length > 0 ? p.itens.map(it => `${it.nome} x${it.quantidade}`).join(', ') : p.produto_nome}
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                              <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>R$</span>
                              <input type="number" step="0.01" min="0" defaultValue={p.preco} key={`${p.id}-${p.preco}`}
                                onBlur={e => {
                                  const v = parseFloat(e.target.value);
                                  if (!isNaN(v) && v !== p.preco) atualizarValorPedido(p.id, v);
                                }}
                                style={{ width: 88, border: '1px solid var(--border)', borderRadius: 5, padding: '4px 6px', fontSize: 13, fontWeight: 700, color: '#16a34a', fontFamily: 'inherit', background: 'var(--surface)' }} />
                            </div>
                          </td>
                          <td style={{ padding: '11px 14px' }}>
                            <select value={p.status} onChange={e => atualizarStatusPedido(p.id, e.target.value)}
                              style={{ background: cc.bg, color: cc.text, border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                              <option value="em_atendimento">Em Atendimento</option>
                              <option value="negociacao">Negociação</option>
                              <option value="pago">Pago</option>
                              <option value="cancelado">Cancelado</option>
                            </select>
                          </td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                            {new Date(p.created_at).toLocaleDateString('pt-BR')}
                          </td>
                          <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                              {p.cadastro_whatsapp && (
                                <a href={`https://wa.me/55${p.cadastro_whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                  style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
                                  WhatsApp
                                </a>
                              )}
                              {isSuperadmin && (
                                <button onClick={() => excluirPedido(p.id, p.cadastro_nome)}
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                  Excluir
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}

              {/* Modal: novo pedido */}
              {novoPedidoAberto && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
                  <div onClick={fecharNovoPedido} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                  <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>Novo Pedido</div>
                      <button onClick={fecharNovoPedido} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
                    </div>
                    <form onSubmit={criarPedidoManual} style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Pedido de *</label>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['medico', 'paciente'] as const).map(tipo => (
                            <button key={tipo} type="button"
                              onClick={() => { setNovoPedidoTipoCliente(tipo); setNovoPedidoMedicoId(''); setBuscaMedicoPedido(''); setNovoPedidoIndicacaoId(''); setBuscaPacientePedido(''); }}
                              style={{
                                flex: 1, padding: '8px 12px', borderRadius: 6, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit',
                                background: novoPedidoTipoCliente === tipo ? 'var(--btn-primary-bg)' : 'var(--surface-hover)',
                                color: novoPedidoTipoCliente === tipo ? 'var(--btn-primary-text)' : 'var(--text-secondary, #374151)',
                                border: '1px solid ' + (novoPedidoTipoCliente === tipo ? 'var(--btn-primary-bg)' : 'var(--border)'),
                              }}>
                              {tipo === 'medico' ? 'Médico' : 'Paciente'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {novoPedidoTipoCliente === 'medico' ? (
                        <div>
                          <label style={labelStyle}>Médico *</label>
                          {novoPedidoMedicoId ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                                {cadastros.find(c => c.id === novoPedidoMedicoId)?.nome} {cadastros.find(c => c.id === novoPedidoMedicoId)?.sobrenome}
                              </span>
                              <button type="button" onClick={() => setNovoPedidoMedicoId('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Trocar</button>
                            </div>
                          ) : (
                            <>
                              <input value={buscaMedicoPedido} onChange={e => setBuscaMedicoPedido(e.target.value)}
                                placeholder="Buscar médico aprovado por nome..." style={inputStyle} />
                              {buscaMedicoPedido.trim().length >= 2 && (
                                <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                                  {cadastros.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoPedido.trim().toLowerCase())).slice(0, 8).map(c => (
                                    <div key={c.id} onClick={() => { setNovoPedidoMedicoId(c.id); setBuscaMedicoPedido(''); }}
                                      style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</span>
                                      {c.crm && <span style={{ color: 'var(--text-muted, #6b7280)' }}> · {c.crm}</span>}
                                    </div>
                                  ))}
                                  {cadastros.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoPedido.trim().toLowerCase())).length === 0 && (
                                    <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Nenhum médico aprovado encontrado.</div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <div>
                          <label style={labelStyle}>Paciente *</label>
                          {novoPedidoIndicacaoId ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                              <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>
                                {indicacoes.find(i => i.id === novoPedidoIndicacaoId)?.nome} {indicacoes.find(i => i.id === novoPedidoIndicacaoId)?.sobrenome}
                                {' — indicado por '}{indicacoes.find(i => i.id === novoPedidoIndicacaoId)?.medico_nome}
                              </span>
                              <button type="button" onClick={() => setNovoPedidoIndicacaoId('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Trocar</button>
                            </div>
                          ) : (
                            <>
                              <input value={buscaPacientePedido} onChange={e => setBuscaPacientePedido(e.target.value)}
                                placeholder="Buscar paciente por nome..." style={inputStyle} />
                              {buscaPacientePedido.trim().length >= 2 && (
                                <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                                  {indicacoes.filter(i => i.tipo !== 'medico' && `${i.nome} ${i.sobrenome || ''}`.toLowerCase().includes(buscaPacientePedido.trim().toLowerCase())).slice(0, 8).map(i => (
                                    <div key={i.id} onClick={() => { setNovoPedidoIndicacaoId(i.id); setBuscaPacientePedido(''); }}
                                      style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                      <span style={{ fontWeight: 700, color: 'var(--text)' }}>{i.nome} {i.sobrenome}</span>
                                      <span style={{ color: 'var(--text-muted, #6b7280)' }}> · indicado por {i.medico_nome}</span>
                                    </div>
                                  ))}
                                  {indicacoes.filter(i => i.tipo !== 'medico' && `${i.nome} ${i.sobrenome || ''}`.toLowerCase().includes(buscaPacientePedido.trim().toLowerCase())).length === 0 && (
                                    <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Nenhum paciente encontrado.</div>
                                  )}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      )}

                      <div>
                        <label style={labelStyle}>Produtos *</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {novoPedidoItens.map((it, idx) => (
                            <div key={idx} style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                              <select value={it.nome} onChange={e => {
                                  const prod = produtos.find(p => p.nome === e.target.value);
                                  setNovoPedidoItens(prev => prev.map((x, i) => i === idx ? { ...x, nome: e.target.value, preco: prod ? String(prod.preco) : x.preco } : x));
                                }}
                                style={{ ...inputStyle, flex: 2, cursor: 'pointer' }}>
                                <option value="">Selecione o produto...</option>
                                {produtos.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                              </select>
                              <input type="number" min="0" step="0.01" value={it.preco} placeholder="Preço"
                                onChange={e => setNovoPedidoItens(prev => prev.map((x, i) => i === idx ? { ...x, preco: e.target.value } : x))}
                                style={{ ...inputStyle, flex: 1 }} />
                              <input type="number" min="1" value={it.quantidade} placeholder="Qtd"
                                onChange={e => setNovoPedidoItens(prev => prev.map((x, i) => i === idx ? { ...x, quantidade: e.target.value } : x))}
                                style={{ ...inputStyle, width: 60 }} />
                              {novoPedidoItens.length > 1 && (
                                <button type="button" onClick={() => setNovoPedidoItens(prev => prev.filter((_, i) => i !== idx))}
                                  style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
                              )}
                            </div>
                          ))}
                        </div>
                        <button type="button" onClick={() => setNovoPedidoItens(prev => [...prev, { nome: '', preco: '', quantidade: '1' }])}
                          style={{ marginTop: 8, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px dashed var(--border)', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                          + Adicionar outro produto
                        </button>
                      </div>

                      <div>
                        <label style={labelStyle}>Status</label>
                        <select value={novoPedidoStatus} onChange={e => setNovoPedidoStatus(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                          <option value="em_atendimento">Em Atendimento</option>
                          <option value="negociacao">Negociação</option>
                          <option value="pago">Pago (lança entrada no Financeiro na hora)</option>
                          <option value="cancelado">Cancelado</option>
                        </select>
                      </div>

                      <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                        <span style={{ color: 'var(--text-secondary, #374151)' }}>Total</span>
                        <span style={{ color: '#16a34a' }}>
                          R$ {novoPedidoItens.reduce((s, it) => s + (parseFloat(it.preco) || 0) * (parseInt(it.quantidade, 10) || 1), 0).toFixed(2)}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 10 }}>
                        <button type="button" onClick={fecharNovoPedido} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                          Cancelar
                        </button>
                        <button type="submit" disabled={salvandoPedido} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoPedido ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: salvandoPedido ? 0.6 : 1 }}>
                          {salvandoPedido ? 'Salvando...' : 'Criar Pedido'}
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
            );
          })()}

          {/* ======== ABA CONFIGURA!"ES ======== */}
          {aba === 'config' && (
            <div style={{ maxWidth: 700 }}>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 24, marginTop: 0 }}>Configurações da Plataforma</h2>
              <form onSubmit={salvarConfig} style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

                {/* Identidade Visual */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>Identidade Visual</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>Logotipo (URL ou upload)</label>
                      <div style={{ display: 'flex', gap: 8 }}>
                        <input value={config.logo || ''} onChange={e => setConfig(c => ({ ...c, logo: e.target.value }))}
                          placeholder="https://... ou use o botão para subir" style={{ ...inputStyle, flex: 1 }} />
                        <label style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', padding: '10px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 12, color: 'var(--text-secondary, #374151)', fontWeight: 600, whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                          Enviar
                          <input type="file" accept="image/*" style={{ display: 'none' }}
                            onChange={async e => {
                              const f = e.target.files?.[0]; if (!f) return;
                              const fd = new FormData(); fd.append('file', f);
                              setUploadando('logo');
                              const r = await fetch('/api/admin/upload', { method: 'POST', headers: { 'x-admin-key': getKey() }, body: fd });
                              setUploadando(null);
                              if (r.ok) { const d = await r.json(); setConfig(c => ({ ...c, logo: d.url })); }
                            }} />
                        </label>
                      </div>
                      {config.logo && (
                        <div style={{ marginTop: 10, padding: 12, background: 'var(--surface-hover)', borderRadius: 8, display: 'inline-block' }}>
                          <img src={config.logo} alt="Logo" style={{ maxHeight: 60, maxWidth: 200, objectFit: 'contain' }} />
                        </div>
                      )}
                    </div>

                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Cor Principal (botões, textos)</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={config.corPrimaria || '#111827'}
                            onChange={e => setConfig(c => ({ ...c, corPrimaria: e.target.value }))}
                            style={{ width: 44, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                          <input value={config.corPrimaria || '#111827'}
                            onChange={e => setConfig(c => ({ ...c, corPrimaria: e.target.value }))}
                            placeholder="#111827" style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
                        </div>
                        <div style={{ marginTop: 6, background: config.corPrimaria || '#111827', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                          Preview botão
                        </div>
                      </div>
                      <div>
                        <label style={labelStyle}>Cor de Destaque (verde/acento)</label>
                        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                          <input type="color" value={config.corAcento || '#16a34a'}
                            onChange={e => setConfig(c => ({ ...c, corAcento: e.target.value }))}
                            style={{ width: 44, height: 40, border: '1px solid var(--border)', borderRadius: 6, cursor: 'pointer', padding: 2 }} />
                          <input value={config.corAcento || '#16a34a'}
                            onChange={e => setConfig(c => ({ ...c, corAcento: e.target.value }))}
                            placeholder="#16a34a" style={{ ...inputStyle, flex: 1, fontFamily: 'monospace' }} />
                        </div>
                        <div style={{ marginTop: 6, background: config.corAcento || '#16a34a', color: '#fff', padding: '6px 14px', borderRadius: 6, fontSize: 12, fontWeight: 700, display: 'inline-block' }}>
                          Preview acento
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Integrações */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 28 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: 'var(--text)', marginBottom: 20, paddingBottom: 12, borderBottom: '1px solid var(--border)' }}>Integracoes</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div>
                      <label style={labelStyle}>Mercado Pago Access Token</label>
                      <input value={config.mercadopago_token} onChange={e => setConfig(c => ({ ...c, mercadopago_token: e.target.value }))}
                        placeholder="APP_USR-..." style={inputStyle} />
                      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 11, margin: '5px 0 0' }}>mercadopago.com.br &gt; Credenciais &gt; Access Token</p>
                    </div>
                    <div>
                      <label style={labelStyle}>Resend API Key</label>
                      <input value={config.resend_api_key} onChange={e => setConfig(c => ({ ...c, resend_api_key: e.target.value }))}
                        placeholder="re_..." style={inputStyle} />
                      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 11, margin: '5px 0 0' }}>resend.com &gt; API Keys</p>
                    </div>
                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 16 }}>
                      <div>
                        <label style={labelStyle}>Limite de E-mails por Dia</label>
                        <input type="number" min="0" value={config.limite_emails_dia ?? 100}
                          onChange={e => setConfig(c => ({ ...c, limite_emails_dia: parseInt(e.target.value) || 0 }))}
                          style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Limite de E-mails por Mês</label>
                        <input type="number" min="0" value={config.limite_emails_mes ?? 3000}
                          onChange={e => setConfig(c => ({ ...c, limite_emails_mes: parseInt(e.target.value) || 0 }))}
                          style={inputStyle} />
                      </div>
                    </div>
                    <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 11, margin: '-8px 0 0' }}>Plano gratuito do Resend: 100/dia, 3.000/mês. Ajuste aqui se fizer upgrade.</p>
                    <div>
                      <label style={labelStyle}>WhatsApp Numero de Contato</label>
                      <input value={config.whatsapp_numero} onChange={e => setConfig(c => ({ ...c, whatsapp_numero: e.target.value }))}
                        placeholder="5511999999999" style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>xR URL Base do Site</label>
                      <input value={config.base_url} onChange={e => setConfig(c => ({ ...c, base_url: e.target.value }))}
                        placeholder="https://seusite.vercel.app" style={inputStyle} />
                      <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 11, margin: '5px 0 0' }}>Usado nos links de aprovação enviados por e-mail</p>
                    </div>
                  </div>
                </div>

                {loadingConfig ? (
                  <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>Carregando...</div>
                ) : (
                  <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '14px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 15, fontFamily: 'inherit' }}>
                    Salvar Configuracoes
                  </button>
                )}
              </form>

              <div style={{ marginTop: 20, background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-secondary, #374151)', marginBottom: 10 }}>Sobre as Configuracoes</div>
                <ul style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, lineHeight: 1.8, margin: 0, paddingLeft: 16 }}>
                  <li>Configurações ficam na memória enquanto o servidor estiver rodando</li>
                  <li>Para configuração permanente, adicione ao arquivo <code style={{ color: '#16a34a' }}>.env.local</code></li>
                  <li>Mercado Pago: sem token, pagamento vai pelo WhatsApp</li>
                  <li>Resend: sem API key, aprovação não envia e-mail</li>
                </ul>
              </div>
            </div>
          )}

          {/* ======== ABA LOG (so superadmin) ======== */}
          {aba === 'logs' && isSuperadmin && (
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>
                Log de Atividade <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({logs.length})</span>
              </h2>
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 20 }}>
                Tudo que os usuários admin alteram no sistema. Visível apenas para o superadmin.
              </p>
              {loadingLogs ? (
                <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
              ) : logs.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                  Nenhuma atividade registrada ainda.
                </div>
              ) : (
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="admin-table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {['Quando', 'Quem', 'Ação', 'Detalhe'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {logs.map((l, idx) => (
                        <tr key={l.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                          <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                            {new Date(l.created_at).toLocaleString('pt-BR')}
                          </td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text-secondary, #374151)' }}>{l.ator}</td>
                          <td style={{ padding: '11px 14px', color: 'var(--text)' }}>{l.acao}</td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{l.detalhe || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ======== ABA MENTORIA ======== */}
          {aba === 'mentoria' && (() => {
            const porMedico = new Map<string, number>();
            mentoriaCliques.forEach(c => porMedico.set(c.medico_nome, (porMedico.get(c.medico_nome) || 0) + 1));
            const medicosUnicos = porMedico.size;
            return (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0 }}>
                  Mentoria <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({mentoriaCliques.length})</span>
                </h2>

                <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{mentoriaCliques.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Cliques totais</div>
                  </div>
                  <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{medicosUnicos}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Médicos</div>
                  </div>
                </div>

                {loadingMentoria ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : mentoriaCliques.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    Ninguém clicou no card Mentoria ainda.
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="admin-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {['Médico', 'WhatsApp', 'E-mail', 'Quando', 'Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {mentoriaCliques.map((c, idx) => {
                          const medico = cadastros.find(cad => cad.id === c.medico_id);
                          return (
                          <tr key={c.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{c.medico_nome}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)' }}>{medico?.whatsapp || '—'}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)' }}>{medico?.email || '—'}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {new Date(c.created_at).toLocaleString('pt-BR')}
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              {isSuperadmin && (
                                <button onClick={() => excluirCliqueMentoria(c.id, c.medico_nome)}
                                  style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                  Excluir
                                </button>
                              )}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======== ABA MONITORAMENTO DE CARRINHO ======== */}
          {aba === 'carrinho' && (() => {
            const normalizar = (s: string) => s.trim().toLowerCase();
            const porMedico = new Map<string, { medico_id: string; medico_nome: string; produtos: Map<string, number>; ultima: string }>();
            carrinhoEventos.forEach(e => {
              const cur = porMedico.get(e.medico_id) || { medico_id: e.medico_id, medico_nome: e.medico_nome, produtos: new Map<string, number>(), ultima: e.created_at };
              cur.produtos.set(e.produto_nome, (cur.produtos.get(e.produto_nome) || 0) + 1);
              if (e.created_at > cur.ultima) cur.ultima = e.created_at;
              porMedico.set(e.medico_id, cur);
            });
            const pedidosPorNome = new Set(pedidos.map(p => normalizar(p.cadastro_nome)));
            const lista = [...porMedico.values()].sort((a, b) => (a.ultima < b.ultima ? 1 : -1));
            const semPedido = lista.filter(m => !pedidosPorNome.has(normalizar(m.medico_nome)));

            return (
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 20, marginTop: 0 }}>
                  Monitoramento de Carrinho <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({lista.length})</span>
                </h2>

                <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: 24 }}>
                  <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{carrinhoEventos.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Adições ao carrinho</div>
                  </div>
                  <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text)' }}>{lista.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Médicos que adicionaram</div>
                  </div>
                  <div style={{ background: '#3741510d', border: '1px solid #37415133', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #374151' }}>
                    <div style={{ fontSize: 32, fontWeight: 900, color: 'var(--text-secondary, #374151)' }}>{semPedido.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Carrinho sem pedido enviado</div>
                  </div>
                </div>

                {loadingCarrinho ? (
                  <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : lista.length === 0 ? (
                  <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                    Ninguém adicionou produtos ao carrinho ainda.
                  </div>
                ) : (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="admin-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {['Médico', 'Produtos no carrinho', 'Última atividade', 'Status', 'Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {lista.map((m, idx) => {
                          const comprou = pedidosPorNome.has(normalizar(m.medico_nome));
                          const cadastro = cadastros.find(c => c.id === m.medico_id);
                          return (
                            <tr key={m.medico_id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{m.medico_nome}</td>
                              <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', maxWidth: 260, fontSize: 12 }}>
                                {[...m.produtos.entries()].map(([nome, qtd]) => `${nome}${qtd > 1 ? ` x${qtd}` : ''}`).join(', ')}
                              </td>
                              <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                                {new Date(m.ultima).toLocaleString('pt-BR')}
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                <span style={{
                                  background: comprou ? '#f0fdf4' : 'var(--surface-hover)', color: comprou ? '#15803d' : 'var(--text-secondary, #374151)',
                                  border: `1px solid ${comprou ? '#86efac' : 'var(--border)'}`, padding: '4px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                                }}>
                                  {comprou ? 'Comprou' : 'Não enviou pedido'}
                                </span>
                              </td>
                              <td style={{ padding: '11px 14px' }}>
                                {cadastro?.whatsapp && (
                                  <a href={`https://wa.me/55${cadastro.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                                    style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 11px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
                                    WhatsApp
                                  </a>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======== ABA LINK DE RASTREIO ======== */}
          {aba === 'rastreio' && (() => {
            const q = buscaRastreio.trim().toLowerCase();
            const medicosEncontrados = q.length < 2 ? [] : cadastros
              .filter(c => `${c.nome} ${c.sobrenome}`.toLowerCase().includes(q))
              .slice(0, 8)
              .map(c => ({ id: c.id, nome: `${c.nome} ${c.sobrenome || ''}`.trim(), whatsapp: c.whatsapp, tipo: 'medico' as const }));
            const pacientesEncontrados = q.length < 2 ? [] : indicacoes
              .filter(i => i.tipo !== 'medico' && `${i.nome} ${i.sobrenome}`.toLowerCase().includes(q))
              .slice(0, 8)
              .map(i => ({ id: i.id, nome: `${i.nome} ${i.sobrenome || ''}`.trim(), whatsapp: i.whatsapp, tipo: 'paciente' as const }));
            const resultados = [...medicosEncontrados, ...pacientesEncontrados];

            const primeiroNome = rastreioSelecionado?.nome.split(' ')[0] || '';
            const mensagem = `Olá, ${primeiroNome}! 👋\n\nSeu pedido da *PeptideZ Health* já está a caminho! 📦\n\n🔗 Acompanhe a entrega em tempo real:\n${linkRastreio}\n\nQualquer dúvida, estamos à disposição!`;
            const numeroWhats = rastreioSelecionado
              ? `55${(rastreioSelecionado.whatsapp || '').replace(/\D/g, '')}`
              : '';

            return (
              <div style={{ maxWidth: 720 }}>
                <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>Link de Rastreio</h2>
                <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 20 }}>
                  Encontre o médico ou paciente, cole o link de rastreio do pedido e envie pelo WhatsApp.
                </p>

                {!rastreioSelecionado ? (
                  <>
                    <input value={buscaRastreio} onChange={e => setBuscaRastreio(e.target.value)}
                      placeholder="Buscar médico ou paciente por nome..." autoFocus
                      style={{ ...inputStyle, marginBottom: 16 }} />

                    {q.length < 2 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-soft, #9ca3af)', fontSize: 13, background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                        Digite ao menos 2 letras do nome para buscar.
                      </div>
                    ) : resultados.length === 0 ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-soft, #9ca3af)', fontSize: 13, background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                        Nenhum médico ou paciente encontrado para &quot;{buscaRastreio}&quot;.
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {resultados.map(r => (
                          <button key={`${r.tipo}-${r.id}`} onClick={() => { setRastreioSelecionado(r); setLinkRastreio(''); }}
                            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                            <div>
                              <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{r.nome}</div>
                              <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{r.whatsapp || 'sem WhatsApp cadastrado'}</div>
                            </div>
                            <span style={{
                              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                              background: r.tipo === 'medico' ? 'var(--surface-hover)' : '#f0fdf4', color: r.tipo === 'medico' ? 'var(--text-secondary, #374151)' : '#15803d',
                            }}>
                              {r.tipo === 'medico' ? 'Médico' : 'Paciente'}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px' }}>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 14 }}>{rastreioSelecionado.nome}</div>
                        <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{rastreioSelecionado.whatsapp || 'sem WhatsApp cadastrado'} · {rastreioSelecionado.tipo === 'medico' ? 'Médico' : 'Paciente'}</div>
                      </div>
                      <button onClick={() => { setRastreioSelecionado(null); setBuscaRastreio(''); setLinkRastreio(''); }}
                        style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                        Trocar
                      </button>
                    </div>

                    <div>
                      <label style={labelStyle}>Link de rastreio *</label>
                      <input value={linkRastreio} onChange={e => setLinkRastreio(e.target.value)}
                        placeholder="https://..." style={inputStyle} />
                    </div>

                    {/* Cartao / arte de pre-visualizacao */}
                    <div style={{
                      background: 'linear-gradient(160deg, #0f172a, #111827)', borderRadius: 20, padding: '32px 28px',
                      textAlign: 'center', boxShadow: '0 12px 32px rgba(15,23,42,0.25)',
                    }}>
                      <div style={{ color: '#fff', fontSize: 15, fontWeight: 900, letterSpacing: 1.5, marginBottom: 20, textTransform: 'uppercase' }}>
                        <span style={{ color: '#4ade80' }}>Peptide</span>Z Health
                      </div>
                      <div style={{ fontSize: 22, marginBottom: 6 }}>📦</div>
                      <div style={{ color: '#fff', fontSize: 16, fontWeight: 800, marginBottom: 6 }}>
                        Olá, {primeiroNome || '...'}!
                      </div>
                      <div style={{ color: '#cbd5e1', fontSize: 13, marginBottom: 22, lineHeight: 1.5 }}>
                        Seu pedido da PeptideZ Health já está a caminho.<br />Acompanhe a entrega em tempo real:
                      </div>
                      <div style={{
                        display: 'inline-block', maxWidth: '100%', background: 'rgba(22,163,74,0.12)', border: '1px solid #16a34a55',
                        borderRadius: 12, padding: '12px 20px', color: '#4ade80', fontSize: 13, fontWeight: 700,
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        🔗 {linkRastreio || 'seu-link-de-rastreio-aparece-aqui.com'}
                      </div>
                      <div style={{ color: '#64748b', fontSize: 11, marginTop: 22 }}>PeptideZ Health · Otimização Bioativa</div>
                    </div>

                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <button onClick={() => baixarArteRastreio(rastreioSelecionado.nome.toLowerCase().replace(/\s+/g, '-'), rastreioSelecionado.nome, linkRastreio)}
                        disabled={!linkRastreio.trim() || baixandoArteRastreio}
                        style={{
                          background: linkRastreio.trim() ? '#16a34a' : 'var(--border)', color: linkRastreio.trim() ? '#fff' : 'var(--text-soft, #9ca3af)',
                          border: 'none', padding: '11px 22px', borderRadius: 8, cursor: linkRastreio.trim() && !baixandoArteRastreio ? 'pointer' : 'not-allowed',
                          fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8,
                        }}>
                        {baixandoArteRastreio ? 'Gerando...' : '⬇ Baixar Imagem'}
                      </button>
                      <button onClick={() => { navigator.clipboard.writeText(mensagem); showMsg('OK: Mensagem copiada!'); }}
                        disabled={!linkRastreio.trim()}
                        style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '11px 18px', borderRadius: 8, cursor: linkRastreio.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: linkRastreio.trim() ? 1 : 0.5 }}>
                        Copiar mensagem
                      </button>
                      <a href={linkRastreio.trim() && numeroWhats ? `https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}` : undefined}
                        target="_blank" rel="noreferrer"
                        onClick={e => { if (!linkRastreio.trim() || !numeroWhats) e.preventDefault(); }}
                        style={{
                          background: 'var(--surface)', color: linkRastreio.trim() && numeroWhats ? '#16a34a' : 'var(--text-soft, #9ca3af)',
                          border: `1px solid ${linkRastreio.trim() && numeroWhats ? '#86efac' : 'var(--border)'}`, padding: '11px 18px', borderRadius: 8, cursor: linkRastreio.trim() && numeroWhats ? 'pointer' : 'not-allowed',
                          fontSize: 13, fontWeight: 700, fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                        }}>
                        Abrir WhatsApp →
                      </a>
                    </div>
                    <div style={{ color: 'var(--text-soft, #9ca3af)', fontSize: 11, marginTop: -6 }}>
                      O WhatsApp não deixa anexar imagem automaticamente por link: baixe a imagem primeiro e anexe ela na conversa.
                    </div>
                    {!numeroWhats && (
                      <div style={{ color: '#dc2626', fontSize: 12 }}>Esse contato não tem WhatsApp cadastrado.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {/* ======== ABA DESPESAS ======== */}
          {aba === 'despesas' && (() => {
            const totalEntradas = despesas.filter(d => d.tipo === 'entrada').reduce((s, d) => s + d.valor, 0);
            const totalSaidas = despesas.filter(d => d.tipo === 'saida').reduce((s, d) => s + d.valor, 0);
            const saldo = totalEntradas - totalSaidas;

            const porCategoria = (tipo: 'entrada' | 'saida') => {
              const m = new Map<string, number>();
              despesas.filter(d => d.tipo === tipo).forEach(d => m.set(d.categoria, (m.get(d.categoria) || 0) + d.valor));
              return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([categoria, valor]) => ({ key: categoria, label: categoria, value: Math.round(valor * 100) / 100 }));
            };

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>
                    Financeiro <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 14, fontWeight: 400 }}>({despesas.length})</span>
                  </h2>
                  <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, margin: 0 }}>
                    Controle de entradas e saídas — categorias, lançamentos e relatórios.
                  </p>
                </div>

                {/* KPIs */}
                <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                  <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {totalEntradas.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total Entradas</div>
                  </div>
                  <div style={{ background: '#dc26260d', border: '1px solid #dc262633', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #dc2626' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626' }}>R$ {totalSaidas.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total Saídas</div>
                  </div>
                  <div style={{ background: saldo >= 0 ? 'var(--surface-hover)' : '#dc26260d', border: `1px solid ${saldo >= 0 ? 'var(--border)' : '#dc262633'}`, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${saldo >= 0 ? 'var(--text-soft, #9ca3af)' : '#dc2626'}` }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: saldo >= 0 ? 'var(--text)' : '#dc2626' }}>R$ {saldo.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Saldo</div>
                  </div>
                </div>

                {/* Relatorio por categoria */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Entradas por Categoria</div>
                    <HBarChart color="#16a34a" emptyLabel="Sem entradas ainda." items={porCategoria('entrada')} />
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Saídas por Categoria</div>
                    <HBarChart color="#dc2626" emptyLabel="Sem saídas ainda." items={porCategoria('saida')} />
                  </div>
                </div>

                <div className="admin-split-340" style={{ display: 'grid', gap: 24, alignItems: 'start' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                    {/* Lista de lancamentos */}
                    {loadingDespesas ? (
                      <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                    ) : despesas.length === 0 ? (
                      <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                        Nenhum lançamento ainda.
                      </div>
                    ) : (
                      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                        <div className="admin-table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                              {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Comprovante', 'Ações'].map(h => (
                                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {despesas.map((d, idx) => (
                              <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                                  {new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}
                                </td>
                                <td style={{ padding: '11px 14px' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: d.tipo === 'entrada' ? '#dcfce7' : '#fee2e2', color: d.tipo === 'entrada' ? '#15803d' : '#dc2626' }}>
                                    {d.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                  </span>
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap' }}>{d.categoria}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{d.descricao}</td>
                                <td style={{ padding: '11px 14px', fontWeight: 700, color: d.tipo === 'entrada' ? '#16a34a' : '#dc2626', whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>
                                  R$ {d.valor.toFixed(2)}
                                </td>
                                <td style={{ padding: '11px 14px' }}>
                                  {d.comprovante_url ? (
                                    <a href={d.comprovante_url} target="_blank" rel="noreferrer"
                                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, fontSize: 12, fontFamily: 'inherit', textDecoration: 'none' }}>
                                      Ver
                                    </a>
                                  ) : (
                                    <span style={{ color: 'var(--text-soft, #9ca3af)', fontSize: 12 }}>-</span>
                                  )}
                                </td>
                                <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                                  <div style={{ display: 'flex', gap: 6 }}>
                                    <button onClick={() => setEditandoDespesa(d)}
                                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                      Editar
                                    </button>
                                    <button onClick={() => excluirDespesa(d.id, d.descricao)}
                                      style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 12 }}>
                                      Excluir
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {/* Categorias */}
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <button type="button" onClick={() => setMostrarCatsFinanceiras(v => !v)}
                        style={{ width: '100%', background: 'none', border: 'none', padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer', fontFamily: 'inherit' }}>
                        <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Categorias ({categoriasFinanceiras.length})</span>
                        <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13 }}>{mostrarCatsFinanceiras ? '▲' : '▼'}</span>
                      </button>
                      {mostrarCatsFinanceiras && (
                        <div style={{ padding: '0 16px 16px', borderTop: '1px solid var(--border)' }}>
                          <div style={{ paddingTop: 12, marginBottom: 10 }}>
                            {categoriasFinanceiras.length === 0 && <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', fontStyle: 'italic' }}>Nenhuma ainda.</div>}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                              {categoriasFinanceiras.map(c => (
                                <span key={c} style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', color: 'var(--text-secondary, #374151)', padding: '3px 10px', borderRadius: 12, fontSize: 11, display: 'flex', alignItems: 'center', gap: 5 }}>
                                  {c}
                                  <button type="button" onClick={() => deletarCategoriaFinanceira(c)} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 13, lineHeight: 1, padding: 0 }}>-</button>
                                </span>
                              ))}
                            </div>
                          </div>
                          <form onSubmit={adicionarCategoriaFinanceira} style={{ display: 'flex', gap: 6 }}>
                            <input value={novaCategoriaFinanceira} onChange={e => setNovaCategoriaFinanceira(e.target.value)} placeholder="Nova categoria..." style={{ ...inputStyle, flex: 1, padding: '8px 12px', fontSize: 12 }} />
                            <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', borderRadius: 7, padding: '8px 14px', cursor: 'pointer', fontWeight: 700, fontSize: 12, fontFamily: 'inherit', whiteSpace: 'nowrap' }}>+ Add</button>
                          </form>
                        </div>
                      )}
                    </div>

                    {/* Novo / editar lancamento */}
                    <div style={{ background: 'var(--surface)', border: editandoDespesa ? '1px solid var(--border)' : '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                        <h3 style={{ fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: 0 }}>{editandoDespesa ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
                        {editandoDespesa && <button onClick={() => setEditandoDespesa(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20 }}>-</button>}
                      </div>
                      <form onSubmit={salvarDespesa} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {(['entrada', 'saida'] as const).map(t => {
                            const atual = editandoDespesa ? editandoDespesa.tipo : novaDespesa.tipo;
                            const cor = t === 'entrada' ? '#16a34a' : '#dc2626';
                            return (
                              <button key={t} type="button"
                                onClick={() => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, tipo: t })) : setNovaDespesa(v => ({ ...v, tipo: t }))}
                                style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: `1px solid ${atual === t ? cor : 'var(--border)'}`, background: atual === t ? `${cor}14` : 'var(--surface)', color: atual === t ? cor : 'var(--text-secondary, #374151)', fontWeight: 700, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
                                {t === 'entrada' ? 'Entrada' : 'Saída'}
                              </button>
                            );
                          })}
                        </div>
                        <div>
                          <label style={labelStyle}>Categoria *</label>
                          <select value={editandoDespesa ? editandoDespesa.categoria : novaDespesa.categoria}
                            onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, categoria: e.target.value })) : setNovaDespesa(v => ({ ...v, categoria: e.target.value }))}
                            required style={{ ...inputStyle, cursor: 'pointer' }}>
                            <option value="">Selecione...</option>
                            {categoriasFinanceiras.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                        </div>
                        <div>
                          <label style={labelStyle}>Descrição *</label>
                          <input value={editandoDespesa ? editandoDespesa.descricao : novaDespesa.descricao}
                            onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, descricao: e.target.value })) : setNovaDespesa(v => ({ ...v, descricao: e.target.value }))}
                            required placeholder="Ex: Comissão vendedor, Almoço com cliente..." style={inputStyle} />
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                          <div>
                            <label style={labelStyle}>Valor (R$) *</label>
                            <input type="number" min="0" step="0.01"
                              value={editandoDespesa ? editandoDespesa.valor : novaDespesa.valor}
                              onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, valor: parseFloat(e.target.value) || 0 })) : setNovaDespesa(v => ({ ...v, valor: e.target.value }))}
                              required placeholder="0.00" style={inputStyle} />
                          </div>
                          <div>
                            <label style={labelStyle}>Data *</label>
                            <input type="date" value={editandoDespesa ? editandoDespesa.data : novaDespesa.data}
                              onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, data: e.target.value })) : setNovaDespesa(v => ({ ...v, data: e.target.value }))}
                              required style={inputStyle} />
                          </div>
                        </div>
                        <div>
                          <label style={labelStyle}>Comprovante <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(nota fiscal, recibo — imagem ou PDF)</span></label>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                            {(editandoDespesa ? editandoDespesa.comprovante_url : novaDespesa.comprovante_url) && (
                              <a href={editandoDespesa ? editandoDespesa.comprovante_url : novaDespesa.comprovante_url} target="_blank" rel="noreferrer"
                                style={{ fontSize: 12, color: 'var(--text-secondary, #374151)', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', textDecoration: 'none', fontWeight: 600 }}>
                                Ver comprovante atual
                              </a>
                            )}
                            <label style={{ background: uploadando === 'comprovante' ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', gap: 4 }}>
                              {uploadando === 'comprovante' ? '...' : 'Enviar comprovante'}
                              <input type="file" accept="image/*,application/pdf" style={{ display: 'none' }} onChange={async e => {
                                const f = e.target.files?.[0]; if (!f) return;
                                await uploadImagem('comprovante', f, url => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, comprovante_url: url })) : setNovaDespesa(v => ({ ...v, comprovante_url: url })));
                                e.target.value = '';
                              }} />
                            </label>
                          </div>
                        </div>
                        <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                          {editandoDespesa ? 'Salvar Alterações' : 'Registrar Lançamento'}
                        </button>
                      </form>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* ======== ABA RELATÓRIOS ======== */}
          {aba === 'relatorios' && (() => {
            const medicosOrdenados = [...cadastros].sort((a, b) => a.nome.localeCompare(b.nome));
            const despesaPorId = new Map(despesas.map(d => [d.id, d]));

            const pedidosPeriodo = pedidos.filter(p =>
              p.status === 'pago' &&
              dentroPeriodo(p.created_at, relFiltroInicio, relFiltroFim) &&
              (!relFiltroMedico || p.cadastro_id === relFiltroMedico)
            );

            const comissoesPeriodo = indicacoes
              .filter(i => i.comissao_paga && (!relFiltroMedico || i.medico_id === relFiltroMedico))
              .map(i => {
                const desp = i.comissao_despesa_id ? despesaPorId.get(i.comissao_despesa_id) : undefined;
                return { ...i, _data: desp?.data || i.created_at.slice(0, 10) };
              })
              .filter(i => dentroPeriodo(i._data, relFiltroInicio, relFiltroFim))
              .sort((a, b) => b._data.localeCompare(a._data));

            const despesasPeriodo = despesas
              .filter(d => dentroPeriodo(d.data, relFiltroInicio, relFiltroFim) && (relFiltroTipoFin === 'todos' || d.tipo === relFiltroTipoFin))
              .sort((a, b) => b.data.localeCompare(a.data));

            const totalFaturamento = pedidosPeriodo.reduce((s, p) => s + p.preco, 0);
            const ticketMedio = pedidosPeriodo.length ? totalFaturamento / pedidosPeriodo.length : 0;
            const totalComissoes = comissoesPeriodo.reduce((s, i) => s + (i.comissao_valor || 0), 0);
            const totalEntradasFin = despesasPeriodo.filter(d => d.tipo === 'entrada').reduce((s, d) => s + d.valor, 0);
            const totalSaidasFin = despesasPeriodo.filter(d => d.tipo === 'saida').reduce((s, d) => s + d.valor, 0);

            const agrupadoFaturamento = (() => {
              const m = new Map<string, { qtd: number; total: number }>();
              pedidosPeriodo.forEach(p => {
                const key = relAgrupamento === 'dia' ? p.created_at.slice(0, 10) : p.created_at.slice(0, 7);
                const cur = m.get(key) || { qtd: 0, total: 0 };
                cur.qtd += 1; cur.total += p.preco;
                m.set(key, cur);
              });
              return [...m.entries()].sort((a, b) => b[0].localeCompare(a[0]));
            })();

            const agrupadoPorMedico = (() => {
              const m = new Map<string, { nome: string; qtdProprio: number; totalProprio: number; qtdIndicado: number; totalIndicado: number }>();
              pedidosPeriodo.forEach(p => {
                const cur = m.get(p.cadastro_id) || { nome: p.cadastro_nome, qtdProprio: 0, totalProprio: 0, qtdIndicado: 0, totalIndicado: 0 };
                if (p.indicacao_id) { cur.qtdIndicado += 1; cur.totalIndicado += p.preco; }
                else { cur.qtdProprio += 1; cur.totalProprio += p.preco; }
                m.set(p.cadastro_id, cur);
              });
              const comissaoPorMedico = new Map<string, number>();
              comissoesPeriodo.forEach(i => comissaoPorMedico.set(i.medico_id, (comissaoPorMedico.get(i.medico_id) || 0) + (i.comissao_valor || 0)));
              return [...m.entries()]
                .map(([id, v]) => ({ id, ...v, total: v.totalProprio + v.totalIndicado, comissao: comissaoPorMedico.get(id) || 0 }))
                .sort((a, b) => b.total - a.total);
            })();

            const formatData = (d: string) => new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString('pt-BR');
            const formatPeriodoKey = (key: string) => relAgrupamento === 'dia'
              ? formatData(key)
              : new Date(key + '-01T00:00:00').toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });

            const limparFiltros = () => { setRelFiltroInicio(''); setRelFiltroFim(''); setRelFiltroMedico(''); setRelFiltroTipoFin('todos'); };

            const pills: { key: typeof relatorioTipo; label: string }[] = [
              { key: 'faturamento', label: 'Faturamento' },
              { key: 'medicos', label: 'Por Médico' },
              { key: 'comissoes', label: 'Comissões Atribuídas' },
              { key: 'financeiro', label: 'Entradas e Saídas' },
            ];

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <style>{`
                  @media print {
                    .admin-sidebar, header, .no-print { display: none !important; }
                    .admin-main { padding: 0 !important; overflow: visible !important; }
                    body { background: #fff !important; }
                  }
                `}</style>

                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>Relatórios</h2>
                  <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, margin: 0 }}>
                    Faturamento, comissões e financeiro — filtre por período e médico, imprima ou baixe em CSV.
                  </p>
                </div>

                {/* Seletor de relatório */}
                <div className="no-print" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {pills.map(p => (
                    <button key={p.key} onClick={() => setRelatorioTipo(p.key)}
                      style={{
                        background: relatorioTipo === p.key ? 'var(--btn-primary-bg)' : 'var(--surface)', color: relatorioTipo === p.key ? 'var(--btn-primary-text)' : 'var(--text-secondary, #374151)',
                        border: '1px solid ' + (relatorioTipo === p.key ? 'var(--btn-primary-bg)' : 'var(--border)'), padding: '8px 16px', borderRadius: 20,
                        fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
                      }}>
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Filtros */}
                <div className="no-print" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>DE</div>
                    <input type="date" value={relFiltroInicio} onChange={e => setRelFiltroInicio(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', colorScheme: tema }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>ATÉ</div>
                    <input type="date" value={relFiltroFim} onChange={e => setRelFiltroFim(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', colorScheme: tema }} />
                  </div>
                  {(relatorioTipo === 'faturamento' || relatorioTipo === 'medicos' || relatorioTipo === 'comissoes') && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>MÉDICO</div>
                      <select value={relFiltroMedico} onChange={e => setRelFiltroMedico(e.target.value)}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', maxWidth: 220, background: 'var(--surface)', color: 'var(--text)', colorScheme: tema }}>
                        <option value="">Todos os médicos</option>
                        {medicosOrdenados.map(c => <option key={c.id} value={c.id}>{c.nome} {c.sobrenome}</option>)}
                      </select>
                    </div>
                  )}
                  {relatorioTipo === 'faturamento' && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>AGRUPAR POR</div>
                      <select value={relAgrupamento} onChange={e => setRelAgrupamento(e.target.value as 'dia' | 'mes')}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', colorScheme: tema }}>
                        <option value="dia">Dia</option>
                        <option value="mes">Mês</option>
                      </select>
                    </div>
                  )}
                  {relatorioTipo === 'financeiro' && (
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>TIPO</div>
                      <select value={relFiltroTipoFin} onChange={e => setRelFiltroTipoFin(e.target.value as 'todos' | 'entrada' | 'saida')}
                        style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)', colorScheme: tema }}>
                        <option value="todos">Todos</option>
                        <option value="entrada">Entrada</option>
                        <option value="saida">Saída</option>
                      </select>
                    </div>
                  )}
                  <button onClick={limparFiltros}
                    style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                    Limpar filtros
                  </button>
                  <div style={{ flex: 1 }} />
                  <button onClick={() => window.print()}
                    style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 600, fontFamily: 'inherit' }}>
                    Imprimir
                  </button>
                  <button onClick={() => {
                    if (relatorioTipo === 'faturamento') {
                      baixarCSV('faturamento.csv', ['Período', 'Nº Pedidos', 'Faturamento'],
                        agrupadoFaturamento.map(([k, v]) => [formatPeriodoKey(k), v.qtd, v.total.toFixed(2)]));
                    } else if (relatorioTipo === 'medicos') {
                      baixarCSV('faturamento-por-medico.csv', ['Médico', 'Pedidos Próprios', 'Faturamento Próprio', 'Pedidos de Indicados', 'Faturamento de Indicados', 'Comissões Pagas'],
                        agrupadoPorMedico.map(m => [m.nome, m.qtdProprio, m.totalProprio.toFixed(2), m.qtdIndicado, m.totalIndicado.toFixed(2), m.comissao.toFixed(2)]));
                    } else if (relatorioTipo === 'comissoes') {
                      baixarCSV('comissoes-atribuidas.csv', ['Data', 'Médico Indicador', 'Indicado', 'Tipo', 'Valor'],
                        comissoesPeriodo.map(i => [formatData(i._data), i.medico_nome, `${i.nome} ${i.sobrenome || ''}`.trim(), i.tipo === 'medico' ? 'Médico Indicado' : 'Paciente', (i.comissao_valor || 0).toFixed(2)]));
                    } else {
                      baixarCSV('entradas-e-saidas.csv', ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'],
                        despesasPeriodo.map(d => [formatData(d.data), d.tipo === 'entrada' ? 'Entrada' : 'Saída', d.categoria, d.descricao, d.valor.toFixed(2)]));
                    }
                  }} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                    Baixar CSV
                  </button>
                </div>

                {/* ===== Faturamento ===== */}
                {relatorioTipo === 'faturamento' && (
                  <>
                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                      <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {totalFaturamento.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Faturamento Total</div>
                      </div>
                      <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{pedidosPeriodo.length}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Pedidos Pagos</div>
                      </div>
                      <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>R$ {ticketMedio.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Ticket Médio</div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div className="admin-table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                              {['Período', 'Nº Pedidos', 'Faturamento'].map(h => (
                                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {agrupadoFaturamento.length === 0 ? (
                              <tr><td colSpan={3} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum pedido pago no período.</td></tr>
                            ) : agrupadoFaturamento.map(([k, v], idx) => (
                              <tr key={k} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                                <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', textTransform: 'capitalize' }}>{formatPeriodoKey(k)}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{v.qtd}</td>
                                <td style={{ padding: '11px 14px', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>R$ {v.total.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ===== Por Médico ===== */}
                {relatorioTipo === 'medicos' && (
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                    <div className="admin-table-scroll">
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                            {['Médico', 'Pedidos Próprios', 'Faturamento Próprio', 'Pedidos de Indicados', 'Faturamento de Indicados', 'Comissões Pagas'].map(h => (
                              <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {agrupadoPorMedico.length === 0 ? (
                            <tr><td colSpan={6} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum pedido pago no período.</td></tr>
                          ) : agrupadoPorMedico.map((m, idx) => (
                            <tr key={m.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                              <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 600 }}>{m.nome}</td>
                              <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{m.qtdProprio || '-'}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: m.totalProprio > 0 ? '#16a34a' : 'var(--text-soft, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>{m.totalProprio > 0 ? `R$ ${m.totalProprio.toFixed(2)}` : '-'}</td>
                              <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{m.qtdIndicado || '-'}</td>
                              <td style={{ padding: '11px 14px', fontWeight: 700, color: m.totalIndicado > 0 ? '#16a34a' : 'var(--text-soft, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>{m.totalIndicado > 0 ? `R$ ${m.totalIndicado.toFixed(2)}` : '-'}</td>
                              <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', fontVariantNumeric: 'tabular-nums' }}>{m.comissao > 0 ? `R$ ${m.comissao.toFixed(2)}` : '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {/* ===== Comissões Atribuídas ===== */}
                {relatorioTipo === 'comissoes' && (
                  <>
                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                      <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {totalComissoes.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total em Comissões</div>
                      </div>
                      <div style={{ background: '#1118270d', border: '1px solid #11182733', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #111827' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{comissoesPeriodo.length}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Comissões Lançadas</div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div className="admin-table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                              {['Data', 'Médico Indicador', 'Indicado', 'Tipo', 'Valor'].map(h => (
                                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {comissoesPeriodo.length === 0 ? (
                              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhuma comissão lançada no período.</td></tr>
                            ) : comissoesPeriodo.map((i, idx) => (
                              <tr key={i.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap' }}>{formatData(i._data)}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 600 }}>{i.medico_nome}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)' }}>{i.nome} {i.sobrenome || ''}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: i.tipo === 'medico' ? '#f0fdf4' : 'var(--surface-hover)', color: i.tipo === 'medico' ? '#16a34a' : 'var(--text-secondary, #374151)' }}>
                                    {i.tipo === 'medico' ? 'Médico Indicado' : 'Paciente'}
                                  </span>
                                </td>
                                <td style={{ padding: '11px 14px', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>R$ {(i.comissao_valor || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}

                {/* ===== Entradas e Saídas ===== */}
                {relatorioTipo === 'financeiro' && (
                  <>
                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                      <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {totalEntradasFin.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total Entradas</div>
                      </div>
                      <div style={{ background: '#dc26260d', border: '1px solid #dc262633', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #dc2626' }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626' }}>R$ {totalSaidasFin.toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total Saídas</div>
                      </div>
                      <div style={{ background: totalEntradasFin - totalSaidasFin >= 0 ? 'var(--surface-hover)' : '#dc26260d', border: `1px solid ${totalEntradasFin - totalSaidasFin >= 0 ? 'var(--border)' : '#dc262633'}`, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${totalEntradasFin - totalSaidasFin >= 0 ? 'var(--text-soft, #9ca3af)' : '#dc2626'}` }}>
                        <div style={{ fontSize: 26, fontWeight: 800, color: totalEntradasFin - totalSaidasFin >= 0 ? 'var(--text)' : '#dc2626' }}>R$ {(totalEntradasFin - totalSaidasFin).toFixed(2)}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Saldo</div>
                      </div>
                    </div>
                    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                      <div className="admin-table-scroll">
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                          <thead>
                            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                              {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'].map(h => (
                                <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {despesasPeriodo.length === 0 ? (
                              <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum lançamento no período.</td></tr>
                            ) : despesasPeriodo.map((d, idx) => (
                              <tr key={d.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap' }}>{formatData(d.data)}</td>
                                <td style={{ padding: '11px 14px' }}>
                                  <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: d.tipo === 'entrada' ? '#dcfce7' : '#fee2e2', color: d.tipo === 'entrada' ? '#15803d' : '#dc2626' }}>
                                    {d.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                                  </span>
                                </td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap' }}>{d.categoria}</td>
                                <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{d.descricao}</td>
                                <td style={{ padding: '11px 14px', fontWeight: 700, color: d.tipo === 'entrada' ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>R$ {d.valor.toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            );
          })()}

          {/* ======== ABA ESTOQUE ======== */}
          {aba === 'estoque' && (() => {
            const pedidosPagos = pedidos.filter(p => p.status === 'pago');

            // Vendido total — usa TODO o historico de pedidos pagos (nao so um periodo)
            const vendidoPorNome = new Map<string, number>();
            pedidosPagos.forEach(p => {
              if (p.itens && p.itens.length) {
                p.itens.forEach(item => vendidoPorNome.set(item.nome, (vendidoPorNome.get(item.nome) || 0) + item.quantidade));
              } else {
                vendidoPorNome.set(p.produto_nome, (vendidoPorNome.get(p.produto_nome) || 0) + 1);
              }
            });

            const linhas = produtos.map(p => {
              const vendido = vendidoPorNome.get(p.nome) || 0;
              const inicial = p.estoque_inicial ?? 0;
              const atual = inicial - vendido;
              const status: 'esgotado' | 'ok' | 'nao_configurado' = inicial <= 0 ? 'nao_configurado' : atual <= 0 ? 'esgotado' : 'ok';
              return { produto: p, vendido, atual, valorEstoque: Math.max(atual, 0) * (p.custo ?? 0), status };
            });

            const totalSkus = produtos.length;
            const pecasEmEstoque = linhas.reduce((s, l) => s + Math.max(l.atual, 0), 0);
            const valorEstoqueTotal = linhas.reduce((s, l) => s + l.valorEstoque, 0);
            const esgotadoCount = linhas.filter(l => l.status === 'esgotado').length;
            const alertas = linhas.filter(l => l.status === 'esgotado').sort((a, b) => a.atual - b.atual);

            // Janela de 30 dias — faturamento, custo do vendido e historico diario
            const hoje = new Date();
            const dias30: string[] = [];
            for (let i = 29; i >= 0; i--) {
              const d = new Date(hoje); d.setDate(d.getDate() - i);
              dias30.push(d.toISOString().slice(0, 10));
            }
            const inicio30 = dias30[0];
            const pedidos30d = pedidosPagos.filter(p => p.created_at.slice(0, 10) >= inicio30);
            const faturamento30d = pedidos30d.reduce((s, p) => s + p.preco, 0);
            const custoPorNome = new Map(produtos.map(p => [p.nome, p.custo ?? 0]));
            const custoVendido30d = pedidos30d.reduce((s, p) => {
              if (p.itens && p.itens.length) return s + p.itens.reduce((s2, item) => s2 + item.quantidade * (custoPorNome.get(item.nome) || 0), 0);
              return s + (custoPorNome.get(p.produto_nome) || 0);
            }, 0);
            const lucroBruto30d = faturamento30d - custoVendido30d;
            const margemMedia30d = faturamento30d > 0 ? (lucroBruto30d / faturamento30d) * 100 : 0;

            const historicoDiario: [string, number][] = dias30.map(dia => {
              const total = pedidosPagos.filter(p => p.created_at.slice(0, 10) === dia).reduce((s, p) => s + p.preco, 0);
              const label = new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
              return [label, Math.round(total)];
            });

            return (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                <div>
                  <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>Estoque</h2>
                  <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, margin: 0 }}>
                    Estoque atual calculado a partir de todo o histórico de pedidos pagos.
                  </p>
                </div>

                {/* KPIs */}
                <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{totalSkus}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total de SKUs</div>
                  </div>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{pecasEmEstoque}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Peças em Estoque</div>
                  </div>
                  <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {valorEstoqueTotal.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Valor de Estoque</div>
                  </div>
                  <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {faturamento30d.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Faturamento (30D)</div>
                  </div>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>R$ {lucroBruto30d.toFixed(2)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Lucro Bruto (30D)</div>
                  </div>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{margemMedia30d.toFixed(1)}%</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Margem Média (30D)</div>
                  </div>
                  <div style={{ background: esgotadoCount > 0 ? '#dc26260d' : 'var(--surface-hover)', border: `1px solid ${esgotadoCount > 0 ? '#dc262633' : 'var(--border)'}`, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${esgotadoCount > 0 ? '#dc2626' : 'var(--text-soft, #9ca3af)'}` }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: esgotadoCount > 0 ? '#dc2626' : 'var(--text)' }}>{esgotadoCount}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Item Esgotado</div>
                  </div>
                </div>

                <div className="admin-split-360" style={{ display: 'grid', gap: 20, alignItems: 'start' }}>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>Histórico de Faturamento Diário (R$)</div>
                    <FaturamentoChart30d data={historicoDiario} />
                  </div>
                  <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 20 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Alertas de Reposição</div>
                    {alertas.length === 0 ? (
                      <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, padding: '20px 0', textAlign: 'center' }}>Nenhum alerta — estoque saudável.</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 320, overflowY: 'auto' }}>
                        {alertas.map(l => (
                          <div key={l.produto.id} style={{
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, padding: '10px 12px', borderRadius: 8,
                            background: '#fef2f2', border: '1px solid #fecaca',
                          }}>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{l.produto.nome}</div>
                              <div style={{ fontSize: 11, color: '#6b7280' }}>{l.produto.dose}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div style={{ fontSize: 13, fontWeight: 800, color: '#dc2626' }}>{l.atual}</div>
                              <div style={{ fontSize: 10, color: '#9ca3af' }}>esgotado</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Tabela de produtos com edicao de estoque/custo */}
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="admin-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {['Produto', 'Estoque Inicial', 'Vendido (histórico)', 'Estoque Atual', 'Custo Unit.', 'Valor de Venda', 'Valor de Estoque', 'Status', ''].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {loadingProd ? (
                          <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</td></tr>
                        ) : produtos.length === 0 ? (
                          <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum produto cadastrado.</td></tr>
                        ) : produtos.map(p => (
                          <EstoqueRow key={p.id} produto={p} vendido={vendidoPorNome.get(p.nome) || 0} onSalvar={salvarEstoqueProduto} />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Modal: detalhe/edição de indicação (médica ou paciente) */}
          {editandoIndicacao && (() => {
            const i = editandoIndicacao;
            const ehMedico = i.tipo === 'medico';
            const etapaSucesso = ehMedico ? 'convertido' : 'pago';
            return (
              <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
                <div onClick={() => setEditandoIndicacao(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                <div style={{ position: 'relative', maxWidth: 520, margin: '0 auto', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                  <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>{i.nome} {i.sobrenome}</div>
                      <div style={{ fontSize: 12, color: ehMedico ? 'var(--text-secondary, #374151)' : 'var(--text)', fontWeight: 700, marginTop: 2 }}>Indicado por {i.medico_nome}</div>
                    </div>
                    <button onClick={() => setEditandoIndicacao(null)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
                  </div>

                  <div style={{ padding: '14px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {i.whatsapp && (
                      <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer"
                        style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '7px 14px', borderRadius: 6, fontSize: 12.5, fontFamily: 'inherit', textDecoration: 'none' }}>
                        WhatsApp
                      </a>
                    )}
                    {isSuperadmin && (
                      <button onClick={() => { excluirIndicacao(i.id, `${i.nome} ${i.sobrenome}`); setEditandoIndicacao(null); }}
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
                        Excluir
                      </button>
                    )}
                  </div>

                  <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>Nome</label>
                        <input value={i.nome} onChange={e => setEditandoIndicacao(v => v && { ...v, nome: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>Sobrenome</label>
                        <input value={i.sobrenome || ''} onChange={e => setEditandoIndicacao(v => v && { ...v, sobrenome: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
                      <div>
                        <label style={labelStyle}>WhatsApp</label>
                        <input value={i.whatsapp} onChange={e => setEditandoIndicacao(v => v && { ...v, whatsapp: e.target.value })} style={inputStyle} />
                      </div>
                      <div>
                        <label style={labelStyle}>E-mail</label>
                        <input type="email" value={i.email || ''} onChange={e => setEditandoIndicacao(v => v && { ...v, email: e.target.value })} style={inputStyle} />
                      </div>
                    </div>
                    {ehMedico && (
                      <div>
                        <label style={labelStyle}>CRM</label>
                        <input value={i.crm || ''} onChange={e => setEditandoIndicacao(v => v && { ...v, crm: e.target.value })} style={inputStyle} />
                      </div>
                    )}
                    <div>
                      <label style={labelStyle}>Endereço</label>
                      <input value={i.endereco || ''} onChange={e => setEditandoIndicacao(v => v && { ...v, endereco: e.target.value })} style={inputStyle} />
                    </div>
                    <div>
                      <label style={labelStyle}>Status</label>
                      <select value={i.status} onChange={e => setEditandoIndicacao(v => v && { ...v, status: e.target.value })}
                        style={{ ...inputStyle, cursor: 'pointer' }}>
                        {ehMedico ? (
                          <>
                            <option value="novo">Novo</option>
                            <option value="contatado">Contatado</option>
                            <option value="convertido">Convertido</option>
                            <option value="reprovado">Reprovado</option>
                          </>
                        ) : (
                          <>
                            <option value="em_atendimento">Em Atendimento</option>
                            <option value="negociacao">Negociação</option>
                            <option value="pago">Pago</option>
                            <option value="cancelado">Cancelado</option>
                          </>
                        )}
                      </select>
                    </div>
                    <ComissaoWidget id={i.id} comissaoValor={i.comissao_valor} comissaoPaga={i.comissao_paga} totalBase={totalBaseFor(i.id)}
                      mostrar={i.status === etapaSucesso} promptId={comissaoPromptId} setPromptId={setComissaoPromptId}
                      input={comissaoInput} setInput={setComissaoInput} onConfirmar={lancarComissao} />
                  </div>
                  <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
                    <button onClick={() => setEditandoIndicacao(null)} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                      Cancelar
                    </button>
                    <button onClick={salvarEdicaoIndicacao} disabled={salvandoIndicacao} style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoIndicacao ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: salvandoIndicacao ? 0.6 : 1 }}>
                      {salvandoIndicacao ? 'Salvando...' : 'Salvar'}
                    </button>
                  </div>
                </div>
              </div>
            );
          })()}

        </main>
      </div>
    </div>
  );
}
