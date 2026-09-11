'use client';
import { useState } from 'react';
import { estaOnline, HBarChart, LeadsChart30d, FaturamentoChart30d } from './DashboardCharts';
import { brl } from '@/lib/format';
import { calcularVendidoPorProduto } from '@/lib/estoque';

export type DashCadastro = {
  id: string; nome: string; sobrenome: string; status: string; onde_conheceu: string | null;
  crm?: string | null; created_at: string; updated_at?: string; vendedor_id?: string | null;
  last_seen_loja?: string | null; last_seen_blog?: string | null;
  indicado_por_medico_id?: string | null; comissao_valor?: number | null; comissao_paga?: boolean; comissao_despesa_id?: string | null;
};
export type DashPedidoItem = { nome: string; preco: number; quantidade: number; cortesia?: boolean };
export type DashPedido = { id: string; cadastro_id?: string; cadastro_nome: string; cadastro_email: string; indicacao_id?: string | null; paciente_nome?: string; produto_nome: string; preco: number; itens?: DashPedidoItem[]; status: string; created_at: string; };
export type DashMembro = { id: string; nome: string; cargo: string; ativo: boolean; };
export type DashProduto = { id: string; nome: string; preco?: number; views?: number; views_hoje?: number; cart_adds?: number; estoque_inicial?: number; estoque_minimo?: number; custo?: number; };
export type DashConfig = {
  emails_enviados_hoje?: number; limite_emails_dia?: number;
  emails_enviados_mes?: number; limite_emails_mes?: number;
  cliques_cards?: Record<string, number>; cliques_cards_hoje?: Record<string, number>;
};
export type DashDespesa = { id: string; tipo: 'entrada' | 'saida'; categoria: string; valor: number; data: string; };
export type DashIndicacao = {
  id: string; medico_id: string; medico_nome: string; status: string; tipo?: 'paciente' | 'medico'; created_at: string;
  comissao_valor?: number | null; comissao_paga?: boolean; comissao_despesa_id?: string | null;
};

const PIPELINE_STATUS_LABEL: Record<string, string> = {
  em_atendimento: 'Em Atendimento', negociacao: 'Negociação', pago: 'Pago', cancelado: 'Cancelado',
};
const PIPELINE_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  em_atendimento: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
  negociacao: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
  pago: { bg: '#dcfce7', text: '#15803d' },
  cancelado: { bg: '#fef2f2', text: '#dc2626' },
};

const CARDS_INICIO: { key: string; label: string }[] = [
  { key: 'loja', label: 'Loja Completa' },
  { key: 'blog', label: 'Blog Especializado' },
  { key: 'indicar', label: 'Indicar Paciente' },
  { key: 'indicar_medico', label: 'Indicar Médico' },
  { key: 'suporte', label: 'Suporte' },
  { key: 'mentoria', label: 'Mentoria Sobre Peptídeos' },
];

const SEMANTIC_COLORS = new Set(['#16a34a', '#dc2626', '#d97706', '#b45309']);

