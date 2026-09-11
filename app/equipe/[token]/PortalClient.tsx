'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardOverview, type DashProduto, type DashConfig } from '@/components/DashboardOverview';
import { HBarChart } from '@/components/DashboardCharts';
import { corDaEtiqueta } from '@/lib/etiquetas';
import { brl } from '@/lib/format';
import { calcularVendidoPorProduto } from '@/lib/estoque';

type Cadastro = {
  id: string; nome: string; sobrenome: string; email: string; whatsapp: string;
  endereco: string; crm: string | null; onde_conheceu: string | null;
  status: string; token: string | null; created_at: string; updated_at?: string;
  vendedor_id?: string | null; solicitacao?: string | null;
  obs?: string; motivo_rejeicao?: string;
  last_seen_loja?: string | null; last_seen_blog?: string | null;
  tags?: string[];
  funil_status?: string | null; motivo_perda?: string | null;
  produtos_interesse?: string[];
  indicado_por_medico_id?: string | null; indicado_por_medico_nome?: string | null;
  comissao_valor?: number | null; comissao_paga?: boolean; comissao_despesa_id?: string | null;
  categoria?: 'normal' | 'cortesia'; documentos?: string[];
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

function TagsLead({ tags }: { tags?: string[] }) {
  if (!tags || tags.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 3 }}>
      {tags.map(tag => {
        const cor = corDaEtiqueta(tag);
        return (
          <span key={tag} style={{ background: `${cor}1a`, color: cor, border: `1px solid ${cor}55`, padding: '1px 7px', borderRadius: 20, fontSize: 10, fontWeight: 700, whiteSpace: 'nowrap' }}>
            {tag}
          </span>
        );
      })}
    </div>
  );
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

type Membro = { id: string; nome: string; email: string; cargo: string; ativo: boolean; created_at: string; };
type PedidoItem = { nome: string; preco: number; quantidade: number };
type Pedido = {
  id: string; cadastro_id: string; cadastro_nome: string; cadastro_email: string; cadastro_whatsapp?: string;
  indicacao_id?: string | null; paciente_nome?: string;
  produto_nome: string; preco: number; itens?: PedidoItem[];
  status: string; obs?: string; created_at: string; vendedor_id?: string; despesa_id?: string | null;
};
type Indicacao = {
  id: string; medico_id: string; medico_nome: string;
  nome: string; sobrenome: string; whatsapp: string; email: string; endereco: string;
  status: string; created_at: string; tipo?: 'paciente' | 'medico'; crm?: string;
  obs?: string; comissao_valor?: number | null; comissao_paga?: boolean; comissao_despesa_id?: string | null;
  documentos?: string[];
};

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
          OK Comissão: {totalBase > 0 ? `${brl(((comissaoValor || 0) / totalBase * 100))}%` : `R$ ${brl((comissaoValor || 0))}`}
        </div>
        <button onClick={() => {
          setPromptId(id);
          setInput(totalBase > 0 ? brl(((comissaoValor || 0) / totalBase * 100)) : String(comissaoValor || ''));
        }} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', textDecoration: 'underline', cursor: 'pointer', fontSize: 10.5, fontFamily: 'inherit' }}>Editar</button>
      </div>
    );
  }
  if (promptId === id) {
    if (totalBase > 0) {
      const pct = parseFloat(input.replace(',', '.')) || 0;
      const valorCalculado = totalBase * pct / 100;
      return (
        <div style={{ marginTop: 4 }} onClick={e => e.stopPropagation()}>
          <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)' }}>Total: R$ {brl(totalBase)}</div>
          <div style={{ display: 'flex', gap: 4, alignItems: 'center', marginTop: 2 }}>
            <input autoFocus type="number" min="0" step="0.1" value={input} onChange={e => setInput(e.target.value)}
              placeholder="%" style={{ width: 50, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }} />
            <span style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>%</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>= R$ {brl(valorCalculado)}</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            <button onClick={() => onConfirmar(id, valorCalculado)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
            <button onClick={() => setPromptId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 13 }}>×</button>
          </div>
        </div>
      );
    }
    const valorManual = parseFloat(input.replace(',', '.')) || 0;
    return (
      <div style={{ marginTop: 4 }} onClick={e => e.stopPropagation()}>
        <div style={{ fontSize: 9.5, color: 'var(--text-soft, #9ca3af)' }}>Sem pedido vinculado — informe o valor</div>
        <div style={{ display: 'flex', gap: 4, marginTop: 2 }}>
          <input autoFocus type="number" min="0" step="0.01" value={input} onChange={e => setInput(e.target.value)}
            placeholder="R$ comissão" style={{ width: 90, border: '1px solid var(--border)', borderRadius: 6, padding: '3px 6px', fontSize: 11, fontFamily: 'inherit' }} />
          <button onClick={() => onConfirmar(id, valorManual)} style={{ background: '#16a34a', color: '#fff', border: 'none', borderRadius: 5, padding: '3px 8px', fontSize: 11, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
          <button onClick={() => setPromptId(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 13 }}>×</button>
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
type Produto = { id: string; nome: string; preco: number; dose?: string; custo?: number; estoque_inicial?: number };
type Despesa = { id: string; tipo: 'entrada' | 'saida'; categoria: string; descricao: string; valor: number; data: string; comprovante_url?: string; created_at: string; };
type MentoriaCliqueLog = { id: string; medico_id: string; medico_nome: string; created_at: string; };
type Material = { nome: string; url: string };
type Artigo = { id: string; titulo: string; conteudo: string; imagem?: string; video?: string; categoria?: string; materiais: Material[]; publicado: boolean; created_at: string; updated_at: string; };

type Props = { membro: Membro; leads: Cadastro[]; equipe: Membro[]; token: string; logo?: string; };

const CARGO_LABEL: Record<string, string> = { superadmin: 'Super Admin', gerente: 'Gerente', vendedor: 'Vendedor' };
const CARGO_COLOR: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' }, gerente: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
  vendedor: { bg: '#f0fdf4', text: '#15803d' },
};
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado', em_analise: 'Em Analise' };
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' }, aprovado: { bg: '#dcfce7', text: '#15803d' },
  rejeitado: { bg: '#fef2f2', text: '#dc2626' }, em_analise: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
};
const PEDIDO_STATUS_LABEL: Record<string, string> = {
  em_atendimento: 'Em Atendimento', negociacao: 'Negociação', pago: 'Pago', cancelado: 'Cancelado',
};
const PEDIDO_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  em_atendimento: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' }, negociacao: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
  pago: { bg: '#dcfce7', text: '#15803d' }, cancelado: { bg: '#fef2f2', text: '#dc2626' },
};