function KpiCard({ label, value, sub, color, live, size = 26 }: {
  label: string; value: string | number; sub?: string; color?: string; live?: boolean; size?: number;
}) {
  const semantic = !!color && SEMANTIC_COLORS.has(color);
  const muted = color === '#6b7280';
  const bg = semantic ? `${color}0d` : 'var(--surface-hover)';
  const border = semantic ? `1px solid ${color}33` : '1px solid var(--border)';
  const borderTop = semantic ? `4px solid ${color}` : '4px solid var(--text-soft, #9ca3af)';
  const textColor = semantic ? color : muted ? 'var(--text-muted, #6b7280)' : 'var(--text)';
  return (
    <div style={{ background: bg, border, borderRadius: 12, padding: '18px 20px', borderTop, position: 'relative' }}>
      {live && (
        <span style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px #16a34a33' }} />
      )}
      <div style={{ fontSize: size, fontWeight: 800, color: textColor }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary, #374151)', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: 'var(--text-soft, #9ca3af)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function DashCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 24 }}>
      {title && <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>{title}</div>}
      {children}
    </div>
  );
}

export function DashboardOverview({
  cadastros, pedidos, equipe, produtos, config, onVerTodosLeads, totalPacientes = 0,
  despesas = [], indicacoes = [], onIrParaRelatorios, onIrParaEstoque, onIrParaFinanceiro,
  mostrarVisaoNegocio = false,
}: {
  cadastros: DashCadastro[]; pedidos: DashPedido[]; equipe: DashMembro[]; produtos: DashProduto[]; config: DashConfig;
  onVerTodosLeads?: () => void; totalPacientes?: number;
  despesas?: DashDespesa[]; indicacoes?: DashIndicacao[];
  onIrParaRelatorios?: () => void; onIrParaEstoque?: () => void; onIrParaFinanceiro?: () => void;
  mostrarVisaoNegocio?: boolean;
}) {
  // ---- Filtro de período: afeta tudo que tem uma data própria (faturamento,
  // financeiro, comissões, leads, pedidos). Fica de fora o que é "estado
  // atual"/cumulativo por natureza (quem está online agora, alertas de
  // estoque, e-mails do mês, cliques/views — não têm data por evento) e os
  // dois gráficos de "últimos 30 dias", que são janelas fixas por definição.
  type Periodo = 'hoje' | '7d' | '30d' | 'mes' | 'ano' | 'tudo' | 'custom';
  // Começa em "Tudo" pra não mudar os números que todo mundo já conhece
  // assim que a tela abre — o filtro é pra quando quiser recortar, não o
  // padrão.
  const [periodo, setPeriodo] = useState<Periodo>('tudo');
  const [customDe, setCustomDe] = useState('');
  const [customAte, setCustomAte] = useState('');

  const hojeStr = new Date().toISOString().slice(0, 10);
  const diasAtras = (n: number) => { const d = new Date(); d.setDate(d.getDate() - n); return d.toISOString().slice(0, 10); };
  const [periodoInicio, periodoFim]: [string, string] = (() => {
    switch (periodo) {
      case 'hoje': return [hojeStr, hojeStr];
      case '7d': return [diasAtras(6), hojeStr];
      case '30d': return [diasAtras(29), hojeStr];
      case 'mes': return [hojeStr.slice(0, 7) + '-01', hojeStr];
      case 'ano': return [hojeStr.slice(0, 4) + '-01-01', hojeStr];
      case 'custom': return [customDe || '0000-01-01', customAte || hojeStr];
      default: return ['0000-01-01', hojeStr];
    }
  })();
  const dentroPeriodo = (dataISO: string | undefined | null) => {
    if (!dataISO) return false;
    const d = dataISO.slice(0, 10);
    return d >= periodoInicio && d <= periodoFim;
  };
  const PERIODO_LABEL: Record<Periodo, string> = {
    hoje: 'hoje', '7d': 'últimos 7 dias', '30d': 'últimos 30 dias', mes: 'este mês', ano: 'este ano', tudo: 'todo o período', custom: 'período selecionado',
  };

  const cadastrosPeriodo = cadastros.filter(c => dentroPeriodo(c.created_at));
  const totalPacientesPeriodo = indicacoes.filter(i => i.tipo !== 'medico' && dentroPeriodo(i.created_at)).length;
  const total = cadastrosPeriodo.length;
  const aprovados = cadastrosPeriodo.filter(c => c.status === 'aprovado').length;
  const pendentes = cadastrosPeriodo.filter(c => c.status === 'pendente').length;
  const emAnalise = cadastrosPeriodo.filter(c => c.status === 'em_analise').length;

  const pedidosPeriodo = pedidos.filter(p => dentroPeriodo(p.created_at));
  const totalPedidos = pedidosPeriodo.length;
  const valorTotalPedidos = pedidosPeriodo.reduce((s, p) => s + p.preco, 0);
  const pedidosVendidos = pedidosPeriodo.filter(p => p.status === 'pago').length;
  const pedidosPagos = pedidos.filter(p => p.status === 'pago');
  const pedidosPagosPeriodo = pedidosPeriodo.filter(p => p.status === 'pago');
  const valorVendido = pedidosPagosPeriodo.reduce((s, p) => s + p.preco, 0);

  // ---- Visao do negocio: faturamento, financeiro, comissoes, estoque ----
  const hoje30 = new Date();
  const dias30: string[] = [];
  for (let i = 29; i >= 0; i--) { const d = new Date(hoje30); d.setDate(d.getDate() - i); dias30.push(d.toISOString().slice(0, 10)); }
  const inicio30 = dias30[0];
  const pedidos30d = pedidosPagos.filter(p => p.created_at.slice(0, 10) >= inicio30);
  const faturamento30d = pedidos30d.reduce((s, p) => s + p.preco, 0);
  const historicoFaturamento: [string, number][] = dias30.map(dia => {
    const totalDia = pedidosPagos.filter(p => p.created_at.slice(0, 10) === dia).reduce((s, p) => s + p.preco, 0);
    return [new Date(dia + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }), Math.round(totalDia)];
  });

  const despesasPeriodo = despesas.filter(d => dentroPeriodo(d.data));
  const totalEntradas = despesasPeriodo.filter(d => d.tipo === 'entrada').reduce((s, d) => s + d.valor, 0);
  const totalSaidas = despesasPeriodo.filter(d => d.tipo === 'saida').reduce((s, d) => s + d.valor, 0);
  const saldo = totalEntradas - totalSaidas;

  // Comissões pagas soma direto da categoria "Cashback" do Financeiro — a
  // mesma fonte que a tela Financeiro usa — em vez de somar o campo
  // comissao_valor espalhado em cada cadastro/indicação. Somar o campo
  // espalhado diverge do Financeiro sempre que um lançamento existe sem
  // vínculo de volta, ou quando o valor do lançamento é editado sem
  // atualizar o campo espelhado — dois problemas reais já vistos aqui.
  const totalComissoesPagas = despesas.filter(d => d.categoria === 'Cashback' && dentroPeriodo(d.data)).reduce((s, d) => s + d.valor, 0);
  const cadastrosComPedidoProprioPago = new Set(pedidosPagosPeriodo.filter(p => !p.indicacao_id && p.cadastro_id).map(p => p.cadastro_id));
  const comissoesPendentes = indicacoes.filter(i => dentroPeriodo(i.created_at) && !i.comissao_paga && (i.status === 'pago' || i.status === 'convertido')).length
    + cadastros.filter(c => dentroPeriodo(c.created_at) && c.indicado_por_medico_id && !c.comissao_paga && cadastrosComPedidoProprioPago.has(c.id)).length;

  const itensVendidosTotal = pedidosPagos.flatMap(p =>
    p.itens && p.itens.length ? p.itens : [{ nome: p.produto_nome, preco: p.preco, quantidade: 1 }]
  );
  const vendidoPorId = calcularVendidoPorProduto(produtos.map(p => ({ ...p, preco: p.preco ?? 0 })), itensVendidosTotal);
  const estoqueLinhas = produtos.map(p => {
    const vendido = vendidoPorId.get(p.id) || 0;
    const inicial = p.estoque_inicial ?? 0;
    const atual = inicial - vendido;
    const status: 'esgotado' | 'ok' | 'nao_configurado' = inicial <= 0 ? 'nao_configurado' : atual <= 0 ? 'esgotado' : 'ok';
    return { atual, valorEstoque: Math.max(atual, 0) * (p.custo ?? 0), status };
  });
  const estoqueEsgotadoCount = estoqueLinhas.filter(l => l.status === 'esgotado').length;

  const porMedico = new Map<string, { nome: string; total: number }>();
  pedidosPagosPeriodo.forEach(p => {
    const key = p.cadastro_id || p.cadastro_nome;
    const cur = porMedico.get(key) || { nome: p.cadastro_nome, total: 0 };
    cur.total += p.preco;
    porMedico.set(key, cur);
  });
  const topMedicos = [...porMedico.values()].sort((a, b) => b.total - a.total).slice(0, 5);

  const comData = cadastrosPeriodo.filter(c => c.status === 'aprovado' && c.updated_at);
  const tempoMedio = comData.length > 0
    ? (comData.reduce((acc, c) => acc + (new Date(c.updated_at!).getTime() - new Date(c.created_at).getTime()) / 1000 / 60 / 60, 0) / comData.length)
    : null;
  const tempoLabel = tempoMedio === null ? '—' : tempoMedio < 24 ? `${tempoMedio.toFixed(0)}h` : `${(tempoMedio / 24).toFixed(1)}d`;

  const origens: Record<string, number> = {};
  cadastrosPeriodo.forEach(c => { const o = c.onde_conheceu || 'Não informado'; origens[o] = (origens[o] || 0) + 1; });
  const origensSort = Object.entries(origens).sort((a, b) => b[1] - a[1]).slice(0, 6);

  const ultimos30 = (() => {
    const dias: Record<string, number> = {};
    const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
    for (let i = 29; i >= 0; i--) {
      const d = new Date(hoje); d.setDate(d.getDate() - i);
      dias[d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })] = 0;
    }
    cadastros.forEach(c => {
      const d = new Date(c.created_at);
      const k = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (k in dias) dias[k]++;
    });
    return Object.entries(dias);
  })();

  const vendedores = equipe.filter(m => m.cargo === 'vendedor' && m.ativo);
  const perfVend = vendedores.map(v => ({
    ...v,
    ativos: cadastros.filter(c => c.vendedor_id === v.id).length,
    aprovados: cadastros.filter(c => c.vendedor_id === v.id && c.status === 'aprovado').length,
    analise: cadastros.filter(c => c.vendedor_id === v.id && c.status === 'em_analise').length,
  }));

  const onlineLojaLista = cadastros.filter(c => estaOnline(c.last_seen_loja));
  const onlineLoja = onlineLojaLista.length;
  const acessaramBlog = cadastros.filter(c => !!c.last_seen_blog).length;
  const produtosOrdenados = [...produtos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 8);
  const totalCartAdds = produtos.reduce((s, p) => s + (p.cart_adds || 0), 0);

  const emailsHoje = config.emails_enviados_hoje || 0;
  const limiteDia = config.limite_emails_dia || 100;
  const emailsMes = config.emails_enviados_mes || 0;
  const limiteMes = config.limite_emails_mes || 3000;
  const pctDia = Math.min((emailsHoje / limiteDia) * 100, 100);
  const pctMes = Math.min((emailsMes / limiteMes) * 100, 100);
  const corDia = pctDia >= 90 ? '#dc2626' : pctDia >= 70 ? 'var(--text-muted, #6b7280)' : '#16a34a';
  const corMes = pctMes >= 90 ? '#dc2626' : pctMes >= 70 ? 'var(--text-muted, #6b7280)' : '#16a34a';

  const cliques = config.cliques_cards || {};
  const cliquesHoje = config.cliques_cards_hoje || {};
  const cliquesMentoria = cliques['mentoria'] || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* Estilos usados aqui podem nao estar definidos na pagina que renderiza
          este componente (ex: portal da equipe) — declarados localmente para
          o Dashboard ficar identico em qualquer lugar que for usado. */}
      <style>{`
        .admin-grid-auto { grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); }
        .admin-table-scroll { overflow-x: auto; }
      `}</style>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 20, fontWeight: 800, color: 'var(--text)', margin: 0 }}>Dashboard Geral</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {onIrParaRelatorios && (
            <button onClick={onIrParaRelatorios} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Relatórios →</button>
          )}
          {onIrParaEstoque && (
            <button onClick={onIrParaEstoque} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Estoque →</button>
          )}
          {onIrParaFinanceiro && (
            <button onClick={onIrParaFinanceiro} style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', border: '1px solid var(--border)', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>Financeiro →</button>
          )}
        </div>
      </div>

      {/* Filtro de período — afeta faturamento, financeiro, comissões, leads
          e pedidos em todo o dashboard. O que é "agora"/cumulativo (online
          na loja, estoque, e-mails, cliques, views) fica de fora, e os
          gráficos de 30 dias continuam sendo uma janela fixa. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '10px 14px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--text-soft, #9ca3af)', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 2 }}>Período:</span>
        {([['hoje', 'Hoje'], ['7d', '7 dias'], ['30d', '30 dias'], ['mes', 'Este mês'], ['ano', 'Este ano'], ['tudo', 'Tudo'], ['custom', 'Personalizado']] as [Periodo, string][]).map(([val, label]) => (
          <button key={val} onClick={() => setPeriodo(val)}
            style={{
              background: periodo === val ? 'var(--btn-primary-bg)' : 'var(--surface-hover)', color: periodo === val ? 'var(--btn-primary-text)' : 'var(--text-secondary, #374151)',
              border: `1px solid ${periodo === val ? 'var(--btn-primary-bg)' : 'var(--border)'}`, padding: '5px 12px', borderRadius: 20, cursor: 'pointer',
              fontWeight: periodo === val ? 700 : 500, fontFamily: 'inherit', fontSize: 12.5,
            }}>
            {label}
          </button>
        ))}
        {periodo === 'custom' && (
          <>
            <input type="date" value={customDe} onChange={e => setCustomDe(e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
            <span style={{ color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>até</span>
            <input type="date" value={customAte} onChange={e => setCustomAte(e.target.value)}
              style={{ border: '1px solid var(--border)', borderRadius: 6, padding: '5px 8px', fontSize: 12.5, fontFamily: 'inherit', background: 'var(--surface)', color: 'var(--text)' }} />
          </>
        )}
      </div>

      {/* ==== Visao do Negocio: faturamento, financeiro, comissoes, estoque ==== */}
      {mostrarVisaoNegocio && (
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Visão do Negócio <span style={{ fontWeight: 400, color: 'var(--text-muted, #6b7280)', fontSize: 12.5 }}>— {PERIODO_LABEL[periodo]}</span></div>
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: 20 }}>
          <KpiCard size={22} label="Faturamento Total" value={`R$ ${brl(valorVendido)}`} />
          <KpiCard size={22} label="Faturamento (30D)" value={`R$ ${brl(faturamento30d)}`} />
          <KpiCard size={22} label="Saldo Financeiro" value={`R$ ${brl(saldo)}`} color={saldo >= 0 ? undefined : '#dc2626'} />
          <KpiCard size={22} label="Comissões Pagas" value={`R$ ${brl(totalComissoesPagas)}`} />
          <KpiCard size={22} label="Comissões Pendentes" value={comissoesPendentes} />
          <KpiCard size={22} label="Alertas de Estoque" value={estoqueEsgotadoCount}
            color={estoqueEsgotadoCount > 0 ? '#dc2626' : undefined}
            sub={`${estoqueEsgotadoCount} esgotado`} />
        </div>

        <div className="admin-grid-auto" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
          <DashCard title="Faturamento Diário (30D)">
            <FaturamentoChart30d data={historicoFaturamento} />
          </DashCard>
          <DashCard title="Top Médicos por Faturamento">
            {topMedicos.length === 0 ? (
              <div style={{ color: 'var(--text-muted, #6b7280)', fontSize: 13, textAlign: 'center', padding: '30px 0' }}>Sem pedidos pagos ainda.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topMedicos.map((m, i) => {
                  const max = topMedicos[0].total || 1;
                  return (
                    <div key={m.nome + i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 4 }}>
                        <span style={{ color: 'var(--text-secondary, #374151)', fontWeight: 600 }}>{m.nome}</span>
                        <span style={{ color: '#16a34a', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>R$ {brl(m.total)}</span>
                      </div>
                      <div style={{ background: 'var(--surface-hover)', borderRadius: 8, height: 8, overflow: 'hidden' }}>
                        <div style={{ background: '#16a34a', borderRadius: 8, height: '100%', width: `${(m.total / max) * 100}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </DashCard>
        </div>
      </div>
      )}

      {/* Total / Médicos / Pacientes — "Novos no período" pra ficar consistente
          com o resto do dashboard (totalPacientes vem pronto do backend sem
          filtro, então recalcula aqui em cima de indicacoes pra respeitar o
          período escolhido). */}
      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
        <KpiCard size={32} label="Total" value={total + totalPacientesPeriodo} sub={PERIODO_LABEL[periodo]} />
        <KpiCard size={32} label="Médicos" value={total} sub={PERIODO_LABEL[periodo]} />
        <KpiCard size={32} label="Pacientes" value={totalPacientesPeriodo} sub={PERIODO_LABEL[periodo]} />
      </div>

      {/* KPIs */}
      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
        <KpiCard label="Total Leads" value={total} />
        <KpiCard label="Aprovados" value={aprovados} color="#16a34a" />
        <KpiCard label="Pendentes" value={pendentes} color="#6b7280" />
        <KpiCard label="Em Análise" value={emAnalise} color="#6b7280" />
        <KpiCard label="Tempo Médio" value={tempoLabel} sub="de aprovação" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Gráfico 30 dias */}
        <DashCard title="Leads — últimos 30 dias">
          <LeadsChart30d data={ultimos30} />
        </DashCard>

        {/* Origem */}
        <DashCard title="Origem dos Leads">
          <HBarChart color="#16a34a" items={origensSort.map(([orig, qtd]) => ({ key: orig, label: orig, value: qtd }))} />
        </DashCard>
      </div>

      {/* Engajamento na Loja/Blog */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Engajamento</div>
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: onlineLoja > 0 ? 14 : 0 }}>
          <KpiCard label="Online na Loja Agora" value={onlineLoja} color="#16a34a" live={onlineLoja > 0} />
          <KpiCard label="Já Acessaram o Blog" value={acessaramBlog} />
          <KpiCard label="Cliques na Mentoria" value={cliquesMentoria} />
          <KpiCard label="Adições ao Carrinho" value={totalCartAdds} />
        </div>
        {onlineLoja > 0 && (
          <div style={{ background: 'var(--accent-soft, #f0fdf4)', border: '1px solid var(--accent-border, #86efac)', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--accent-text, #15803d)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Quem está online agora</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {onlineLojaLista.map(c => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--surface)', border: '1px solid var(--accent-border, #bbf7d0)', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                  {c.nome} {c.sobrenome || ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* E-mails enviados */}
      <DashCard title="E-mails Enviados">
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary, #374151)', fontWeight: 600 }}>Hoje</span>
              <span style={{ color: corDia, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{emailsHoje} / {limiteDia}</span>
            </div>
            <div style={{ background: 'var(--surface-hover)', borderRadius: 8, height: 9, overflow: 'hidden' }}>
              <div style={{ background: corDia, borderRadius: 8, height: '100%', width: `${pctDia}%`, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: 'var(--text-secondary, #374151)', fontWeight: 600 }}>Este mês</span>
              <span style={{ color: corMes, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{emailsMes} / {limiteMes}</span>
            </div>
            <div style={{ background: 'var(--surface-hover)', borderRadius: 8, height: 9, overflow: 'hidden' }}>
              <div style={{ background: corMes, borderRadius: 8, height: '100%', width: `${pctMes}%`, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
        </div>
        {(pctDia >= 90 || pctMes >= 90) && (
          <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
            <strong>Atenção:</strong> você está perto do limite de e-mails do Resend. Quando o limite for atingido, os e-mails de aprovação/rejeição param de ser enviados automaticamente (mas a aprovação em si continua funcionando normalmente — use o link do WhatsApp como alternativa).
          </div>
        )}
      </DashCard>

      {/* Cliques nos cards da tela inicial */}
      <DashCard title="Cliques nos Cards (Início)">
        <HBarChart color="#16a34a"
          items={CARDS_INICIO.map(c => ({ key: c.key, label: c.label, value: cliques[c.key] || 0, sub: ' cliques', hoje: cliquesHoje[c.key] || 0 }))} />
      </DashCard>

      {/* Produtos mais vistos */}
      <DashCard title="Produtos Mais Vistos">
        <HBarChart color="#16a34a" emptyLabel="Sem dados ainda."
          items={produtosOrdenados.filter(p => (p.views || 0) > 0).map(p => ({
            key: p.id, label: p.nome, value: p.views || 0, sub: ` vistos · ${p.cart_adds || 0} no carrinho`, hoje: p.views_hoje || 0,
          }))} />
      </DashCard>

      {/* Performance Vendedores */}
      {perfVend.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
            Performance Vendedores
          </div>
          <div className="admin-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                {['Vendedor', 'Leads Ativos', 'Em Análise', 'Convertidos', 'Taxa Conversão'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfVend.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: 'var(--text)' }}>{v.nome}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary, #374151)' }}>{v.ativos}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {v.analise > 0
                      ? <span style={{ background: 'var(--surface-hover)', color: 'var(--text-secondary, #374151)', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.analise} solicitações</span>
                      : <span style={{ color: 'var(--text-muted, #6b7280)' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#15803d', fontWeight: 700 }}>{v.aprovados}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: 'var(--surface-hover)', borderRadius: 4, height: 6, width: 60 }}>
                        <div style={{ background: '#16a34a', borderRadius: 4, height: '100%', width: `${v.ativos > 0 ? (v.aprovados / v.ativos) * 100 : 0}%` }} />
                      </div>
                      <span style={{ fontSize: 12, color: 'var(--text-secondary, #374151)' }}>{v.ativos > 0 ? `${Math.round((v.aprovados / v.ativos) * 100)}%` : '—'}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* KPIs Pedidos */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Pedidos</div>
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
          <KpiCard size={22} label="Total Pedidos" value={totalPedidos} />
          <KpiCard size={22} label="Valor Total" value={`R$ ${brl(valorTotalPedidos)}`} />
          <KpiCard size={22} label="Pagos" value={pedidosVendidos} color="#16a34a" />
          <KpiCard size={22} label="Valor Pago" value={`R$ ${brl(valorVendido)}`} color="#16a34a" />
        </div>
      </div>

      {/* Pedidos recentes */}
      {pedidosPeriodo.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>
            Pedidos Recentes
          </div>
          <div className="admin-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
                {['Cliente', 'Produto', 'Valor', 'Status', 'Data'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidosPeriodo.slice(0, 10).map(p => {
                const cc = PIPELINE_STATUS_COLOR[p.status] || { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' };
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: 'var(--text)' }}>{p.indicacao_id ? p.paciente_nome : p.cadastro_nome}</div>
                      <div style={{ fontSize: 11, color: 'var(--text-muted, #6b7280)' }}>{p.indicacao_id ? `indicado por ${p.cadastro_nome}` : p.cadastro_email}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-secondary, #374151)' }}>{p.produto_nome}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>R$ {brl(p.preco)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>
                        {PIPELINE_STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Leads recentes */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: 'var(--text)' }}>Ultimos Leads</span>
          {onVerTodosLeads && <button onClick={onVerTodosLeads} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Ver todos</button>}
        </div>
        <div className="admin-table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: 'var(--surface-hover)', borderBottom: '1px solid var(--border)' }}>
              {['Paciente', 'CRM', 'Status', 'Origem', 'Data'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: 'var(--text-muted, #6b7280)', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cadastrosPeriodo.slice(0, 8).map(c => {
              const sc: Record<string, { bg: string; text: string }> = {
                pendente: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' }, aprovado: { bg: '#dcfce7', text: '#15803d' },
                rejeitado: { bg: '#fef2f2', text: '#dc2626' }, em_analise: { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' },
              };
              const cc = sc[c.status] || { bg: 'var(--surface-hover)', text: 'var(--text-secondary, #374151)' };
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: 'var(--text)' }}>{c.nome} {c.sobrenome}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)' }}>{c.crm || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{c.onde_conheceu || '—'}</td>
                  <td style={{ padding: '10px 14px', color: 'var(--text-muted, #6b7280)', fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              );
            })}
            {cadastros.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: 'var(--text-muted, #6b7280)' }}>Nenhum lead ainda.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