function Badge({ status, map }: { status: string; map: Record<string, { bg: string; text: string }> }) {
  const c = map[status] || { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' };
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.text }}>{STATUS_LABEL[status] || status}</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${color || 'var(--text-soft, #9ca3af)'}` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text)' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-muted, #6b7280)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
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
      <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)', fontVariantNumeric: 'tabular-nums' }}>R$ {brl(produto.preco)}</td>
      <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)', fontVariantNumeric: 'tabular-nums' }}>R$ {brl(valorEstoque)}</td>
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

const ABA_NAV: { key: string; icon: string; label: string; color: string; gerenteOnly?: boolean; vendedorOnly?: boolean }[] = [
  { key: 'dashboard', icon: '#', label: 'Dashboard', color: 'var(--text)', gerenteOnly: true },
  { key: 'leads', icon: 'L', label: 'C. Médicos', color: '#16a34a' },
  { key: 'clientes', icon: 'C', label: 'Clientes', color: 'var(--text)', gerenteOnly: true },
  // "Pedidos" só continua como aba própria pro vendedor — ele não tem
  // Dashboard nem Relatórios (gerenteOnly) pra ver pedido em outro lugar, e
  // o botão "+ Pedido" nas linhas de médico/paciente é só do gerente.
  { key: 'pedidos', icon: 'P', label: 'Pedidos', color: 'var(--text)', vendedorOnly: true },
  { key: 'financeiro', icon: '$', label: 'Financeiro', color: 'var(--text-secondary, #374151)', gerenteOnly: true },
  { key: 'estoque', icon: 'E', label: 'Estoque', color: 'var(--text)', gerenteOnly: true },
  { key: 'relatorios', icon: 'i', label: 'Relatórios', color: 'var(--text-secondary, #374151)', gerenteOnly: true },
  { key: 'mentoria', icon: '%', label: 'Mentoria', color: 'var(--text)', gerenteOnly: true },
  { key: 'blog', icon: 'B', label: 'Blog', color: 'var(--text)', gerenteOnly: true },
  { key: 'rastreio', icon: 'R', label: 'Link de Rastreio', color: 'var(--text-secondary, #374151)', gerenteOnly: true },
];

function SideNav({ aba, handlers, gerenteOnly }: { aba: string; handlers: Record<string, () => void>; gerenteOnly?: boolean }) {
  const itens = ABA_NAV.filter(i => (!i.gerenteOnly || gerenteOnly) && (!i.vendedorOnly || !gerenteOnly));
  return (
    <aside className="portal-sidenav" style={{ flexShrink: 0, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 10, alignSelf: 'flex-start', display: 'flex' }}>
      {itens.map(item => {
        const ativo = aba === item.key;
        return (
          <button key={item.key} className="portal-navitem" onClick={handlers[item.key]}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px 9px 10px', border: 'none', borderRadius: 8, marginBottom: 2,
              borderLeft: `3px solid ${ativo ? 'var(--accent)' : 'transparent'}`,
              background: ativo ? 'var(--accent-soft)' : 'transparent',
              color: ativo ? 'var(--accent-text)' : 'var(--text-muted)',
              fontWeight: ativo ? 700 : 500, fontSize: 13.5, fontFamily: 'inherit',
              cursor: 'pointer', textAlign: 'left', transition: 'background .15s, color .15s',
            }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 24, height: 24, borderRadius: 6, fontSize: 12, fontWeight: 800, flexShrink: 0,
              background: ativo ? 'var(--accent)' : 'var(--surface-hover)', color: ativo ? '#fff' : 'var(--text-soft)',
            }}>{item.icon}</span>
            {item.label}
          </button>
        );
      })}
    </aside>
  );
}

/* =========================================================
   LEAD DETAIL PANEL (usado por vendedor e gerente)
   ========================================================= */
function LeadDetail({
  lead, equipe, token, cargo,
  onClose, onUpdate,
}: {
  lead: Cadastro; equipe: Membro[]; token: string; cargo: string;
  onClose: () => void; onUpdate: (l: Cadastro) => void;
}) {
  const [obs, setObs] = useState(lead.obs || '');
  const [motivo, setMotivo] = useState(lead.motivo_rejeicao || '');
  const [loading, setLoading] = useState('');
  const [msg, setMsg] = useState('');
  const [waLink, setWaLink] = useState('');
  const [emailEnviado, setEmailEnviado] = useState<boolean | null>(null);
  const [linkCopiado, setLinkCopiado] = useState(false);
  const [perdaPrompt, setPerdaPrompt] = useState(false);
  const [motivoPerda, setMotivoPerda] = useState('');

  async function acao(action: string, extra?: object) {
    setLoading(action);
    try {
      const r = await fetch(`/api/portal/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-member-token': token },
        body: JSON.stringify({ action, obs, motivo, ...extra }),
      });
      const d = await r.json();
      if (!r.ok) { setMsg(d.error || 'Erro'); return; }
      onUpdate(d);
      if (d.wa_link) setWaLink(d.wa_link);
      else setMsg('Acao realizada com sucesso!');
      if (d.email_enviado !== undefined) setEmailEnviado(d.email_enviado);
      setTimeout(() => setMsg(''), 4000);
    } finally { setLoading(''); }
  }

  async function salvarObs() {
    setLoading('obs');
    try {
      const r = await fetch(`/api/portal/leads/${lead.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-member-token': token },
        body: JSON.stringify({ action: 'salvar_obs', obs }),
      });
      const d = await r.json();
      if (r.ok) { onUpdate(d); setMsg('Anotacao salva!'); setTimeout(() => setMsg(''), 3000); }
    } finally { setLoading(''); }
  }

  const waNome = `${lead.nome}${lead.sobrenome ? ' ' + lead.sobrenome : ''}`;
  const waLead = lead.whatsapp
    ? `https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Ola ${waNome}! Aqui e a equipe PeptideZ Health. Estou entrando em contato sobre seu cadastro.`)}`
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 520, background: 'var(--surface)', overflowY: 'auto', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: 'var(--text)' }}>{lead.nome} {lead.sobrenome}</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 2 }}>Lead desde {formatDate(lead.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', flex: 1, display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Status */}
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Badge status={lead.status} map={STATUS_COLOR} />
            {lead.solicitacao && (
              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: lead.solicitacao === 'aprovar' ? '#dcfce7' : '#fef2f2', color: lead.solicitacao === 'aprovar' ? '#15803d' : '#dc2626' }}>
                Solicita {lead.solicitacao === 'aprovar' ? 'Aprovacao' : 'Rejeicao'}
              </span>
            )}
          </div>

          {/* Info */}
          <div style={{ background: 'var(--surface-hover)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              ['Email', lead.email],
              ['WhatsApp', lead.whatsapp],
              ['Endereco', lead.endereco],
              ['CRM', lead.crm || '—'],
              ['Como conheceu', lead.onde_conheceu || '—'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: 'var(--text-muted, #6b7280)', minWidth: 110 }}>{k}:</span>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Funil de vendas (gerente/superadmin) */}
          {(cargo === 'gerente' || cargo === 'superadmin') && (
            <div style={{ background: 'var(--surface-hover)', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>Funil de Vendas</label>
                <select value={lead.funil_status || 'novo'} onChange={e => {
                    const v = e.target.value;
                    if (v === 'perdido') { setPerdaPrompt(true); setMotivoPerda(''); }
                    else acao('atualizar_funil', { funil_status: v });
                  }}
                  style={{ width: '100%', border: `1px solid ${FUNIL_COLOR_FIXO[lead.funil_status || 'novo']}55`, borderRadius: 8, padding: '9px 12px', fontSize: 13, fontFamily: 'inherit', color: FUNIL_COLOR_FIXO[lead.funil_status || 'novo'], fontWeight: 700, cursor: 'pointer', background: '#f1f5f9' }}>
                  {FUNIL_ETAPAS.map(e => <option key={e} value={e}>{FUNIL_LABEL[e]}</option>)}
                </select>
                {perdaPrompt && (
                  <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                    <select autoFocus value={motivoPerda} onChange={e => setMotivoPerda(e.target.value)}
                      style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 8px', fontSize: 12, fontFamily: 'inherit' }}>
                      <option value="">Motivo...</option>
                      {MOTIVOS_PERDA.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>
                    <button onClick={() => { acao('atualizar_funil', { funil_status: 'perdido', motivo_perda: motivoPerda }); setPerdaPrompt(false); }}
                      style={{ background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, padding: '6px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit' }}>OK</button>
                  </div>
                )}
                {lead.funil_status === 'perdido' && lead.motivo_perda && (
                  <div style={{ fontSize: 11.5, color: 'var(--text-muted, #6b7280)', marginTop: 4 }}>Motivo: {lead.motivo_perda}</div>
                )}
              </div>
            </div>
          )}

          {/* Botao WhatsApp contato */}
          {waLead && (
            <a href={waLead} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#128C46', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>📱</span> Iniciar Conversa no WhatsApp
            </a>
          )}

          {/* Botao reenviar link de acesso — visível para todos quando lead está aprovado */}
          {lead.status === 'aprovado' && lead.token && (() => {
            const base = typeof window !== 'undefined' ? window.location.origin : '';
            const lojaUrl = `${base}/acesso/${lead.token}`;
            const nomeCliente = `${lead.nome}${lead.sobrenome ? ' ' + lead.sobrenome : ''}`;
            const msg = `Olá ${nomeCliente}! 🎉\n\nSeu cadastro na PeptideZ Health foi *aprovado*!\n\nAcesse sua loja exclusiva pelo link abaixo:\n👉 ${lojaUrl}\n\nEm caso de dúvidas, entre em contato conosco.`;
            const waReenvio = lead.whatsapp
              ? `https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
              : null;
            return waReenvio ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>✅ Lead aprovado — envie o link de acesso:</div>
                <a href={waReenvio} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#128C46', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>📱</span> Enviar Link de Acesso via WhatsApp
                </a>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', wordBreak: 'break-all' }}>{lojaUrl}</div>
              </div>
            ) : null;
          })()}

          {/* Link de indicacao para pacientes (medico ja aprovado) */}
          {lead.status === 'aprovado' && lead.token && (() => {
            const base = typeof window !== 'undefined' ? window.location.origin : '';
            const indicarUrl = `${base}/indicar/${lead.token}`;
            const copiarIndicacao = () => {
              navigator.clipboard.writeText(indicarUrl);
              setLinkCopiado(true);
              setTimeout(() => setLinkCopiado(false), 2500);
            };
            return (
              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #374151)' }}>🔗 Link de indicação para pacientes deste médico:</div>
                <button onClick={copiarIndicacao}
                  style={{ background: linkCopiado ? '#f0fdf4' : 'var(--surface)', color: linkCopiado ? '#15803d' : 'var(--text-secondary, #374151)', border: `1px solid ${linkCopiado ? '#86efac' : 'var(--border)'}`, borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                  {linkCopiado ? '✓ Link copiado!' : 'Copiar Link de Indicação'}
                </button>
                <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', wordBreak: 'break-all' }}>{indicarUrl}</div>
              </div>
            );
          })()}

          {/* Motivo de rejeicao (se houver) */}
          {lead.motivo_rejeicao && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              <strong>Motivo da rejeicao:</strong> {lead.motivo_rejeicao}
            </div>
          )}

          {/* Observacoes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
              Anotacoes / Observacoes
            </label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Registre informacoes da conversa, interesses, proximos passos..."
              rows={5}
              style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: 'var(--text)', background: 'var(--surface)' }}
            />
            <button onClick={salvarObs} disabled={loading === 'obs'}
              style={{ marginTop: 6, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '7px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {loading === 'obs' ? 'Salvando...' : 'Salvar Anotacao'}
            </button>
          </div>

          {msg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d' }}>{msg}</div>}

          {/* Resultado da aprovacao */}
          {waLink && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>Lead aprovado! Notifique o cliente:</div>
              {emailEnviado === true && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#15803d' }}>
                  <span>✅</span> Email de aprovacao enviado para o cliente
                </div>
              )}
              {emailEnviado === false && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: '#dc2626' }}>
                  <span>⚠️</span> Email nao enviado — use o WhatsApp abaixo
                </div>
              )}
              <a href={waLink} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#128C46', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>📱</span> Enviar Link de Acesso via WhatsApp
              </a>
              <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)', wordBreak: 'break-all' }}>
                Clique no botao verde acima para abrir o WhatsApp com a mensagem ja preenchida.
              </div>
            </div>
          )}

          {/* Acoes de gerente */}
          {(cargo === 'gerente' || cargo === 'superadmin') && lead.status !== 'aprovado' && lead.status !== 'rejeitado' && (
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text-secondary, #374151)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Decisao do Gerente</div>
              {lead.solicitacao && (
                <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: 'var(--text-secondary, #374151)', marginBottom: 10 }}>
                  Vendedor solicita {lead.solicitacao === 'aprovar' ? 'aprovacao' : 'rejeicao'}.
                  {lead.motivo_rejeicao && <span> Motivo: <em>{lead.motivo_rejeicao}</em></span>}
                </div>
              )}
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => acao('aprovar')} disabled={!!loading}
                  style={{ flex: 1, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '12px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                  Aprovar Lead
                </button>
                <button onClick={() => acao('rejeitar')} disabled={!!loading}
                  style={{ flex: 1, background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '12px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 14, fontFamily: 'inherit' }}>
                  Rejeitar Lead
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* =========================================================
   GERENTE VIEW
   ========================================================= */
function GerenteView({ membro, leads: leadsInit, equipe, token, logo }: Props) {
  const [lista, setLista] = useState(leadsInit);
  const [filtro, setFiltro] = useState('todos');
  const [selectedLead, setSelectedLead] = useState<Cadastro | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [aba, setAba] = useState<'dashboard' | 'leads' | 'clientes' | 'financeiro' | 'estoque' | 'relatorios' | 'mentoria' | 'blog' | 'rastreio'>('dashboard');
  const [buscaMedico, setBuscaMedico] = useState('');
  const [verLeadsKanban, setVerLeadsKanban] = useState(true);
  const [editandoProdutoCardId, setEditandoProdutoCardId] = useState<string | null>(null);
  const [novoProdutoCardInput, setNovoProdutoCardInput] = useState('');
  const [perdaPromptId, setPerdaPromptId] = useState<string | null>(null);
  const [motivoPerdaInput, setMotivoPerdaInput] = useState('');
  const [editandoTagsId, setEditandoTagsId] = useState<string | null>(null);
  const [novaTagInput, setNovaTagInput] = useState('');
  const [buscaIndicacao, setBuscaIndicacao] = useState('');
  const [filtroIndicacao, setFiltroIndicacao] = useState('todos');
  const [verIndicacoesKanban, setVerIndicacoesKanban] = useState(true);
  const [verIndicacoesMedicasKanban, setVerIndicacoesMedicasKanban] = useState(true);
  const [comissaoPromptId, setComissaoPromptId] = useState<string | null>(null);
  const [comissaoInput, setComissaoInput] = useState('');
  const [editandoIndicacao, setEditandoIndicacao] = useState<Indicacao | null>(null);
  const [salvandoIndicacao, setSalvandoIndicacao] = useState(false);
  const [msgIndicacao, setMsgIndicacao] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todas');
  const [buscaCliente, setBuscaCliente] = useState('');
  // Pivot: cadastro unificado — a aba "C. Médicos" alterna entre a lista de
  // médicos (Cadastro) e a de pacientes (Indicacao), absorvendo as antigas
  // abas "Indicações" e "Indicações Médicas" (espelha o admin).
  const [tipoCadastroView, setTipoCadastroView] = useState<'medico' | 'paciente'>('medico');
  const [novoCadastroTipo, setNovoCadastroTipo] = useState<'escolher' | 'medico' | 'paciente' | null>(null);
  const [wizardStep, setWizardStep] = useState(0);
  const NOVO_MEDICO_INICIAL = {
    indicado_por_medico_id: '', nome: '', sobrenome: '', email: '', whatsapp: '', endereco: '', crm: '', onde_conheceu: '',
    cpf: '', rg: '', cidade: '', estado: '', documentos: [] as string[],
    produto_id: '', quantidade: '1', desconto: '0', comprovante_pagamento: '', cashback_percentual: '0',
  };
  const NOVO_PACIENTE_INICIAL = {
    medico_id: '', receita: '',
    nome: '', sobrenome: '', whatsapp: '', email: '', endereco: '', cpf: '', rg: '', cidade: '', estado: '',
    produto_id: '', quantidade: '1', desconto: '0', comprovante_pagamento: '', documentos: [] as string[], cashback_percentual: '0',
  };
  const [novoMedico, setNovoMedico] = useState(NOVO_MEDICO_INICIAL);
  const [novoPaciente, setNovoPaciente] = useState(NOVO_PACIENTE_INICIAL);
  const [buscaMedicoIndicador, setBuscaMedicoIndicador] = useState('');
  const [salvandoNovoCadastro, setSalvandoNovoCadastro] = useState(false);
  const [msgNovoCadastro, setMsgNovoCadastro] = useState('');
  const [uploadandoWizard, setUploadandoWizard] = useState<string | null>(null);
  const [comissaoCadastroPromptId, setComissaoCadastroPromptId] = useState<string | null>(null);
  const [comissaoCadastroInput, setComissaoCadastroInput] = useState('');

  // Mesma sequência combinada do wizard do admin: quem indicou → receita (só
  // paciente) → dados gerais → produto/pedido+desconto → comprovante →
  // documentos → cashback %.
  const PACIENTE_STEPS = ['indicador', 'receita', 'dados', 'produto', 'comprovante', 'documentos', 'cashback'] as const;
  const MEDICO_STEPS = ['indicador', 'dados', 'produto', 'comprovante', 'documentos', 'cashback'] as const;

  const [produtosCatalogo, setProdutosCatalogo] = useState<Produto[]>([]);
  const [loadingPedidoStatus, setLoadingPedidoStatus] = useState('');

  const [relatorioTipo, setRelatorioTipo] = useState<'faturamento' | 'medicos' | 'comissoes' | 'financeiro'>('faturamento');
  const [relFiltroInicio, setRelFiltroInicio] = useState('');
  const [relFiltroFim, setRelFiltroFim] = useState('');
  const [relFiltroMedico, setRelFiltroMedico] = useState('');
  const [relAgrupamento, setRelAgrupamento] = useState<'dia' | 'mes'>('dia');
  const [relFiltroTipoFin, setRelFiltroTipoFin] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [relFiltroCategoria, setRelFiltroCategoria] = useState('');

  useEffect(() => {
    fetch('/api/portal/produtos', { headers: { 'x-member-token': token } })
      .then(r => r.ok ? r.json() : null).then(d => { if (d) setProdutosCatalogo(d); });
    carregarDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // "Online na Loja Agora" depende de last_seen_loja, que so muda quando o
  // heartbeat da loja (a cada 45s) grava no banco — sem isto o painel so via
  // quem estava online no momento em que o token foi carregado, nunca depois.
  useEffect(() => {
    if (aba !== 'dashboard') return;
    const atualizar = () => {
      fetch('/api/portal/leads', { headers: { 'x-member-token': token } })
        .then(r => r.ok ? r.json() : null).then(d => { if (d) setLista(d); });
    };
    const id = setInterval(atualizar, 20000);
    return () => clearInterval(id);
  }, [aba, token]);

  const fecharNovoCadastro = () => {
    setNovoCadastroTipo(null);
    setWizardStep(0);
    setNovoMedico(NOVO_MEDICO_INICIAL);
    setNovoPaciente(NOVO_PACIENTE_INICIAL);
    setBuscaMedicoIndicador('');
    setMsgNovoCadastro('');
  };

  const recarregarPedidosEDespesasSilencioso = async () => {
    const [rp, rd] = await Promise.all([
      fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } }),
      fetch('/api/portal/despesas', { headers: { 'x-member-token': token } }),
    ]);
    if (rp.ok) setPedidos(await rp.json());
    if (rd.ok) setDespesas(await rd.json());
  };

  const criarMedicoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvandoNovoCadastro(true);
    setMsgNovoCadastro('');
    const r = await fetch('/api/portal/leads', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify(novoMedico),
    });
    setSalvandoNovoCadastro(false);
    if (r.ok) {
      const c = await r.json();
      setLista(prev => [c, ...prev]);
      fecharNovoCadastro();
      recarregarPedidosEDespesasSilencioso();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsgNovoCadastro(d.error || 'Erro ao cadastrar médico');
    }
  };

  const criarPacienteManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!novoPaciente.medico_id) { setMsgNovoCadastro('Busque o médico indicador e clique no nome dele na lista antes de cadastrar'); return; }
    setSalvandoNovoCadastro(true);
    setMsgNovoCadastro('');
    const r = await fetch('/api/portal/pacientes/completo', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify(novoPaciente),
    });
    setSalvandoNovoCadastro(false);
    if (r.ok) {
      const d = await r.json();
      setIndicacoes(prev => [d.indicacao, ...prev]);
      fecharNovoCadastro();
      recarregarPedidosEDespesasSilencioso();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsgNovoCadastro(d.error || 'Erro ao cadastrar paciente');
    }
  };

  const uploadWizardFile = async (field: string, file: File, onUrl: (url: string) => void) => {
    setUploadandoWizard(field);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/portal/upload', { method: 'POST', headers: { 'x-member-token': token }, body: fd });
      const d = await r.json();
      if (r.ok) onUrl(d.url);
      else setMsgNovoCadastro(d.error || 'Erro ao enviar arquivo');
    } finally { setUploadandoWizard(null); }
  };

  const totalBaseForCadastro = (cadastroId: string) =>
    pedidos.filter(p => p.cadastro_id === cadastroId && !p.indicacao_id && p.status === 'pago').reduce((s, p) => s + p.preco, 0);

  const lancarComissaoCadastro = async (id: string, valor: number) => {
    if (!valor || valor <= 0) { setMsgNovoCadastro('Informe um valor válido'); return; }
    const r = await fetch('/api/portal/cadastros/comissao', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ id, comissao_valor: valor }),
    });
    if (r.ok) {
      setLista(prev => prev.map(x => x.id === id ? { ...x, comissao_valor: valor, comissao_paga: true } : x));
      setComissaoCadastroPromptId(null); setComissaoCadastroInput('');
    } else { const d = await r.json().catch(() => ({})); setMsgNovoCadastro(d.error || 'Erro ao lançar comissão'); }
  };

  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [loadingDespesas, setLoadingDespesas] = useState(false);
  const [mentoriaCliques, setMentoriaCliques] = useState<MentoriaCliqueLog[]>([]);
  const [loadingMentoria, setLoadingMentoria] = useState(false);

  const [artigos, setArtigos] = useState<Artigo[]>([]);
  const [loadingArtigos, setLoadingArtigos] = useState(false);
  const [categoriasBlog, setCategoriasBlog] = useState<string[]>([]);
  const [novoArtigo, setNovoArtigo] = useState({ titulo: '', conteudo: '', imagem: '', categoria: '', publicado: false });
  const [editandoArtigo, setEditandoArtigo] = useState<Artigo | null>(null);
  const [uploadandoArtigo, setUploadandoArtigo] = useState(false);
  const [msgBlog, setMsgBlog] = useState('');

  const [produtosDash, setProdutosDash] = useState<DashProduto[]>([]);
  const [configDash, setConfigDash] = useState<DashConfig>({});
  const [loadingDashboard, setLoadingDashboard] = useState(false);

  const [categoriasFinanceiras, setCategoriasFinanceiras] = useState<string[]>([]);
  const [novaDespesa, setNovaDespesa] = useState({ tipo: 'saida' as 'entrada' | 'saida', categoria: '', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), comprovante_url: '' });
  const [editandoDespesa, setEditandoDespesa] = useState<Despesa | null>(null);
  const [msgFinanceiro, setMsgFinanceiro] = useState('');
  const [finFiltroTipo, setFinFiltroTipo] = useState<'todos' | 'entrada' | 'saida'>('todos');
  const [finFiltroCategoria, setFinFiltroCategoria] = useState('');
  const [finFiltroInicio, setFinFiltroInicio] = useState('');
  const [finFiltroFim, setFinFiltroFim] = useState('');
  const [finBusca, setFinBusca] = useState('');

  const [buscaRastreio, setBuscaRastreio] = useState('');
  const [rastreioSelecionado, setRastreioSelecionado] = useState<{ id: string; nome: string; whatsapp: string; tipo: 'medico' | 'paciente' } | null>(null);
  const [linkRastreio, setLinkRastreio] = useState('');
  const [baixandoArteRastreio, setBaixandoArteRastreio] = useState(false);
  const [msgRastreio, setMsgRastreio] = useState('');
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
      setMsgRastreio('Não consegui gerar a imagem. Tente novamente.');
      setTimeout(() => setMsgRastreio(''), 4000);
    } finally {
      setBaixandoArteRastreio(false);
    }
  };

  const pendentes = lista.filter(l => l.status === 'pendente');
  const emAnalise = lista.filter(l => l.status === 'em_analise');
  const aprovados = lista.filter(l => l.status === 'aprovado');
  const rejeitados = lista.filter(l => l.status === 'rejeitado');
  const totalPacientes = indicacoes.filter(i => i.tipo !== 'medico').length;

  const visivelPorStatus = filtro === 'analise' ? emAnalise
    : filtro === 'pendente' ? pendentes
    : filtro === 'aprovado' ? aprovados
    : filtro === 'rejeitado' ? rejeitados
    : lista;
  const buscaQ = buscaMedico.trim().toLowerCase();
  const visivelPorEtiqueta = filtroEtiqueta === 'todas' ? visivelPorStatus
    : visivelPorStatus.filter(l => (l.tags || []).includes(filtroEtiqueta));
  const visivel = !buscaQ ? visivelPorEtiqueta : visivelPorEtiqueta.filter(l =>
    `${l.nome} ${l.sobrenome} ${l.email} ${l.whatsapp} ${l.crm || ''}`.toLowerCase().includes(buscaQ));
  const todasEtiquetas = Array.from(new Set(lista.flatMap(l => l.tags || []))).sort();

  const [novoPedidoAberto, setNovoPedidoAberto] = useState(false);
  const [novoPedidoTipoCliente, setNovoPedidoTipoCliente] = useState<'medico' | 'paciente'>('medico');
  const [novoPedidoMedicoId, setNovoPedidoMedicoId] = useState('');
  const [buscaMedicoPedido, setBuscaMedicoPedido] = useState('');
  const [novoPedidoIndicacaoId, setNovoPedidoIndicacaoId] = useState('');
  const [buscaPacientePedido, setBuscaPacientePedido] = useState('');
  const [novoPedidoItens, setNovoPedidoItens] = useState<{ nome: string; preco: string; quantidade: string }[]>([{ nome: '', preco: '', quantidade: '1' }]);
  const [novoPedidoStatus, setNovoPedidoStatus] = useState('em_atendimento');
  const [salvandoPedido, setSalvandoPedido] = useState(false);
  const [msgPedido, setMsgPedido] = useState('');

  const fecharNovoPedido = () => {
    setNovoPedidoAberto(false);
    setNovoPedidoTipoCliente('medico');
    setNovoPedidoMedicoId(''); setBuscaMedicoPedido('');
    setNovoPedidoIndicacaoId(''); setBuscaPacientePedido('');
    setNovoPedidoItens([{ nome: '', preco: '', quantidade: '1' }]);
    setNovoPedidoStatus('em_atendimento');
    setMsgPedido('');
  };

  const criarPedidoManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (novoPedidoTipoCliente === 'medico' && !novoPedidoMedicoId) { setMsgPedido('Busque o médico e clique no nome dele na lista'); return; }
    if (novoPedidoTipoCliente === 'paciente' && !novoPedidoIndicacaoId) { setMsgPedido('Busque o paciente e clique no nome dele na lista'); return; }
    const itensValidos = novoPedidoItens.filter(it => it.nome.trim());
    if (itensValidos.length === 0) { setMsgPedido('Adicione ao menos um produto'); return; }
    setSalvandoPedido(true);
    const body = novoPedidoTipoCliente === 'medico'
      ? { cadastro_id: novoPedidoMedicoId, itens: itensValidos, status: novoPedidoStatus }
      : { indicacao_id: novoPedidoIndicacaoId, itens: itensValidos, status: novoPedidoStatus };
    const r = await fetch('/api/portal/pedidos', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify(body),
    });
    setSalvandoPedido(false);
    if (r.ok) {
      fecharNovoPedido();
      const rp = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
      if (rp.ok) setPedidos(await rp.json());
    } else { const d = await r.json().catch(() => ({})); setMsgPedido(d.error || 'Erro ao criar pedido'); }
  };

  const atualizarStatusIndicacao = async (i: Indicacao, status: string) => {
    setIndicacoes(prev => prev.map(x => x.id === i.id ? { ...x, status } : x));
    const r = await fetch('/api/portal/indicacoes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ ...i, status }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({})); setMsgIndicacao(d.error || 'Erro ao atualizar');
      const ri = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
      if (ri.ok) setIndicacoes(await ri.json());
    }
  };

  const salvarEdicaoIndicacao = async () => {
    if (!editandoIndicacao) return;
    setSalvandoIndicacao(true);
    const r = await fetch('/api/portal/indicacoes', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify(editandoIndicacao),
    });
    setSalvandoIndicacao(false);
    if (r.ok) {
      const salvo = editandoIndicacao;
      setIndicacoes(prev => prev.map(x => x.id === salvo.id ? salvo : x));
      setEditandoIndicacao(null);
    } else { const d = await r.json().catch(() => ({})); setMsgIndicacao(d.error || 'Erro ao salvar'); }
  };

  const totalBaseFor = (indicacaoId: string) =>
    pedidos.filter(p => p.indicacao_id === indicacaoId && p.status === 'pago').reduce((s, p) => s + p.preco, 0);

  const lancarComissao = async (id: string, valor: number) => {
    if (!valor || valor <= 0) { setMsgIndicacao('Informe um valor válido'); return; }
    const r = await fetch('/api/portal/indicacoes/comissao', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ id, comissao_valor: valor }),
    });
    if (r.ok) {
      setIndicacoes(prev => prev.map(x => x.id === id ? { ...x, comissao_valor: valor, comissao_paga: true } : x));
      setEditandoIndicacao(prev => prev && prev.id === id ? { ...prev, comissao_valor: valor, comissao_paga: true } : prev);
      setComissaoPromptId(null); setComissaoInput('');
    } else { const d = await r.json().catch(() => ({})); setMsgIndicacao(d.error || 'Erro ao lançar comissão'); }
  };

  const excluirIndicacao = async (id: string, nome: string) => {
    if (!confirm(`Excluir permanentemente a indicação de ${nome}?`)) return;
    const r = await fetch('/api/portal/indicacoes', {
      method: 'DELETE', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ id }),
    });
    if (r.ok) { setIndicacoes(prev => prev.filter(x => x.id !== id)); }
    else { const d = await r.json().catch(() => ({})); setMsgIndicacao(d.error || 'Erro ao excluir'); }
  };

  const atualizarFunilLead = async (id: string, funil_status: string, motivo_perda?: string | null) => {
    setLista(prev => prev.map(c => c.id === id ? { ...c, funil_status, motivo_perda: funil_status === 'perdido' ? (motivo_perda || null) : null } : c));
    const r = await fetch(`/api/portal/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ action: 'atualizar_funil', funil_status, motivo_perda }),
    });
    if (!r.ok) { setMsgNovoCadastro('Erro ao mover no funil'); const rl = await fetch('/api/portal/leads', { headers: { 'x-member-token': token } }); if (rl.ok) setLista(await rl.json()); }
  };

  const atualizarProdutosInteresseLead = async (id: string, produtos_interesse: string[]) => {
    setLista(prev => prev.map(c => c.id === id ? { ...c, produtos_interesse } : c));
    await fetch(`/api/portal/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ action: 'atualizar_produtos_interesse', produtos_interesse }),
    });
  };

  const atualizarTagsLead = async (id: string, tags: string[]) => {
    setLista(prev => prev.map(c => c.id === id ? { ...c, tags } : c));
    await fetch(`/api/portal/leads/${id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ action: 'atualizar_tags', tags }),
    });
  };

  async function carregarDashboard() {
    setAba('dashboard');
    setLoadingDashboard(true);
    try {
      const [rp, ri, rprod, rcfg, rl, rd] = await Promise.all([
        pedidos.length === 0 ? fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } }) : null,
        indicacoes.length === 0 ? fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } }) : null,
        fetch('/api/portal/produtos', { headers: { 'x-member-token': token } }),
        fetch('/api/portal/config-summary', { headers: { 'x-member-token': token } }),
        fetch('/api/portal/leads', { headers: { 'x-member-token': token } }),
        despesas.length === 0 ? fetch('/api/portal/despesas', { headers: { 'x-member-token': token } }) : null,
      ]);
      if (rp?.ok) setPedidos(await rp.json());
      if (ri?.ok) setIndicacoes(await ri.json());
      if (rprod.ok) setProdutosDash(await rprod.json());
      if (rcfg.ok) setConfigDash(await rcfg.json());
      if (rl.ok) setLista(await rl.json());
      if (rd?.ok) setDespesas(await rd.json());
    } finally { setLoadingDashboard(false); }
  }
  async function carregarPedidosSilencioso() {
    const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
    if (r.ok) setPedidos(await r.json());
  }

  async function carregarFinanceiro() {
    setAba('financeiro');
    setLoadingDespesas(true);
    try {
      const [rd, rc] = await Promise.all([
        fetch('/api/portal/despesas', { headers: { 'x-member-token': token } }),
        fetch('/api/portal/categorias-financeiras', { headers: { 'x-member-token': token } }),
      ]);
      if (rd.ok) setDespesas(await rd.json());
      if (rc.ok) setCategoriasFinanceiras(await rc.json());
    } finally { setLoadingDespesas(false); }
  }

  async function salvarDespesa(e: React.FormEvent) {
    e.preventDefault();
    const body = editandoDespesa ?? novaDespesa;
    const r = await fetch('/api/portal/despesas', {
      method: editandoDespesa ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify(body),
    });
    if (r.ok) {
      setMsgFinanceiro(editandoDespesa ? 'OK: Lançamento atualizado!' : 'OK: Lançamento registrado!');
      setEditandoDespesa(null);
      setNovaDespesa({ tipo: 'saida', categoria: '', descricao: '', valor: '', data: new Date().toISOString().slice(0, 10), comprovante_url: '' });
      carregarFinanceiro();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsgFinanceiro('R ' + (d.error || 'Erro ao salvar'));
    }
    setTimeout(() => setMsgFinanceiro(''), 4000);
  }

  async function adicionarCategoriaFinanceira(nome: string) {
    if (!nome.trim()) return;
    const r = await fetch('/api/portal/categorias-financeiras', {
      method: 'POST', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ nome: nome.trim() }),
    });
    if (r.ok) { const cats = await fetch('/api/portal/categorias-financeiras', { headers: { 'x-member-token': token } }); if (cats.ok) setCategoriasFinanceiras(await cats.json()); }
  }

  async function carregarMentoria() {
    setAba('mentoria');
    setLoadingMentoria(true);
    try {
      const r = await fetch('/api/portal/mentoria-cliques', { headers: { 'x-member-token': token } });
      if (r.ok) setMentoriaCliques(await r.json());
    } finally { setLoadingMentoria(false); }
  }

  async function carregarBlog() {
    setAba('blog');
    setLoadingArtigos(true);
    try {
      const [ra, rc] = await Promise.all([
        fetch('/api/portal/designer/artigos', { headers: { 'x-member-token': token } }),
        fetch('/api/portal/designer/categorias-blog', { headers: { 'x-member-token': token } }),
      ]);
      if (ra.ok) setArtigos(await ra.json());
      if (rc.ok) setCategoriasBlog(await rc.json());
    } finally { setLoadingArtigos(false); }
  }

  async function marcarPedidoStatus(id: string, status: string) {
    setLoadingPedidoStatus(id);
    try {
      const r = await fetch('/api/portal/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-member-token': token },
        body: JSON.stringify({ id, status }),
      });
      if (r.ok) {
        const p = await r.json();
        setPedidos(prev => prev.map(x => x.id === id ? p : x));
      }
    } finally { setLoadingPedidoStatus(''); }
  }

  async function atualizarValorPedido(id: string, preco: number) {
    const r = await fetch('/api/portal/pedidos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ id, preco }),
    });
    if (r.ok) {
      const p = await r.json();
      setPedidos(prev => prev.map(x => x.id === id ? p : x));
    }
  }

  async function salvarEstoqueProdutoPortal(id: string, dados: { estoque_inicial: number; custo: number }) {
    const r = await fetch('/api/portal/produtos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ id, ...dados }),
    });
    if (r.ok) {
      const atualizado = await r.json();
      setProdutosCatalogo(prev => prev.map(p => p.id === id ? atualizado : p));
    }
  }

  async function uploadImagemArtigo(file: File, onUrl: (url: string) => void) {
    setUploadandoArtigo(true);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch('/api/portal/upload', { method: 'POST', headers: { 'x-member-token': token }, body: fd });
      const d = await r.json();
      if (r.ok) { onUrl(d.url); setMsgBlog('OK: Imagem carregada!'); }
      else setMsgBlog('R ' + (d.error || 'Erro ao enviar'));
    } finally { setUploadandoArtigo(false); }
  }

  async function salvarArtigo(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch('/api/portal/designer/artigos', {
      method: editandoArtigo ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify(editandoArtigo ? editandoArtigo : novoArtigo),
    });
    if (r.ok) {
      setMsgBlog(editandoArtigo ? 'OK: Artigo atualizado!' : 'OK: Artigo criado!');
      setEditandoArtigo(null);
      setNovoArtigo({ titulo: '', conteudo: '', imagem: '', categoria: '', publicado: false });
      carregarBlog();
    } else {
      const d = await r.json().catch(() => ({}));
      setMsgBlog('R ' + (d.error || 'Erro ao salvar'));
    }
    setTimeout(() => setMsgBlog(''), 4000);
  }

  async function togglePublicarArtigo(a: Artigo) {
    const r = await fetch('/api/portal/designer/artigos', {
      method: 'PUT', headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ id: a.id, publicado: !a.publicado }),
    });
    if (r.ok) carregarBlog();
  }

  const totalPedidos = pedidos.length;
  const valorPedidos = pedidos.reduce((s, p) => s + p.preco, 0);
  const pedidosVendidos = pedidos.filter(p => p.status === 'pago');

  return (
    <div className="portal-shell">
      {selectedLead && (
        <LeadDetail
          lead={selectedLead} equipe={equipe} token={token} cargo={membro.cargo}
          onClose={() => setSelectedLead(null)}
          onUpdate={d => { setLista(prev => prev.map(l => l.id === d.id ? { ...l, ...d } : l)); setSelectedLead(s => s ? { ...s, ...d } : s); }}
        />
      )}

      <SideNav aba={aba} gerenteOnly handlers={{
        dashboard: carregarDashboard,
        leads: async () => {
          setAba('leads');
          if (indicacoes.length === 0) {
            const r = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
            if (r.ok) setIndicacoes(await r.json());
          }
          if (pedidos.length === 0) {
            const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
            if (r.ok) setPedidos(await r.json());
          }
        },
        clientes: async () => {
          setAba('clientes');
          if (indicacoes.length === 0) {
            const r = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
            if (r.ok) setIndicacoes(await r.json());
          }
          if (pedidos.length === 0) {
            const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
            if (r.ok) setPedidos(await r.json());
          }
        },
        financeiro: carregarFinanceiro,
        estoque: async () => {
          setAba('estoque');
          if (produtosCatalogo.length === 0) {
            const r = await fetch('/api/portal/produtos', { headers: { 'x-member-token': token } });
            if (r.ok) setProdutosCatalogo(await r.json());
          }
          if (pedidos.length === 0) {
            const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
            if (r.ok) setPedidos(await r.json());
          }
        },
        relatorios: async () => {
          setAba('relatorios');
          if (indicacoes.length === 0) {
            const r = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
            if (r.ok) setIndicacoes(await r.json());
          }
          if (despesas.length === 0) {
            const r = await fetch('/api/portal/despesas', { headers: { 'x-member-token': token } });
            if (r.ok) setDespesas(await r.json());
          }
          if (pedidos.length === 0) {
            const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
            if (r.ok) setPedidos(await r.json());
          }
        },
        mentoria: carregarMentoria,
        blog: carregarBlog,
        rastreio: async () => {
          setAba('rastreio');
          if (indicacoes.length === 0) {
            const r = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
            if (r.ok) setIndicacoes(await r.json());
          }
        },
      }} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      {!['dashboard', 'clientes', 'financeiro', 'estoque', 'relatorios', 'mentoria', 'blog', 'rastreio'].includes(aba) && (
        <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
          <StatCard label="Total Leads" value={lista.length} />
          <StatCard label="Pendentes" value={pendentes.length} color="var(--text-muted, #6b7280)" />
          <StatCard label="Em Analise" value={emAnalise.length} sub="solicitacoes" color="var(--text-muted, #6b7280)" />
          <StatCard label="Aprovados" value={aprovados.length} color="#16a34a" />
          <StatCard label="Rejeitados" value={rejeitados.length} color="#dc2626" />
        </div>
      )}

      {/* ABA DASHBOARD (identico ao /admin) */}
      {aba === 'dashboard' && (
        loadingDashboard ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
        ) : (
          <DashboardOverview
            cadastros={lista} pedidos={pedidos} equipe={equipe} produtos={produtosDash} config={configDash}
            despesas={despesas} indicacoes={indicacoes} mostrarVisaoNegocio
            onVerTodosLeads={() => setAba('leads')}
            onIrParaFinanceiro={carregarFinanceiro}
            totalPacientes={totalPacientes}
          />
        )
      )}

      {/* MODAL NOVO PEDIDO — usado pelo botão "+ Pedido" nas linhas de
          médicos/pacientes da aba C. Médicos (a aba própria de Pedidos foi
          removida, igual no admin) */}
      {novoPedidoAberto && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 900, padding: 16 }}>
          <div style={{ background: 'var(--surface)', borderRadius: 12, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>Novo Pedido</div>
              <button onClick={fecharNovoPedido} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
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
                        {lista.find(c => c.id === novoPedidoMedicoId)?.nome} {lista.find(c => c.id === novoPedidoMedicoId)?.sobrenome}
                      </span>
                      <button type="button" onClick={() => setNovoPedidoMedicoId('')} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Trocar</button>
                    </div>
                  ) : (
                    <>
                      <input value={buscaMedicoPedido} onChange={e => setBuscaMedicoPedido(e.target.value)}
                        placeholder="Buscar médico aprovado por nome..." style={inputStyle} />
                      <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 4 }}>Clique no nome do médico na lista para selecionar.</div>
                      {buscaMedicoPedido.trim().length >= 2 && (
                        <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                          {lista.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoPedido.trim().toLowerCase())).slice(0, 8).map(c => (
                            <div key={c.id} onClick={() => { setNovoPedidoMedicoId(c.id); setBuscaMedicoPedido(''); }}
                              style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                              <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</span>
                              {c.crm && <span style={{ color: 'var(--text-muted, #6b7280)' }}> · {c.crm}</span>}
                            </div>
                          ))}
                          {lista.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoPedido.trim().toLowerCase())).length === 0 && (
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
                      <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 4 }}>Clique no nome do paciente na lista para selecionar.</div>
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
                    <div key={idx} style={{ display: 'flex', gap: 8 }}>
                      <select value={it.nome} onChange={e => {
                        const prod = produtosCatalogo.find(p => p.nome === e.target.value);
                        setNovoPedidoItens(prev => prev.map((x, i) => i === idx ? { ...x, nome: e.target.value, preco: prod ? String(prod.preco) : x.preco } : x));
                      }} style={{ ...inputStyle, flex: '2 1 160px' }}>
                        <option value="">Selecione o produto...</option>
                        {produtosCatalogo.map(p => <option key={p.id} value={p.nome}>{p.nome}</option>)}
                      </select>
                      <input type="number" step="0.01" placeholder="Preço" value={it.preco}
                        onChange={e => setNovoPedidoItens(prev => prev.map((x, i) => i === idx ? { ...x, preco: e.target.value } : x))}
                        style={{ ...inputStyle, flex: '1 1 80px' }} />
                      <input type="number" min="1" placeholder="Qtd" value={it.quantidade}
                        onChange={e => setNovoPedidoItens(prev => prev.map((x, i) => i === idx ? { ...x, quantidade: e.target.value } : x))}
                        style={{ ...inputStyle, flex: '0 1 60px' }} />
                      {novoPedidoItens.length > 1 && (
                        <button type="button" onClick={() => setNovoPedidoItens(prev => prev.filter((_, i) => i !== idx))}
                          style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 18, padding: '0 4px' }}>×</button>
                      )}
                    </div>
                  ))}
                </div>
                <button type="button" onClick={() => setNovoPedidoItens(prev => [...prev, { nome: '', preco: '', quantidade: '1' }])}
                  style={{ marginTop: 8, background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                  + Adicionar outro produto
                </button>
              </div>

              <div>
                <label style={labelStyle}>Status</label>
                <select value={novoPedidoStatus} onChange={e => setNovoPedidoStatus(e.target.value)} style={inputStyle}>
                  <option value="em_atendimento">Em Atendimento</option>
                  <option value="negociacao">Negociação</option>
                  <option value="pago">Pago (lança entrada no Financeiro na hora)</option>
                  <option value="cancelado">Cancelado</option>
                </select>
              </div>

              <div style={{ textAlign: 'right', fontSize: 13, color: 'var(--text-secondary, #374151)' }}>
                Total: <strong style={{ color: '#16a34a', fontSize: 16 }}>
                  R$ {brl(novoPedidoItens.reduce((s, it) => s + (parseFloat(it.preco) || 0) * (parseInt(it.quantidade, 10) || 1), 0))}
                </strong>
              </div>

              {msgPedido && <div style={{ color: '#dc2626', fontSize: 12.5 }}>{msgPedido}</div>}

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
      {/* ABA FINANCEIRO (gerente pode criar/editar, nao pode excluir) */}
      {aba === 'financeiro' && (() => {
        const totalEntradas = despesas.filter(d => d.tipo === 'entrada').reduce((s, d) => s + d.valor, 0);
        const totalSaidas = despesas.filter(d => d.tipo === 'saida').reduce((s, d) => s + d.valor, 0);
        const saldo = totalEntradas - totalSaidas;
        const porCategoria = (tipo: 'entrada' | 'saida') => {
          const m = new Map<string, number>();
          despesas.filter(d => d.tipo === tipo).forEach(d => m.set(d.categoria, (m.get(d.categoria) || 0) + d.valor));
          return [...m.entries()].sort((a, b) => b[1] - a[1]).map(([categoria, valor]) => ({ key: categoria, label: categoria, value: Math.round(valor * 100) / 100 }));
        };

        // Mesma logica do admin: cada lancamento aponta de volta pro
        // pedido/indicacao/cadastro que o gerou, pra mostrar medico/cliente
        // e produtos em vez de descricao livre, e pra juntar entrada+
        // comissao da MESMA pessoa numa linha so.
        const infoDaDespesa = (d: Despesa): { pessoaKey: string; cliente: string; indicadoPor?: string; produtos: string[] } | null => {
          const pedido = pedidos.find(p => p.despesa_id === d.id);
          if (pedido) {
            if (pedido.indicacao_id) {
              return { pessoaKey: `ind:${pedido.indicacao_id}`, cliente: pedido.paciente_nome || '', indicadoPor: pedido.cadastro_nome, produtos: pedido.itens && pedido.itens.length ? pedido.itens.map(it => it.nome) : [pedido.produto_nome] };
            }
            return { pessoaKey: `cad:${pedido.cadastro_id}`, cliente: pedido.cadastro_nome, produtos: pedido.itens && pedido.itens.length ? pedido.itens.map(it => it.nome) : [pedido.produto_nome] };
          }
          const indicacao = indicacoes.find(i => i.comissao_despesa_id === d.id);
          if (indicacao) {
            const ped = pedidos.find(p => p.indicacao_id === indicacao.id && p.status === 'pago');
            return { pessoaKey: `ind:${indicacao.id}`, cliente: `${indicacao.nome} ${indicacao.sobrenome || ''}`.trim(), indicadoPor: indicacao.medico_nome, produtos: ped ? (ped.itens && ped.itens.length ? ped.itens.map(it => it.nome) : [ped.produto_nome]) : [] };
          }
          const cadastro = lista.find(c => c.comissao_despesa_id === d.id);
          if (cadastro) {
            const ped = pedidos.find(p => p.cadastro_id === cadastro.id && !p.indicacao_id && p.status === 'pago');
            return { pessoaKey: `cad:${cadastro.id}`, cliente: `${cadastro.nome} ${cadastro.sobrenome || ''}`.trim(), indicadoPor: cadastro.indicado_por_medico_nome || undefined, produtos: ped ? (ped.itens && ped.itens.length ? ped.itens.map(it => it.nome) : [ped.produto_nome]) : [] };
          }
          return null;
        };
        const categoriasPresentesFin = [...new Set(despesas.map(d => d.categoria))].sort((a, b) => a.localeCompare(b));
        const finBuscaQ = finBusca.trim().toLowerCase();
        const despesasFiltradas = despesas.filter(d => {
          if (finFiltroTipo !== 'todos' && d.tipo !== finFiltroTipo) return false;
          if (finFiltroCategoria && d.categoria !== finFiltroCategoria) return false;
          if (!dentroPeriodo(d.data, finFiltroInicio, finFiltroFim)) return false;
          if (finBuscaQ) {
            const info = infoDaDespesa(d);
            const alvo = `${info?.cliente || ''} ${info?.indicadoPor || ''} ${info?.produtos.join(' ') || ''} ${d.categoria} ${d.descricao}`.toLowerCase();
            if (!alvo.includes(finBuscaQ)) return false;
          }
          return true;
        });
        const finFiltrosAtivos = finFiltroTipo !== 'todos' || !!finFiltroCategoria || !!finFiltroInicio || !!finFiltroFim || !!finBusca;
        const limparFiltrosFin = () => { setFinFiltroTipo('todos'); setFinFiltroCategoria(''); setFinFiltroInicio(''); setFinFiltroFim(''); setFinBusca(''); };

        type LinhaFinanceiro = { key: string; data: string; cliente: string; indicadoPor?: string; produtos: string[]; totalEntrada: number; totalSaida: number; despesasDoGrupo: Despesa[] };
        const gruposFin = new Map<string, LinhaFinanceiro>();
        despesasFiltradas.forEach(d => {
          const info = infoDaDespesa(d);
          const key = info ? info.pessoaKey : `avulsa:${d.id}`;
          let g = gruposFin.get(key);
          if (!g) {
            g = { key, data: d.data, cliente: info ? info.cliente : d.descricao, indicadoPor: info?.indicadoPor, produtos: info?.produtos || [], totalEntrada: 0, totalSaida: 0, despesasDoGrupo: [] };
            gruposFin.set(key, g);
          }
          if (d.data > g.data) g.data = d.data;
          if (info) {
            if (!g.cliente) g.cliente = info.cliente;
            if (!g.indicadoPor) g.indicadoPor = info.indicadoPor;
            info.produtos.forEach(p => { if (!g!.produtos.includes(p)) g!.produtos.push(p); });
          }
          if (d.tipo === 'entrada') g.totalEntrada += d.valor; else g.totalSaida += d.valor;
          g.despesasDoGrupo.push(d);
        });
        const linhasFin = [...gruposFin.values()].sort((a, b) => b.data.localeCompare(a.data));

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
              <StatCard label="Total Entradas" value={`R$ ${brl(totalEntradas)}`} color="#16a34a" />
              <StatCard label="Total Saídas" value={`R$ ${brl(totalSaidas)}`} color="#dc2626" />
              <StatCard label="Saldo" value={`R$ ${brl(saldo)}`} color={saldo >= 0 ? undefined : '#dc2626'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Entradas por Categoria</div>
                <HBarChart color="#16a34a" emptyLabel="Sem entradas ainda." items={porCategoria('entrada')} />
              </div>
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Saídas por Categoria</div>
                <HBarChart color="#dc2626" emptyLabel="Sem saídas ainda." items={porCategoria('saida')} />
              </div>
            </div>

            <div className="portal-split-380" style={{ display: 'grid', gap: 20, alignItems: 'start' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14, display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>TIPO</div>
                    <select value={finFiltroTipo} onChange={e => setFinFiltroTipo(e.target.value as typeof finFiltroTipo)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '7px 9px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="todos">Todos</option>
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>CATEGORIA</div>
                    <select value={finFiltroCategoria} onChange={e => setFinFiltroCategoria(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '7px 9px', fontSize: 12, fontFamily: 'inherit', maxWidth: 160, background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="">Todas</option>
                      {categoriasPresentesFin.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>DE</div>
                    <input type="date" value={finFiltroInicio} onChange={e => setFinFiltroInicio(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '7px 9px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  <div>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>ATÉ</div>
                    <input type="date" value={finFiltroFim} onChange={e => setFinFiltroFim(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '7px 9px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  <div style={{ flex: 1, minWidth: 140 }}>
                    <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>BUSCAR</div>
                    <input value={finBusca} onChange={e => setFinBusca(e.target.value)} placeholder="Cliente, produto, categoria..."
                      style={{ width: '100%', boxSizing: 'border-box', border: '1px solid var(--border)', borderRadius: 6, padding: '7px 9px', fontSize: 12, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
                  </div>
                  {finFiltrosAtivos && (
                    <button onClick={limparFiltrosFin}
                      style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '7px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                      Limpar
                    </button>
                  )}
                </div>

                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Lançamentos</div>
                {loadingDespesas ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
                ) : despesas.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum lançamento ainda.</div>
                ) : linhasFin.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum lançamento pra esse filtro.</div>
                ) : (
                  <div className="portal-table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                        {['Data', 'Médico/Cliente', 'Produtos', 'Entrada', 'Saída / Comissão', 'Ações'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {linhasFin.map(g => {
                        const unica = g.despesasDoGrupo.length === 1 ? g.despesasDoGrupo[0] : null;
                        return (
                        <tr key={g.key} style={{ borderBottom: '1px solid var(--border)' }}>
                          <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(g.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '10px 14px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                            {g.cliente || <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400 }}>{unica?.categoria}</span>}
                            {g.indicadoPor && <div style={{ fontSize: 10, color: 'var(--text-soft, #9ca3af)', fontWeight: 400 }}>indicado por {g.indicadoPor}</div>}
                          </td>
                          <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.produtos.join(', ')}>
                            {g.produtos.length > 0 ? g.produtos.join(', ') : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: g.totalEntrada > 0 ? '#16a34a' : 'var(--text-soft, #9ca3af)', whiteSpace: 'nowrap' }}>
                            {g.totalEntrada > 0 ? `R$ ${brl(g.totalEntrada)}` : '-'}
                          </td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: g.totalSaida > 0 ? '#dc2626' : 'var(--text-soft, #9ca3af)', whiteSpace: 'nowrap' }}>
                            {g.totalSaida > 0 ? `R$ ${brl(g.totalSaida)}` : '-'}
                          </td>
                          <td style={{ padding: '10px 14px' }}>
                            {unica && (
                              <button onClick={() => setEditandoDespesa(unica)}
                                style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                Editar
                              </button>
                            )}
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  </div>
                )}
                </div>
              </div>

              <div style={{ position: 'sticky', top: 24, background: 'var(--surface)', border: `1px solid ${editandoDespesa ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{editandoDespesa ? 'Editar Lançamento' : 'Novo Lançamento'}</div>
                  {editandoDespesa && <button type="button" onClick={() => setEditandoDespesa(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20 }}>-</button>}
                </div>
                {msgFinanceiro && (
                  <div style={{ marginBottom: 14, background: msgFinanceiro.startsWith('OK:') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msgFinanceiro.startsWith('OK:') ? '#86efac' : '#fecaca'}`, color: msgFinanceiro.startsWith('OK:') ? '#15803d' : '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                    {msgFinanceiro.replace(/^(OK|R):\s*/, '')}
                  </div>
                )}
                <form onSubmit={salvarDespesa} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['saida', 'entrada'] as const).map(t => {
                      const atual = editandoDespesa ? editandoDespesa.tipo : novaDespesa.tipo;
                      const cor = t === 'entrada' ? '#16a34a' : '#dc2626';
                      return (
                        <button key={t} type="button"
                          onClick={() => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, tipo: t })) : setNovaDespesa(v => ({ ...v, tipo: t }))}
                          style={{ flex: 1, background: atual === t ? cor : 'var(--surface)', color: atual === t ? '#fff' : cor, border: `1px solid ${cor}`, padding: '9px 0', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                          {t === 'entrada' ? 'Entrada' : 'Saída'}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria *</label>
                    <select value={editandoDespesa ? editandoDespesa.categoria : novaDespesa.categoria}
                      onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, categoria: e.target.value })) : setNovaDespesa(v => ({ ...v, categoria: e.target.value }))}
                      required style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', cursor: 'pointer' }}>
                      <option value="">Selecione...</option>
                      {categoriasFinanceiras.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input id="nova-cat-financeira" placeholder="Nova categoria..." style={{ flex: 1, border: '1px solid var(--border)', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => {
                        const el = document.getElementById('nova-cat-financeira') as HTMLInputElement | null;
                        if (el && el.value.trim()) { adicionarCategoriaFinanceira(el.value); el.value = ''; }
                      }} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                        + Categoria
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição *</label>
                    <input value={editandoDespesa ? editandoDespesa.descricao : novaDespesa.descricao}
                      onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, descricao: e.target.value })) : setNovaDespesa(v => ({ ...v, descricao: e.target.value }))}
                      required placeholder="Ex: Comissão vendedor, Almoço com cliente..."
                      style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor (R$) *</label>
                      <input type="number" min="0" step="0.01"
                        value={editandoDespesa ? editandoDespesa.valor : novaDespesa.valor}
                        onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, valor: parseFloat(e.target.value) || 0 })) : setNovaDespesa(v => ({ ...v, valor: e.target.value }))}
                        required placeholder="0.00"
                        style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data *</label>
                      <input type="date" value={editandoDespesa ? editandoDespesa.data : novaDespesa.data}
                        onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, data: e.target.value })) : setNovaDespesa(v => ({ ...v, data: e.target.value }))}
                        required style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    {editandoDespesa ? 'Salvar Alterações' : 'Registrar Lançamento'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ABA ESTOQUE */}
      {aba === 'estoque' && (() => {
        const pedidosPagos = pedidos.filter(p => p.status === 'pago');
        const itensVendidosTotal = pedidosPagos.flatMap(p =>
          p.itens && p.itens.length ? p.itens : [{ nome: p.produto_nome, preco: p.preco, quantidade: 1 }]
        );
        const vendidoPorId = calcularVendidoPorProduto(produtosCatalogo, itensVendidosTotal);

        const linhas = produtosCatalogo.map(p => {
          const vendido = vendidoPorId.get(p.id) || 0;
          const inicial = p.estoque_inicial ?? 0;
          const atual = inicial - vendido;
          const status: 'esgotado' | 'ok' | 'nao_configurado' = inicial <= 0 ? 'nao_configurado' : atual <= 0 ? 'esgotado' : 'ok';
          return { produto: p, vendido, atual, valorEstoque: Math.max(atual, 0) * (p.custo ?? 0), status };
        });

        const totalSkus = produtosCatalogo.length;
        const pecasEmEstoque = linhas.reduce((s, l) => s + Math.max(l.atual, 0), 0);
        const valorEstoqueTotal = linhas.reduce((s, l) => s + l.valorEstoque, 0);
        const esgotadoCount = linhas.filter(l => l.status === 'esgotado').length;
        const alertas = linhas.filter(l => l.status === 'esgotado').sort((a, b) => a.atual - b.atual);

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>Estoque</h2>
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, margin: 0 }}>
                Estoque atual calculado a partir de todo o histórico de pedidos pagos.
              </p>
            </div>

            <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{totalSkus}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total de SKUs</div>
              </div>
              <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{pecasEmEstoque}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Peças em Estoque</div>
              </div>
              <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {brl(valorEstoqueTotal)}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Valor de Estoque</div>
              </div>
              <div style={{ background: esgotadoCount > 0 ? '#dc26260d' : 'var(--surface-hover)', border: `1px solid ${esgotadoCount > 0 ? '#dc262633' : 'var(--border)'}`, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${esgotadoCount > 0 ? '#dc2626' : 'var(--text-soft, #9ca3af)'}` }}>
                <div style={{ fontSize: 26, fontWeight: 800, color: esgotadoCount > 0 ? '#dc2626' : 'var(--text)' }}>{esgotadoCount}</div>
                <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Item Esgotado</div>
              </div>
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

            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              <div className="portal-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                      {['Produto', 'Estoque Inicial', 'Vendido (histórico)', 'Estoque Atual', 'Custo Unit.', 'Valor de Venda', 'Valor de Estoque', 'Status', ''].map(h => (
                        <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {produtosCatalogo.length === 0 ? (
                      <tr><td colSpan={9} style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum produto cadastrado.</td></tr>
                    ) : produtosCatalogo.map(p => (
                      <EstoqueRow key={p.id} produto={p} vendido={vendidoPorId.get(p.id) || 0} onSalvar={salvarEstoqueProdutoPortal} />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ABA RELATÓRIOS */}
      {aba === 'relatorios' && (() => {
        const medicosOrdenados = [...lista].sort((a, b) => a.nome.localeCompare(b.nome));
        const despesaPorId = new Map(despesas.map(d => [d.id, d]));

        const pedidosPeriodo = pedidos.filter(p =>
          p.status === 'pago' &&
          dentroPeriodo(p.created_at, relFiltroInicio, relFiltroFim) &&
          (!relFiltroMedico || p.cadastro_id === relFiltroMedico)
        );

        // Comissão tem duas origens: indicação de paciente (Indicacao) e
        // médico que indicou outro médico (Cadastro.indicado_por_medico_id).
        // tipo='medico' aqui é indicação legada já migrada pra Cadastro
        // (fica só de histórico) — excluída pra não contar em dobro.
        const comissoesDeIndicacoes = indicacoes
          .filter(i => i.tipo !== 'medico' && i.comissao_paga && (!relFiltroMedico || i.medico_id === relFiltroMedico))
          .map(i => {
            const desp = i.comissao_despesa_id ? despesaPorId.get(i.comissao_despesa_id) : undefined;
            return {
              id: i.id, _data: desp?.data || i.created_at.slice(0, 10), medico_id: i.medico_id, medico_nome: i.medico_nome,
              nome: i.nome, sobrenome: i.sobrenome, tipoIndicado: 'Paciente' as const, comissao_valor: i.comissao_valor,
            };
          });
        const comissoesDeCadastros = lista
          .filter(c => c.indicado_por_medico_id && c.comissao_paga && (!relFiltroMedico || c.indicado_por_medico_id === relFiltroMedico))
          .map(c => {
            const desp = c.comissao_despesa_id ? despesaPorId.get(c.comissao_despesa_id) : undefined;
            return {
              id: c.id, _data: desp?.data || c.created_at.slice(0, 10), medico_id: c.indicado_por_medico_id as string, medico_nome: c.indicado_por_medico_nome || '',
              nome: c.nome, sobrenome: c.sobrenome, tipoIndicado: 'Médico Indicado' as const, comissao_valor: c.comissao_valor,
            };
          });
        const comissoesPeriodo = [...comissoesDeIndicacoes, ...comissoesDeCadastros]
          .filter(i => dentroPeriodo(i._data, relFiltroInicio, relFiltroFim))
          .sort((a, b) => b._data.localeCompare(a._data));

        const categoriasPresentes = [...new Set(despesas.map(d => d.categoria))].sort((a, b) => a.localeCompare(b));
        const despesasPeriodo = despesas
          .filter(d => dentroPeriodo(d.data, relFiltroInicio, relFiltroFim) && (relFiltroTipoFin === 'todos' || d.tipo === relFiltroTipoFin) && (!relFiltroCategoria || d.categoria === relFiltroCategoria))
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

        const limparFiltros = () => { setRelFiltroInicio(''); setRelFiltroFim(''); setRelFiltroMedico(''); setRelFiltroTipoFin('todos'); setRelFiltroCategoria(''); };

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
                .portal-sidenav, header, .no-print { display: none !important; }
                body { background: #fff !important; }
              }
            `}</style>

            <div>
              <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>Relatórios</h2>
              <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, margin: 0 }}>
                Faturamento, comissões e financeiro — filtre por período e médico, imprima ou baixe em CSV.
              </p>
            </div>

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

            <div className="no-print" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 16, display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>DE</div>
                <input type="date" value={relFiltroInicio} onChange={e => setRelFiltroInicio(e.target.value)}
                  style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>ATÉ</div>
                <input type="date" value={relFiltroFim} onChange={e => setRelFiltroFim(e.target.value)}
                  style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
              </div>
              {(relatorioTipo === 'faturamento' || relatorioTipo === 'medicos' || relatorioTipo === 'comissoes') && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>MÉDICO</div>
                  <select value={relFiltroMedico} onChange={e => setRelFiltroMedico(e.target.value)}
                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', maxWidth: 220, background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="">Todos os médicos</option>
                    {medicosOrdenados.map(c => <option key={c.id} value={c.id}>{c.nome} {c.sobrenome}</option>)}
                  </select>
                </div>
              )}
              {relatorioTipo === 'faturamento' && (
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>AGRUPAR POR</div>
                  <select value={relAgrupamento} onChange={e => setRelAgrupamento(e.target.value as 'dia' | 'mes')}
                    style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }}>
                    <option value="dia">Dia</option>
                    <option value="mes">Mês</option>
                  </select>
                </div>
              )}
              {relatorioTipo === 'financeiro' && (
                <>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>TIPO</div>
                    <select value={relFiltroTipoFin} onChange={e => setRelFiltroTipoFin(e.target.value as 'todos' | 'entrada' | 'saida')}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="todos">Todos</option>
                      <option value="entrada">Entrada</option>
                      <option value="saida">Saída</option>
                    </select>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', marginBottom: 4 }}>CATEGORIA</div>
                    <select value={relFiltroCategoria} onChange={e => setRelFiltroCategoria(e.target.value)}
                      style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '8px 10px', fontSize: 13, fontFamily: 'inherit', maxWidth: 200, background: 'var(--surface)', color: 'var(--text)' }}>
                      <option value="">Todas as categorias</option>
                      {categoriasPresentes.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </>
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
                    agrupadoFaturamento.map(([k, v]) => [formatPeriodoKey(k), v.qtd, brl(v.total)]));
                } else if (relatorioTipo === 'medicos') {
                  baixarCSV('faturamento-por-medico.csv', ['Médico', 'Pedidos Próprios', 'Faturamento Próprio', 'Pedidos de Indicados', 'Faturamento de Indicados', 'Comissões Pagas'],
                    agrupadoPorMedico.map(m => [m.nome, m.qtdProprio, brl(m.totalProprio), m.qtdIndicado, brl(m.totalIndicado), brl(m.comissao)]));
                } else if (relatorioTipo === 'comissoes') {
                  baixarCSV('comissoes-atribuidas.csv', ['Data', 'Médico Indicador', 'Indicado', 'Tipo', 'Valor'],
                    comissoesPeriodo.map(i => [formatData(i._data), i.medico_nome, `${i.nome} ${i.sobrenome || ''}`.trim(), i.tipoIndicado, brl((i.comissao_valor || 0))]));
                } else {
                  baixarCSV('entradas-e-saidas.csv', ['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor'],
                    despesasPeriodo.map(d => [formatData(d.data), d.tipo === 'entrada' ? 'Entrada' : 'Saída', d.categoria, d.descricao, brl(d.valor)]));
                }
              }} style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                Baixar CSV
              </button>
            </div>

            {relatorioTipo === 'faturamento' && (
              <>
                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                  <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {brl(totalFaturamento)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Faturamento Total</div>
                  </div>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{pedidosPeriodo.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Pedidos Pagos</div>
                  </div>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>R$ {brl(ticketMedio)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Ticket Médio</div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="portal-table-scroll">
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
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>R$ {brl(v.total)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {relatorioTipo === 'medicos' && (
              <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                <div className="portal-table-scroll">
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
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: m.totalProprio > 0 ? '#16a34a' : 'var(--text-soft, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>{m.totalProprio > 0 ? `R$ ${brl(m.totalProprio)}` : '-'}</td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{m.qtdIndicado || '-'}</td>
                          <td style={{ padding: '11px 14px', fontWeight: 700, color: m.totalIndicado > 0 ? '#16a34a' : 'var(--text-soft, #9ca3af)', fontVariantNumeric: 'tabular-nums' }}>{m.totalIndicado > 0 ? `R$ ${brl(m.totalIndicado)}` : '-'}</td>
                          <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', fontVariantNumeric: 'tabular-nums' }}>{m.comissao > 0 ? `R$ ${brl(m.comissao)}` : '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {relatorioTipo === 'comissoes' && (
              <>
                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                  <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {brl(totalComissoes)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total em Comissões</div>
                  </div>
                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid var(--text-soft, #9ca3af)' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: 'var(--text)' }}>{comissoesPeriodo.length}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Comissões Lançadas</div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="portal-table-scroll">
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
                              <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: i.tipoIndicado === 'Médico Indicado' ? '#f0fdf4' : 'var(--surface-hover)', color: i.tipoIndicado === 'Médico Indicado' ? '#16a34a' : 'var(--text-secondary, #374151)' }}>
                                {i.tipoIndicado}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: '#16a34a', fontVariantNumeric: 'tabular-nums' }}>R$ {brl((i.comissao_valor || 0))}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}

            {relatorioTipo === 'financeiro' && (
              <>
                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                  <div style={{ background: '#16a34a0d', border: '1px solid #16a34a33', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #16a34a' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#16a34a' }}>R$ {brl(totalEntradasFin)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total Entradas</div>
                  </div>
                  <div style={{ background: '#dc26260d', border: '1px solid #dc262633', borderRadius: 10, padding: '16px 20px', borderTop: '4px solid #dc2626' }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: '#dc2626' }}>R$ {brl(totalSaidasFin)}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Total Saídas</div>
                  </div>
                  <div style={{ background: totalEntradasFin - totalSaidasFin >= 0 ? 'var(--surface-hover)' : '#dc26260d', border: `1px solid ${totalEntradasFin - totalSaidasFin >= 0 ? 'var(--border)' : '#dc262633'}`, borderRadius: 10, padding: '16px 20px', borderTop: `4px solid ${totalEntradasFin - totalSaidasFin >= 0 ? 'var(--text-soft, #9ca3af)' : '#dc2626'}` }}>
                    <div style={{ fontSize: 26, fontWeight: 800, color: totalEntradasFin - totalSaidasFin >= 0 ? 'var(--text)' : '#dc2626' }}>R$ {brl((totalEntradasFin - totalSaidasFin))}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-muted, #6b7280)', marginTop: 4, fontWeight: 600 }}>Saldo</div>
                  </div>
                </div>
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  <div className="portal-table-scroll">
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
                            <td style={{ padding: '11px 14px', fontWeight: 700, color: d.tipo === 'entrada' ? '#16a34a' : '#dc2626', fontVariantNumeric: 'tabular-nums' }}>R$ {brl(d.valor)}</td>
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

      {/* ABA MENTORIA (somente visualizacao) */}
      {aba === 'mentoria' && (() => {
        const porMedico = new Map<string, number>();
        mentoriaCliques.forEach(c => porMedico.set(c.medico_nome, (porMedico.get(c.medico_nome) || 0) + 1));
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
              <StatCard label="Cliques totais" value={mentoriaCliques.length} />
              <StatCard label="Médicos" value={porMedico.size} />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {loadingMentoria ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
              ) : mentoriaCliques.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Ninguém clicou no card Mentoria ainda.</div>
              ) : (
                <div className="portal-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                      {['Médico', 'WhatsApp', 'E-mail', 'Quando'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mentoriaCliques.map(c => {
                      const medico = lista.find(l => l.id === c.medico_id);
                      return (
                      <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: 'var(--text)' }}>{c.medico_nome}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)' }}>{medico?.whatsapp || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)' }}>{medico?.email || '—'}</td>
                        <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{new Date(c.created_at).toLocaleString('pt-BR')}</td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ABA BLOG (criar/editar, sem excluir) */}
      {aba === 'blog' && (
        <div className="portal-split-380" style={{ display: 'grid', gap: 24, alignItems: 'start' }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>
                Blog <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, fontWeight: 400 }}>({artigos.filter(a => a.publicado).length}/{artigos.length} publicados)</span>
              </div>
            </div>
            {msgBlog && (
              <div style={{ marginBottom: 14, background: msgBlog.startsWith('OK:') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msgBlog.startsWith('OK:') ? '#86efac' : '#fecaca'}`, color: msgBlog.startsWith('OK:') ? '#15803d' : '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                {msgBlog.replace(/^(OK|R):\s*/, '')}
              </div>
            )}
            {loadingArtigos ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Carregando...</div>
            ) : artigos.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)', background: 'var(--surface-hover)', borderRadius: 12, border: '1px dashed var(--border)' }}>
                Nenhum artigo. Crie um ao lado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {artigos.map(a => (
                  <div key={a.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden', display: 'flex', opacity: a.publicado ? 1 : 0.7 }}>
                    {a.imagem ? (
                      <div style={{ width: 90, flexShrink: 0, background: 'var(--surface-hover)' }}>
                        <img src={a.imagem} alt={a.titulo} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div style={{ width: 70, flexShrink: 0, background: 'linear-gradient(135deg, #0f172a, #111827)' }} />
                    )}
                    <div style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>{a.titulo}</div>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: a.publicado ? '#dcfce7' : 'var(--surface-hover)', color: a.publicado ? '#15803d' : 'var(--text-muted, #6b7280)' }}>
                          {a.publicado ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => togglePublicarArtigo(a)}
                          style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                          {a.publicado ? 'Ocultar' : 'Publicar'}
                        </button>
                        <button onClick={() => setEditandoArtigo({ ...a })}
                          style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                          Editar
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ position: 'sticky', top: 24, background: 'var(--surface)', border: `1px solid ${editandoArtigo ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--text)' }}>{editandoArtigo ? 'Editar Artigo' : 'Novo Artigo'}</div>
              {editandoArtigo && <button type="button" onClick={() => setEditandoArtigo(null)} style={{ background: 'none', border: 'none', color: 'var(--text-muted, #6b7280)', cursor: 'pointer', fontSize: 20 }}>-</button>}
            </div>
            <form onSubmit={salvarArtigo} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título *</label>
                <input value={editandoArtigo ? editandoArtigo.titulo : novoArtigo.titulo}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, titulo: e.target.value })) : setNovoArtigo(a => ({ ...a, titulo: e.target.value }))}
                  required placeholder="Título do artigo"
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria</label>
                <select value={editandoArtigo ? (editandoArtigo.categoria || '') : novoArtigo.categoria}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, categoria: e.target.value })) : setNovoArtigo(a => ({ ...a, categoria: e.target.value }))}
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <option value="">Selecione...</option>
                  {categoriasBlog.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imagem</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={editandoArtigo ? (editandoArtigo.imagem || '') : novoArtigo.imagem}
                    onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: e.target.value })) : setNovoArtigo(a => ({ ...a, imagem: e.target.value }))}
                    placeholder="URL da imagem"
                    style={{ flex: 1, minWidth: 0, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
                  <label style={{ background: uploadandoArtigo ? 'var(--border)' : 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                    {uploadandoArtigo ? '...' : 'Enviar'}
                    <input type="file" accept="image/*" style={{ display: 'none' }} onChange={async e => {
                      const f = e.target.files?.[0]; if (!f) return;
                      await uploadImagemArtigo(f, url => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: url })) : setNovoArtigo(a => ({ ...a, imagem: url })));
                      e.target.value = '';
                    }} />
                  </label>
                </div>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conteúdo</label>
                <textarea value={editandoArtigo ? editandoArtigo.conteudo : novoArtigo.conteudo}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, conteudo: e.target.value })) : setNovoArtigo(a => ({ ...a, conteudo: e.target.value }))}
                  rows={8} placeholder="Texto do artigo..."
                  style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary, #374151)', cursor: 'pointer' }}>
                <input type="checkbox" checked={editandoArtigo ? editandoArtigo.publicado : novoArtigo.publicado}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, publicado: e.target.checked })) : setNovoArtigo(a => ({ ...a, publicado: e.target.checked }))} />
                Publicar imediatamente
              </label>
              <button type="submit" style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                {editandoArtigo ? 'Salvar Alterações' : 'Criar Artigo'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ABA LINK DE RASTREIO */}
      {aba === 'rastreio' && (() => {
        const q = buscaRastreio.trim().toLowerCase();
        const medicosEncontrados = q.length < 2 ? [] : lista
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
            <h2 style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6, marginTop: 0 }}>Link de Rastreio</h2>
            <p style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, marginBottom: 20 }}>
              Encontre o médico ou paciente, cole o link de rastreio do pedido e envie pelo WhatsApp.
            </p>

            {!rastreioSelecionado ? (
              <>
                <input value={buscaRastreio} onChange={e => setBuscaRastreio(e.target.value)}
                  placeholder="Buscar médico ou paciente por nome..." autoFocus
                  style={{ maxWidth: 420, border: '1px solid var(--border)', borderRadius: 8, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box', marginBottom: 16, display: 'block', width: '100%' }} />

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
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: 'var(--text-secondary, #374151)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Link de rastreio *</label>
                  <input value={linkRastreio} onChange={e => setLinkRastreio(e.target.value)}
                    placeholder="https://..." style={{ width: '100%', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
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

                {msgRastreio && <div style={{ color: '#dc2626', fontSize: 12 }}>{msgRastreio}</div>}

                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  <button onClick={() => baixarArteRastreio(rastreioSelecionado.nome.toLowerCase().replace(/\s+/g, '-'), rastreioSelecionado.nome, linkRastreio)}
                    disabled={!linkRastreio.trim() || baixandoArteRastreio}
                    style={{
                      background: linkRastreio.trim() ? '#16a34a' : '#e5e7eb', color: linkRastreio.trim() ? '#fff' : '#9ca3af',
                      border: 'none', padding: '11px 22px', borderRadius: 8, cursor: linkRastreio.trim() && !baixandoArteRastreio ? 'pointer' : 'not-allowed',
                      fontSize: 13, fontWeight: 700, fontFamily: 'inherit', display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                    {baixandoArteRastreio ? 'Gerando...' : '⬇ Baixar Imagem'}
                  </button>
                  <button onClick={() => { navigator.clipboard.writeText(mensagem); }}
                    disabled={!linkRastreio.trim()}
                    style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '11px 18px', borderRadius: 8, cursor: linkRastreio.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: linkRastreio.trim() ? 1 : 0.5 }}>
                    Copiar mensagem
                  </button>
                  <a href={linkRastreio.trim() && numeroWhats ? `https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}` : undefined}
                    target="_blank" rel="noreferrer"
                    onClick={e => { if (!linkRastreio.trim() || !numeroWhats) e.preventDefault(); }}
                    style={{
                      background: 'var(--surface)', color: linkRastreio.trim() && numeroWhats ? '#16a34a' : '#9ca3af',
                      border: `1px solid ${linkRastreio.trim() && numeroWhats ? '#86efac' : '#e5e7eb'}`, padding: '11px 18px', borderRadius: 8, cursor: linkRastreio.trim() && numeroWhats ? 'pointer' : 'not-allowed',
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

      {/* ABA LEADS */}
      {aba === 'leads' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'inline-flex', background: 'var(--surface-hover)', borderRadius: 8, padding: 3, gap: 2 }}>
              {(['medico', 'paciente'] as const).map(t => (
                <button key={t} type="button" onClick={() => setTipoCadastroView(t)}
                  style={{ padding: '7px 18px', borderRadius: 6, border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit', background: tipoCadastroView === t ? 'var(--btn-primary-bg)' : 'transparent', color: tipoCadastroView === t ? 'var(--btn-primary-text)' : 'var(--text-muted, #6b7280)' }}>
                  {t === 'medico' ? `Médicos (${lista.length})` : `Pacientes (${totalPacientes})`}
                </button>
              ))}
            </div>
            <button onClick={() => setNovoCadastroTipo('escolher')}
              style={{ background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 16px', borderRadius: 7, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
              + Cadastro Novo
            </button>
          </div>

          <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
            <StatCard label="Total" value={lista.length + totalPacientes} />
            <StatCard label="Médicos" value={lista.length} color="var(--text-secondary, #374151)" />
            <StatCard label="Pacientes" value={totalPacientes} />
          </div>

          {tipoCadastroView === 'medico' && (<>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['todos', `Todos (${lista.length})`], ['analise', `Analise (${emAnalise.length})`], ['pendente', `Pendentes (${pendentes.length})`], ['aprovado', 'Aprovados'], ['rejeitado', 'Rejeitados']].map(([v, l]) => (
                <button key={v} onClick={() => setFiltro(v)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filtro === v ? 700 : 500, background: filtro === v ? 'var(--btn-primary-bg)' : 'var(--surface-hover)', color: filtro === v ? 'var(--btn-primary-text)' : 'var(--text-secondary, #374151)', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <input value={buscaMedico} onChange={e => setBuscaMedico(e.target.value)}
                  placeholder="Buscar médico por nome, e-mail, WhatsApp ou CRM..."
                  style={{ flex: 1, maxWidth: 380, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
              </div>
              {todasEtiquetas.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft, #9ca3af)', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 2 }}>Etiqueta:</span>
                  <button onClick={() => setFiltroEtiqueta('todas')}
                    style={{ background: filtroEtiqueta === 'todas' ? 'var(--btn-primary-bg)' : 'var(--surface)', color: filtroEtiqueta === 'todas' ? 'var(--btn-primary-text)' : 'var(--text-secondary, #374151)', border: `1px solid ${filtroEtiqueta === 'todas' ? 'var(--btn-primary-bg)' : 'var(--border)'}`, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: filtroEtiqueta === 'todas' ? 700 : 500, fontFamily: 'inherit', fontSize: 12 }}>
                    Todas
                  </button>
                  {todasEtiquetas.map(tag => {
                    const cor = corDaEtiqueta(tag);
                    const ativo = filtroEtiqueta === tag;
                    return (
                      <button key={tag} onClick={() => setFiltroEtiqueta(ativo ? 'todas' : tag)}
                        style={{ background: ativo ? cor : `${cor}1a`, color: ativo ? '#fff' : cor, border: `1px solid ${cor}55`, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: 700, fontFamily: 'inherit', fontSize: 12 }}>
                        {tag} ({lista.filter(l => (l.tags || []).includes(tag)).length})
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="portal-table-scroll">
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                  {['Paciente', 'Status', 'Indicado por', 'Solicitacao', 'Data', 'Ações'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visivel.length === 0 && <tr><td colSpan={6} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum lead.</td></tr>}
                {visivel.map(l => {
                  return (
                    <tr key={l.id} onClick={() => setSelectedLead(l)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', background: l.solicitacao ? 'var(--surface-hover)' : 'var(--surface)' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 700, color: 'var(--text)' }}>{l.nome} {l.sobrenome}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{l.email}</div>
                        <TagsLead tags={l.tags} />
                      </td>
                      <td style={{ padding: '11px 14px' }}><Badge status={l.status} map={STATUS_COLOR} /></td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12 }} onClick={e => e.stopPropagation()}>
                        {l.indicado_por_medico_nome || '-'}
                        <ComissaoWidget id={l.id} comissaoValor={l.comissao_valor} comissaoPaga={l.comissao_paga} mostrar={!!l.indicado_por_medico_id}
                          totalBase={totalBaseForCadastro(l.id)} promptId={comissaoCadastroPromptId} setPromptId={setComissaoCadastroPromptId}
                          input={comissaoCadastroInput} setInput={setComissaoCadastroInput} onConfirmar={lancarComissaoCadastro} />
                      </td>
                      <td style={{ padding: '11px 14px' }}>
                        {l.solicitacao ? (
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.solicitacao === 'aprovar' ? '#dcfce7' : '#fef2f2', color: l.solicitacao === 'aprovar' ? '#15803d' : '#dc2626' }}>
                            Sol. {l.solicitacao === 'aprovar' ? 'Aprovacao' : 'Rejeicao'}
                          </span>
                        ) : <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, fontWeight: 600 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', fontSize: 12 }}>{formatDate(l.created_at)}</td>
                      <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                        {l.status === 'aprovado' && (
                          <button onClick={() => { setNovoPedidoTipoCliente('medico'); setNovoPedidoMedicoId(l.id); setNovoPedidoAberto(true); }}
                            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                            + Pedido
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
          </>)}

          {tipoCadastroView === 'paciente' && (() => {
            const indicacoesPacientes = indicacoes.filter(i => i.tipo !== 'medico');
            const porFiltro = filtroIndicacao === 'todos' ? indicacoesPacientes : indicacoesPacientes.filter(i => i.status === filtroIndicacao);
            const q = buscaIndicacao.trim().toLowerCase();
            const indicacoesFiltradas = !q ? porFiltro : porFiltro.filter(i =>
              `${i.medico_nome} ${i.nome} ${i.sobrenome} ${i.email || ''}`.toLowerCase().includes(q));
            return (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
                  <input value={buscaIndicacao} onChange={e => setBuscaIndicacao(e.target.value)}
                    placeholder="Buscar por médico indicador ou paciente indicado..."
                    style={{ flex: 1, maxWidth: 420, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
                </div>
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
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
                <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
                  {indicacoesFiltradas.length === 0 ? (
                    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum paciente encontrado</div>
                  ) : (
                    <div className="portal-table-scroll">
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                          {['Paciente', 'Médico Indicador', 'WhatsApp', 'Status', 'Comissão', 'Data', 'Ações'].map(h => (
                            <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {indicacoesFiltradas.map((i, idx) => (
                          <tr key={i.id} style={{ borderBottom: '1px solid var(--border)', background: idx % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                            <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 600 }}>{i.nome} {i.sobrenome}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)' }}>{i.medico_nome}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              {i.whatsapp && <a href={`https://wa.me/55${i.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', textDecoration: 'none' }}>{i.whatsapp}</a>}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <select value={i.status} onChange={e => atualizarStatusIndicacao(i, e.target.value)}
                                style={{ background: (PIPELINE_STATUS_COLOR[i.status] || {}).bg, color: (PIPELINE_STATUS_COLOR[i.status] || {}).text, border: '1px solid var(--border)', borderRadius: 6, padding: '4px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                                <option value="em_atendimento">Em Atendimento</option>
                                <option value="negociacao">Negociação</option>
                                <option value="pago">Pago</option>
                                <option value="cancelado">Cancelado</option>
                              </select>
                              <ComissaoWidget id={i.id} comissaoValor={i.comissao_valor} comissaoPaga={i.comissao_paga} totalBase={totalBaseFor(i.id)}
                                mostrar={i.status === 'pago'} promptId={comissaoPromptId} setPromptId={setComissaoPromptId}
                                input={comissaoInput} setInput={setComissaoInput} onConfirmar={lancarComissao} />
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{formatDate(i.created_at)}</td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
              <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => { setNovoPedidoTipoCliente('paciente'); setNovoPedidoIndicacaoId(i.id); setNovoPedidoAberto(true); }}
                                  style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                                  + Pedido
                                </button>
                                <button onClick={() => setEditandoIndicacao(i)} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>Editar</button>
                                <button onClick={() => excluirIndicacao(i.id, `${i.nome} ${i.sobrenome || ''}`.trim())} style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 8px', borderRadius: 5, cursor: 'pointer', fontSize: 13 }} title="Excluir">×</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    </div>
                  )}
                </div>
                {msgIndicacao && <div style={{ marginTop: 10, color: '#dc2626', fontSize: 12.5 }}>{msgIndicacao}</div>}
              </div>
            );
          })()}

              {/* Modal: novo cadastro (médico ou paciente) — wizard multi-etapa */}
              {novoCadastroTipo && (
                <div style={{ position: 'fixed', inset: 0, zIndex: 700, overflowY: 'auto', padding: '24px 16px' }}>
                  <div onClick={fecharNovoCadastro} style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)' }} />
                  <div style={{ position: 'relative', maxWidth: 560, margin: '0 auto', background: 'var(--surface)', borderRadius: 16, overflow: 'hidden', boxShadow: '0 24px 64px rgba(0,0,0,0.35)' }}>
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontWeight: 800, fontSize: 17, color: 'var(--text)' }}>
                        {novoCadastroTipo === 'escolher' ? 'Cadastro Novo' : novoCadastroTipo === 'medico' ? 'Cadastrar Médico' : 'Cadastrar Paciente'}
                      </div>
                      <button onClick={fecharNovoCadastro} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: 'var(--text-muted, #6b7280)' }}>×</button>
                    </div>

                    {novoCadastroTipo === 'escolher' && (
                      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button onClick={() => { setNovoCadastroTipo('medico'); setWizardStep(0); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 24 }}>🩺</span>
                          <span>
                            <div style={{ fontWeight: 800, color: 'var(--text-secondary, #374151)', fontSize: 14 }}>Cadastrar Médico</div>
                            <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, marginTop: 2 }}>Registrar um novo profissional diretamente</div>
                          </span>
                        </button>
                        <button onClick={() => { setNovoCadastroTipo('paciente'); setWizardStep(0); }}
                          style={{ display: 'flex', alignItems: 'center', gap: 12, textAlign: 'left', background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 10, padding: '16px 18px', cursor: 'pointer', fontFamily: 'inherit' }}>
                          <span style={{ fontSize: 24 }}>🧑</span>
                          <span>
                            <div style={{ fontWeight: 800, color: 'var(--text-secondary, #374151)', fontSize: 14 }}>Cadastrar Paciente</div>
                            <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12, marginTop: 2 }}>Registrar um paciente indicado por um médico</div>
                          </span>
                        </button>
                      </div>
                    )}

                    {novoCadastroTipo === 'medico' && (() => {
                      const steps = MEDICO_STEPS;
                      const stepKey = steps[wizardStep];
                      const produtoSel = produtosCatalogo.find(p => p.id === novoMedico.produto_id);
                      const precoTotal = produtoSel ? produtoSel.preco * (parseInt(novoMedico.quantidade, 10) || 1) : 0;
                      const descontoValor = Math.min(Math.max(0, parseFloat(novoMedico.desconto) || 0), precoTotal);
                      const valorPago = Math.max(0, precoTotal - descontoValor);
                      const cashbackPct = Math.min(Math.max(0, parseFloat(novoMedico.cashback_percentual) || 0), 100);
                      const comissaoCalc = valorPago * cashbackPct / 100;
                      const seraCortesia = precoTotal > 0 && valorPago === 0 && cashbackPct === 0;
                      const indicador = lista.find(c => c.id === novoMedico.indicado_por_medico_id);
                      const podeAvancar = stepKey === 'dados' ? !!novoMedico.nome.trim() && !!novoMedico.email.trim() && !!novoMedico.whatsapp.trim() : true;

                      return (
                        <form onSubmit={criarMedicoManual} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', gap: 4, padding: '14px 24px 0' }}>
                            {steps.map((s, i) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= wizardStep ? 'var(--btn-primary-bg)' : 'var(--surface-hover)' }} />)}
                          </div>
                          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 240 }}>

                            {stepKey === 'indicador' && (
                              <div>
                                <label style={labelStyle}>Quem indicou este médico (opcional)</label>
                                {novoMedico.indicado_por_medico_id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{indicador?.nome} {indicador?.sobrenome}</span>
                                    <button type="button" onClick={() => setNovoMedico(p => ({ ...p, indicado_por_medico_id: '' }))} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Trocar</button>
                                  </div>
                                ) : (
                                  <>
                                    <input value={buscaMedicoIndicador} onChange={e => setBuscaMedicoIndicador(e.target.value)} placeholder="Buscar médico aprovado por nome..." style={inputStyle} />
                                    {buscaMedicoIndicador.trim().length >= 2 && (
                                      <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                                        {lista.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoIndicador.trim().toLowerCase())).slice(0, 8).map(c => (
                                          <div key={c.id} onClick={() => { setNovoMedico(p => ({ ...p, indicado_por_medico_id: c.id })); setBuscaMedicoIndicador(''); }} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</span>
                                            {c.crm && <span style={{ color: 'var(--text-muted, #6b7280)' }}> · {c.crm}</span>}
                                          </div>
                                        ))}
                                        {lista.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoIndicador.trim().toLowerCase())).length === 0 && (
                                          <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Nenhum médico aprovado encontrado.</div>
                                        )}
                                      </div>
                                    )}
                                    <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 6 }}>Se este médico entrou direto (sem indicação), pode deixar em branco e avançar.</div>
                                  </>
                                )}
                              </div>
                            )}

                            {stepKey === 'dados' && (
                              <>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>Nome *</label><input value={novoMedico.nome} onChange={e => setNovoMedico(p => ({ ...p, nome: e.target.value }))} required style={inputStyle} /></div>
                                  <div><label style={labelStyle}>Sobrenome</label><input value={novoMedico.sobrenome} onChange={e => setNovoMedico(p => ({ ...p, sobrenome: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                <div><label style={labelStyle}>E-mail *</label><input type="email" value={novoMedico.email} onChange={e => setNovoMedico(p => ({ ...p, email: e.target.value }))} required style={inputStyle} /></div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>WhatsApp *</label><input value={novoMedico.whatsapp} onChange={e => setNovoMedico(p => ({ ...p, whatsapp: e.target.value }))} required style={inputStyle} /></div>
                                  <div><label style={labelStyle}>CRM</label><input value={novoMedico.crm} onChange={e => setNovoMedico(p => ({ ...p, crm: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>CPF</label><input value={novoMedico.cpf} onChange={e => setNovoMedico(p => ({ ...p, cpf: e.target.value }))} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>RG</label><input value={novoMedico.rg} onChange={e => setNovoMedico(p => ({ ...p, rg: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                <div><label style={labelStyle}>Endereço</label><input value={novoMedico.endereco} onChange={e => setNovoMedico(p => ({ ...p, endereco: e.target.value }))} style={inputStyle} /></div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>Cidade</label><input value={novoMedico.cidade} onChange={e => setNovoMedico(p => ({ ...p, cidade: e.target.value }))} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>Estado (UF)</label><input value={novoMedico.estado} onChange={e => setNovoMedico(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} style={inputStyle} /></div>
                                </div>
                                <div>
                                  <label style={labelStyle}>Onde Conheceu</label>
                                  <select value={novoMedico.onde_conheceu} onChange={e => setNovoMedico(p => ({ ...p, onde_conheceu: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                                    <option value="">Selecione...</option>
                                    {['Convidado pela PeptideZ Health', 'Pós Graduação LR', 'Indicação de Médico', 'Mentoria ICS', 'Blog da PeptideZ Health', 'Outro'].map(o => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                </div>
                              </>
                            )}

                            {stepKey === 'produto' && (
                              <>
                                <div>
                                  <label style={labelStyle}>Produto (pedido do médico) — opcional</label>
                                  <select value={novoMedico.produto_id} onChange={e => setNovoMedico(p => ({ ...p, produto_id: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                                    <option value="">Nenhum pedido agora</option>
                                    {produtosCatalogo.map(p => <option key={p.id} value={p.id}>{p.nome} — R$ {brl(p.preco)}</option>)}
                                  </select>
                                </div>
                                {novoMedico.produto_id && (
                                  <>
                                    <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                      <div><label style={labelStyle}>Quantidade</label><input type="number" min="1" value={novoMedico.quantidade} onChange={e => setNovoMedico(p => ({ ...p, quantidade: e.target.value }))} style={inputStyle} /></div>
                                      <div><label style={labelStyle}>Desconto (R$)</label><input type="number" min="0" step="0.01" value={novoMedico.desconto} onChange={e => setNovoMedico(p => ({ ...p, desconto: e.target.value }))} style={inputStyle} /></div>
                                    </div>
                                    <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                                      <span style={{ color: 'var(--text-secondary, #374151)' }}>Valor do pedido</span>
                                      <span style={{ color: '#16a34a' }}>R$ {brl(valorPago)}</span>
                                    </div>
                                  </>
                                )}
                              </>
                            )}

                            {stepKey === 'comprovante' && (
                              <div>
                                <label style={labelStyle}>Comprovante de Pagamento</label>
                                {!novoMedico.produto_id ? (
                                  <div style={{ fontSize: 12, color: 'var(--text-soft, #9ca3af)' }}>Sem pedido nesta etapa — não há pagamento a comprovar.</div>
                                ) : novoMedico.comprovante_pagamento ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                                    <a href={novoMedico.comprovante_pagamento} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#15803d', fontWeight: 700 }}>Ver comprovante anexado</a>
                                    <button type="button" onClick={() => setNovoMedico(p => ({ ...p, comprovante_pagamento: '' }))} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Remover</button>
                                  </div>
                                ) : (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                                    {uploadandoWizard === 'medico-comprovante' ? 'Enviando...' : 'Anexar comprovante'}
                                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadWizardFile('medico-comprovante', f, url => setNovoMedico(p => ({ ...p, comprovante_pagamento: url }))); e.target.value = ''; }} />
                                  </label>
                                )}
                                {!!novoMedico.produto_id && <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 6 }}>Se anexar agora, o pedido já nasce como Pago e lança a entrada no Financeiro.</div>}
                              </div>
                            )}

                            {stepKey === 'documentos' && (
                              <div>
                                <label style={labelStyle}>Documentos</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {novoMedico.documentos.map((url, idx) => (
                                    <div key={url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-hover)', borderRadius: 8, padding: '7px 12px' }}>
                                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--text-secondary, #374151)' }}>Documento {idx + 1}</a>
                                      <button type="button" onClick={() => setNovoMedico(p => ({ ...p, documentos: p.documentos.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                                    </div>
                                  ))}
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                                  {uploadandoWizard === 'medico-documento' ? 'Enviando...' : '+ Anexar documento'}
                                  <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadWizardFile('medico-documento', f, url => setNovoMedico(p => ({ ...p, documentos: [...p.documentos, url] }))); e.target.value = ''; }} />
                                </label>
                              </div>
                            )}

                            {stepKey === 'cashback' && (
                              <div>
                                <label style={labelStyle}>Cashback (%) para {indicador ? `${indicador.nome} ${indicador.sobrenome || ''}`.trim() : '—'}</label>
                                {!novoMedico.indicado_por_medico_id ? (
                                  <div style={{ fontSize: 12, color: 'var(--text-soft, #9ca3af)' }}>Sem indicador nesta etapa — não há a quem pagar cashback.</div>
                                ) : !novoMedico.produto_id ? (
                                  <div style={{ fontSize: 12, color: 'var(--text-soft, #9ca3af)' }}>Sem pedido nesta etapa — não há base para calcular cashback.</div>
                                ) : (
                                  <>
                                    <input type="number" min="0" max="100" step="0.1" value={novoMedico.cashback_percentual} onChange={e => setNovoMedico(p => ({ ...p, cashback_percentual: e.target.value }))} style={inputStyle} />
                                    <div style={{ marginTop: 8, fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>= R$ {brl(comissaoCalc)}</div>
                                  </>
                                )}
                                {seraCortesia && (
                                  <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                                    Sem valor pago e sem cashback — este pedido será registrado como Cortesia.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => wizardStep === 0 ? (setNovoCadastroTipo('escolher')) : setWizardStep(s => s - 1)} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                              Voltar
                            </button>
                            {wizardStep < steps.length - 1 ? (
                              <button type="button" disabled={!podeAvancar} onClick={() => setWizardStep(s => s + 1)} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: podeAvancar ? 'pointer' : 'default', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: podeAvancar ? 1 : 0.5 }}>
                                Avançar
                              </button>
                            ) : (
                              <button type="submit" disabled={salvandoNovoCadastro} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoNovoCadastro ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: salvandoNovoCadastro ? 0.6 : 1 }}>
                                {salvandoNovoCadastro ? 'Salvando...' : 'Cadastrar Médico'}
                              </button>
                            )}
                          </div>
                        </form>
                      );
                    })()}

                    {novoCadastroTipo === 'paciente' && (() => {
                      const steps = PACIENTE_STEPS;
                      const stepKey = steps[wizardStep];
                      const produtoSel = produtosCatalogo.find(p => p.id === novoPaciente.produto_id);
                      const precoTotal = produtoSel ? produtoSel.preco * (parseInt(novoPaciente.quantidade, 10) || 1) : 0;
                      const descontoValor = Math.min(Math.max(0, parseFloat(novoPaciente.desconto) || 0), precoTotal);
                      const valorPago = Math.max(0, precoTotal - descontoValor);
                      const cashbackPct = Math.min(Math.max(0, parseFloat(novoPaciente.cashback_percentual) || 0), 100);
                      const comissaoCalc = valorPago * cashbackPct / 100;
                      const seraCortesia = precoTotal > 0 && valorPago === 0 && cashbackPct === 0;
                      const medicoIndicador = lista.find(c => c.id === novoPaciente.medico_id);
                      const podeAvancar =
                        stepKey === 'indicador' ? !!novoPaciente.medico_id :
                        stepKey === 'dados' ? !!novoPaciente.nome.trim() && !!novoPaciente.whatsapp.trim() :
                        stepKey === 'produto' ? !!novoPaciente.produto_id :
                        true;

                      return (
                        <form onSubmit={criarPacienteManual} style={{ display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', gap: 4, padding: '14px 24px 0' }}>
                            {steps.map((s, i) => <div key={s} style={{ flex: 1, height: 4, borderRadius: 2, background: i <= wizardStep ? 'var(--btn-primary-bg)' : 'var(--surface-hover)' }} />)}
                          </div>
                          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14, minHeight: 240 }}>

                            {stepKey === 'indicador' && (
                              <div>
                                <label style={labelStyle}>Quem indicou (médico) *</label>
                                {novoPaciente.medico_id ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                                    <span style={{ fontSize: 13, fontWeight: 700, color: '#15803d' }}>{medicoIndicador?.nome} {medicoIndicador?.sobrenome}</span>
                                    <button type="button" onClick={() => setNovoPaciente(p => ({ ...p, medico_id: '' }))} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Trocar</button>
                                  </div>
                                ) : (
                                  <>
                                    <input value={buscaMedicoIndicador} onChange={e => setBuscaMedicoIndicador(e.target.value)} placeholder="Buscar médico aprovado por nome..." style={inputStyle} />
                                    <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 4 }}>Clique no nome do médico na lista para selecionar.</div>
                                    {buscaMedicoIndicador.trim().length >= 2 && (
                                      <div style={{ marginTop: 6, border: '1px solid var(--border)', borderRadius: 8, maxHeight: 160, overflowY: 'auto' }}>
                                        {lista.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoIndicador.trim().toLowerCase())).slice(0, 8).map(c => (
                                          <div key={c.id} onClick={() => { setNovoPaciente(p => ({ ...p, medico_id: c.id })); setBuscaMedicoIndicador(''); }} style={{ padding: '9px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid var(--border)' }}>
                                            <span style={{ fontWeight: 700, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</span>
                                            {c.crm && <span style={{ color: 'var(--text-muted, #6b7280)' }}> · {c.crm}</span>}
                                          </div>
                                        ))}
                                        {lista.filter(c => c.status === 'aprovado' && `${c.nome} ${c.sobrenome || ''}`.toLowerCase().includes(buscaMedicoIndicador.trim().toLowerCase())).length === 0 && (
                                          <div style={{ padding: '9px 12px', fontSize: 12, color: 'var(--text-muted, #6b7280)' }}>Nenhum médico aprovado encontrado.</div>
                                        )}
                                      </div>
                                    )}
                                  </>
                                )}
                              </div>
                            )}

                            {stepKey === 'receita' && (
                              <div>
                                <label style={labelStyle}>Receita Médica</label>
                                {novoPaciente.receita ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                                    <a href={novoPaciente.receita} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#15803d', fontWeight: 700 }}>Ver receita anexada</a>
                                    <button type="button" onClick={() => setNovoPaciente(p => ({ ...p, receita: '' }))} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Remover</button>
                                  </div>
                                ) : (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                                    {uploadandoWizard === 'paciente-receita' ? 'Enviando...' : 'Anexar receita'}
                                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadWizardFile('paciente-receita', f, url => setNovoPaciente(p => ({ ...p, receita: url }))); e.target.value = ''; }} />
                                  </label>
                                )}
                              </div>
                            )}

                            {stepKey === 'dados' && (
                              <>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>Nome *</label><input value={novoPaciente.nome} onChange={e => setNovoPaciente(p => ({ ...p, nome: e.target.value }))} required style={inputStyle} /></div>
                                  <div><label style={labelStyle}>Sobrenome</label><input value={novoPaciente.sobrenome} onChange={e => setNovoPaciente(p => ({ ...p, sobrenome: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>WhatsApp *</label><input value={novoPaciente.whatsapp} onChange={e => setNovoPaciente(p => ({ ...p, whatsapp: e.target.value }))} required style={inputStyle} /></div>
                                  <div><label style={labelStyle}>E-mail</label><input type="email" value={novoPaciente.email} onChange={e => setNovoPaciente(p => ({ ...p, email: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>CPF</label><input value={novoPaciente.cpf} onChange={e => setNovoPaciente(p => ({ ...p, cpf: e.target.value }))} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>RG</label><input value={novoPaciente.rg} onChange={e => setNovoPaciente(p => ({ ...p, rg: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                <div><label style={labelStyle}>Endereço</label><input value={novoPaciente.endereco} onChange={e => setNovoPaciente(p => ({ ...p, endereco: e.target.value }))} style={inputStyle} /></div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>Cidade</label><input value={novoPaciente.cidade} onChange={e => setNovoPaciente(p => ({ ...p, cidade: e.target.value }))} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>Estado (UF)</label><input value={novoPaciente.estado} onChange={e => setNovoPaciente(p => ({ ...p, estado: e.target.value.toUpperCase().slice(0, 2) }))} maxLength={2} style={inputStyle} /></div>
                                </div>
                              </>
                            )}

                            {stepKey === 'produto' && (
                              <>
                                <div>
                                  <label style={labelStyle}>Produto (pedido) *</label>
                                  <select value={novoPaciente.produto_id} onChange={e => setNovoPaciente(p => ({ ...p, produto_id: e.target.value }))} required style={{ ...inputStyle, cursor: 'pointer' }}>
                                    <option value="">Selecione o produto...</option>
                                    {produtosCatalogo.map(p => <option key={p.id} value={p.id}>{p.nome} — R$ {brl(p.preco)}</option>)}
                                  </select>
                                </div>
                                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                                  <div><label style={labelStyle}>Quantidade</label><input type="number" min="1" value={novoPaciente.quantidade} onChange={e => setNovoPaciente(p => ({ ...p, quantidade: e.target.value }))} style={inputStyle} /></div>
                                  <div><label style={labelStyle}>Desconto (R$)</label><input type="number" min="0" step="0.01" value={novoPaciente.desconto} onChange={e => setNovoPaciente(p => ({ ...p, desconto: e.target.value }))} style={inputStyle} /></div>
                                </div>
                                {novoPaciente.produto_id && (
                                  <div style={{ background: 'var(--surface-hover)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', display: 'flex', justifyContent: 'space-between', fontSize: 13, fontWeight: 700 }}>
                                    <span style={{ color: 'var(--text-secondary, #374151)' }}>Valor do pedido</span>
                                    <span style={{ color: '#16a34a' }}>R$ {brl(valorPago)}</span>
                                  </div>
                                )}
                              </>
                            )}

                            {stepKey === 'comprovante' && (
                              <div>
                                <label style={labelStyle}>Comprovante de Pagamento</label>
                                {novoPaciente.comprovante_pagamento ? (
                                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '9px 12px' }}>
                                    <a href={novoPaciente.comprovante_pagamento} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: '#15803d', fontWeight: 700 }}>Ver comprovante anexado</a>
                                    <button type="button" onClick={() => setNovoPaciente(p => ({ ...p, comprovante_pagamento: '' }))} style={{ background: 'none', border: 'none', color: '#15803d', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Remover</button>
                                  </div>
                                ) : (
                                  <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                                    {uploadandoWizard === 'paciente-comprovante' ? 'Enviando...' : 'Anexar comprovante'}
                                    <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadWizardFile('paciente-comprovante', f, url => setNovoPaciente(p => ({ ...p, comprovante_pagamento: url }))); e.target.value = ''; }} />
                                  </label>
                                )}
                                <div style={{ fontSize: 11, color: 'var(--text-soft, #9ca3af)', marginTop: 6 }}>Se anexar agora, o pedido já nasce como Pago e lança a entrada no Financeiro.</div>
                              </div>
                            )}

                            {stepKey === 'documentos' && (
                              <div>
                                <label style={labelStyle}>Documentos</label>
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                                  {novoPaciente.documentos.map((url, idx) => (
                                    <div key={url} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'var(--surface-hover)', borderRadius: 8, padding: '7px 12px' }}>
                                      <a href={url} target="_blank" rel="noreferrer" style={{ fontSize: 12.5, color: 'var(--text-secondary, #374151)' }}>Documento {idx + 1}</a>
                                      <button type="button" onClick={() => setNovoPaciente(p => ({ ...p, documentos: p.documentos.filter((_, i) => i !== idx) }))} style={{ background: 'none', border: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 16, lineHeight: 1 }}>×</button>
                                    </div>
                                  ))}
                                </div>
                                <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 8, background: 'var(--surface-hover)', border: '1px dashed var(--border)', borderRadius: 8, padding: '10px 14px', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, color: 'var(--text-secondary, #374151)' }}>
                                  {uploadandoWizard === 'paciente-documento' ? 'Enviando...' : '+ Anexar documento'}
                                  <input type="file" accept="image/*,.pdf" style={{ display: 'none' }} onChange={async e => { const f = e.target.files?.[0]; if (f) await uploadWizardFile('paciente-documento', f, url => setNovoPaciente(p => ({ ...p, documentos: [...p.documentos, url] }))); e.target.value = ''; }} />
                                </label>
                              </div>
                            )}

                            {stepKey === 'cashback' && (
                              <div>
                                <label style={labelStyle}>Cashback (%) para {medicoIndicador ? `${medicoIndicador.nome} ${medicoIndicador.sobrenome || ''}`.trim() : 'o médico'}</label>
                                <input type="number" min="0" max="100" step="0.1" value={novoPaciente.cashback_percentual} onChange={e => setNovoPaciente(p => ({ ...p, cashback_percentual: e.target.value }))} style={inputStyle} />
                                <div style={{ marginTop: 8, fontSize: 12.5, color: '#16a34a', fontWeight: 700 }}>= R$ {brl(comissaoCalc)}</div>
                                {seraCortesia && (
                                  <div style={{ marginTop: 10, background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '9px 12px', fontSize: 12, color: '#92400e', fontWeight: 600 }}>
                                    Sem valor pago e sem cashback — este pedido será registrado como Cortesia.
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                            <button type="button" onClick={() => wizardStep === 0 ? (setNovoCadastroTipo('escolher')) : setWizardStep(s => s - 1)} style={{ background: 'var(--surface)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '9px 18px', borderRadius: 6, cursor: 'pointer', fontWeight: 600, fontSize: 13, fontFamily: 'inherit' }}>
                              Voltar
                            </button>
                            {wizardStep < steps.length - 1 ? (
                              <button type="button" disabled={!podeAvancar} onClick={() => setWizardStep(s => s + 1)} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: podeAvancar ? 'pointer' : 'default', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: podeAvancar ? 1 : 0.5 }}>
                                Avançar
                              </button>
                            ) : (
                              <button type="submit" disabled={salvandoNovoCadastro} style={{ flex: 1, background: 'var(--btn-primary-bg)', color: 'var(--btn-primary-text)', border: 'none', padding: '9px 20px', borderRadius: 6, cursor: salvandoNovoCadastro ? 'default' : 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', opacity: salvandoNovoCadastro ? 0.6 : 1 }}>
                                {salvandoNovoCadastro ? 'Salvando...' : 'Cadastrar Paciente'}
                              </button>
                            )}
                          </div>
                        </form>
                      );
                    })()}
                  </div>
                </div>
              )}
        </div>
      )}

      {/* ABA CLIENTES — lista por PESSOA que efetivamente comprou (médico
          pra si mesmo, ou paciente indicado), cada um com seu checklist do
          que falta pra fechar o pedido (espelha o admin). */}
      {aba === 'clientes' && (() => {
        type ClienteLinha = {
          key: string; tipo: 'medico' | 'paciente'; nome: string; whatsapp: string; email: string;
          cidade?: string | null; estado?: string | null; indicadoPor?: string;
          pedidosPessoa: Pedido[]; pendencias: string[];
        };

        const medicosClientes: ClienteLinha[] = lista
          .filter(c => pedidos.some(p => p.cadastro_id === c.id && !p.indicacao_id && p.status === 'pago'))
          .map(c => {
            const pendencias: string[] = [];
            if (!(c.documentos || []).length) pendencias.push('Documentos');
            return {
              key: `medico-${c.id}`, tipo: 'medico', nome: `${c.nome} ${c.sobrenome || ''}`.trim(),
              whatsapp: c.whatsapp, email: c.email, cidade: null, estado: null,
              pedidosPessoa: pedidos.filter(p => p.cadastro_id === c.id && !p.indicacao_id),
              pendencias,
            };
          });

        const pacientesClientes: ClienteLinha[] = indicacoes
          .filter(i => i.tipo !== 'medico' && pedidos.some(p => p.indicacao_id === i.id && p.status === 'pago'))
          .map(i => {
            const pendencias: string[] = [];
            if (!(i.documentos || []).length) pendencias.push('Documentos');
            return {
              key: `paciente-${i.id}`, tipo: 'paciente', nome: `${i.nome} ${i.sobrenome || ''}`.trim(),
              whatsapp: i.whatsapp, email: i.email, cidade: null, estado: null, indicadoPor: i.medico_nome,
              pedidosPessoa: pedidos.filter(p => p.indicacao_id === i.id),
              pendencias,
            };
          });

        const todosClientes = [...medicosClientes, ...pacientesClientes];
        const q = buscaCliente.trim().toLowerCase();
        const clientesFiltrados = !q ? todosClientes : todosClientes.filter(c =>
          `${c.nome} ${c.email} ${c.whatsapp}`.toLowerCase().includes(q));

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Clientes <span style={{ color: 'var(--text-muted, #6b7280)', fontWeight: 400 }}>({todosClientes.length})</span>
              </div>
              <input value={buscaCliente} onChange={e => setBuscaCliente(e.target.value)}
                placeholder="Buscar cliente por nome, e-mail ou WhatsApp..."
                style={{ maxWidth: 380, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: 'var(--text)', background: 'var(--surface)', boxSizing: 'border-box' }} />
            </div>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
              {clientesFiltrados.length === 0 ? (
                <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>
                  {todosClientes.length === 0 ? 'Nenhum cliente ainda. Uma pessoa vira cliente automaticamente quando um pedido dela é marcado como pago.' : 'Nenhum cliente encontrado para essa busca.'}
                </div>
              ) : (
                <div className="portal-table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface-hover)' }}>
                        {['Nome', 'Tipo', 'WhatsApp', 'E-mail', 'Total Gasto', 'Produtos Comprados', 'Pendências', 'Último Pedido'].map(h => (
                          <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {clientesFiltrados.map((c, i) => {
                        const pedidosPagos = c.pedidosPessoa.filter(p => p.status === 'pago');
                        const totalGasto = pedidosPagos.reduce((s, p) => s + p.preco, 0);
                        const produtosComprados = Array.from(new Set(pedidosPagos.map(p => p.produto_nome)));
                        const ultimoPedido = c.pedidosPessoa.length > 0
                          ? [...c.pedidosPessoa].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
                          : null;
                        return (
                          <tr key={c.key} style={{ borderBottom: '1px solid var(--border)', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface-hover)' }}>
                            <td style={{ padding: '11px 14px', color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap' }}>
                              {c.nome}
                              {c.indicadoPor && <div style={{ fontSize: 10.5, color: 'var(--text-soft, #9ca3af)', fontWeight: 400 }}>indicado por {c.indicadoPor}</div>}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 20, background: c.tipo === 'medico' ? 'var(--surface-hover)' : '#eff6ff', color: c.tipo === 'medico' ? 'var(--text-secondary, #374151)' : '#1d4ed8' }}>
                                {c.tipo === 'medico' ? 'Médico' : 'Paciente'}
                              </span>
                            </td>
                            <td style={{ padding: '11px 14px', whiteSpace: 'nowrap' }}>
                              {c.whatsapp && <a href={`https://wa.me/55${c.whatsapp.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" style={{ color: '#16a34a', textDecoration: 'none' }}>{c.whatsapp}</a>}
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)' }}>{c.email || '-'}</td>
                            <td style={{ padding: '11px 14px', color: '#16a34a', fontWeight: 800 }}>R$ {brl(totalGasto)}</td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={produtosComprados.join(', ')}>
                              {produtosComprados.length > 0 ? produtosComprados.join(', ') : '-'}
                            </td>
                            <td style={{ padding: '11px 14px' }}>
                              {c.pendencias.length === 0 ? (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#16a34a' }}>OK Completo</span>
                              ) : (
                                <span style={{ fontSize: 11, fontWeight: 700, color: '#dc2626' }} title={c.pendencias.join(', ')}>Faltando: {c.pendencias.join(', ')}</span>
                              )}
                            </td>
                            <td style={{ padding: '11px 14px', color: 'var(--text-muted, #6b7280)', whiteSpace: 'nowrap', fontSize: 12 }}>
                              {ultimoPedido ? formatDate(ultimoPedido.created_at) : '-'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
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
                {membro.cargo === 'superadmin' && (
                  <button onClick={() => { excluirIndicacao(i.id, `${i.nome} ${i.sobrenome}`); setEditandoIndicacao(null); }}
                    style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12.5, fontFamily: 'inherit' }}>
                    Excluir
                  </button>
                )}
              </div>

              <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 14 }}>
                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Nome</label>
                    <input value={i.nome} onChange={e => setEditandoIndicacao(v => v && { ...v, nome: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Sobrenome</label>
                    <input value={i.sobrenome || ''} onChange={e => setEditandoIndicacao(v => v && { ...v, sobrenome: e.target.value })} style={inputStyle} />
                  </div>
                </div>
                <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
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

      </div>
    </div>
  );
}


/* =========================================================
   MAIN PORTAL
   ========================================================= */
export default function PortalClient({ membro, leads, equipe, token, logo }: Props) {
  const router = useRouter();
  const cargo = membro.cargo;
  const cc = CARGO_COLOR[cargo] || { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' };

  const [tema, setTema] = useState<'light' | 'dark'>('light');
  useEffect(() => {
    const salvo = typeof window !== 'undefined' ? localStorage.getItem('portal_tema') : null;
    if (salvo === 'dark' || salvo === 'light') setTema(salvo);
  }, []);
  const alternarTema = () => {
    const novo = tema === 'light' ? 'dark' : 'light';
    setTema(novo);
    localStorage.setItem('portal_tema', novo);
  };

  useEffect(() => {
    const enviar = () => fetch('/api/portal/heartbeat', { method: 'POST', headers: { 'x-member-token': token } }).catch(() => {});
    enviar();
    const id = setInterval(enviar, 45000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div className="admin-root" data-theme={tema} style={{ minHeight: '100vh', background: 'var(--bg)' }}>
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
        .portal-header { padding: 14px 28px; }
        @media (max-width: 480px) { .portal-header { padding: 10px 14px; } }

        .portal-main { padding: 32px 24px; }
        @media (max-width: 480px) { .portal-main { padding: 16px 14px; } }

        .portal-shell { display: flex; flex-direction: row; gap: 20px; align-items: flex-start; }
        .portal-sidenav { width: 180px; flex-direction: column; position: sticky; top: 20px; }
        @media (max-width: 760px) {
          .portal-shell { flex-direction: column; }
          .portal-sidenav { width: 100%; flex-direction: row; flex-wrap: wrap; position: static; gap: 6px; }
        }
        .portal-navitem { width: 100%; }
        .portal-navitem:hover { background: var(--surface-hover) !important; }
        @media (max-width: 760px) { .portal-navitem { width: auto; white-space: nowrap; } }

        .portal-grid-auto { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
        .portal-table-scroll { overflow-x: auto; }
        .portal-split-380 { grid-template-columns: 1fr 380px; }
        @media (max-width: 900px) { .portal-split-380 { grid-template-columns: 1fr; } }
        .admin-theme-toggle:hover { background: var(--surface-hover) !important; }
      `}</style>
      <header className="portal-header" style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, boxShadow: 'var(--shadow-header)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
            alt="PeptideZ" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
          <span style={{ background: cc.bg, color: cc.text, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {CARGO_LABEL[cargo] || cargo}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Ola, <strong style={{ color: 'var(--text)' }}>{membro.nome.split(' ')[0]}</strong></span>
          <button onClick={alternarTema} className="admin-theme-toggle" title={tema === 'light' ? 'Modo escuro' : 'Modo claro'}
            style={{ background: 'var(--surface-hover)', color: 'var(--text-muted)', border: '1px solid var(--border)', width: 32, height: 32, borderRadius: 6, cursor: 'pointer', fontFamily: 'inherit', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {tema === 'light' ? '🌙' : '☀️'}
          </button>
          <button onClick={() => router.push('/equipe/login')}
            style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            Sair
          </button>
        </div>
      </header>

      <main className="portal-main" style={{ maxWidth: 1200, margin: '0 auto' }}>
        {cargo === 'gerente' && <GerenteView membro={membro} leads={leads} equipe={equipe} token={token} logo={logo} />}
        {cargo === 'superadmin' && <GerenteView membro={membro} leads={leads} equipe={equipe} token={token} logo={logo} />}
      </main>
    </div>
  );
}
