'use client';
import { estaOnline, HBarChart, LeadsChart30d } from './DashboardCharts';

export type DashCadastro = {
  id: string; nome: string; sobrenome: string; status: string; onde_conheceu: string | null;
  crm?: string | null; created_at: string; updated_at?: string; vendedor_id?: string | null;
  last_seen_loja?: string | null; last_seen_blog?: string | null;
};
export type DashPedido = { id: string; cadastro_nome: string; cadastro_email: string; produto_nome: string; preco: number; status: string; created_at: string; };
export type DashMembro = { id: string; nome: string; cargo: string; ativo: boolean; };
export type DashProduto = { id: string; nome: string; views?: number; views_hoje?: number; cart_adds?: number; };
export type DashConfig = {
  emails_enviados_hoje?: number; limite_emails_dia?: number;
  emails_enviados_mes?: number; limite_emails_mes?: number;
  cliques_cards?: Record<string, number>; cliques_cards_hoje?: Record<string, number>;
};

const PIPELINE_STATUS_LABEL: Record<string, string> = {
  em_atendimento: 'Em Atendimento', negociacao: 'Negociação', pago: 'Pago', cancelado: 'Cancelado',
};
const PIPELINE_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  em_atendimento: { bg: '#eff6ff', text: '#1d4ed8' },
  negociacao: { bg: '#fef9c3', text: '#a16207' },
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

export function DashboardOverview({
  cadastros, pedidos, equipe, produtos, config, onVerTodosLeads,
}: {
  cadastros: DashCadastro[]; pedidos: DashPedido[]; equipe: DashMembro[]; produtos: DashProduto[]; config: DashConfig;
  onVerTodosLeads?: () => void;
}) {
  const total = cadastros.length;
  const aprovados = cadastros.filter(c => c.status === 'aprovado').length;
  const pendentes = cadastros.filter(c => c.status === 'pendente').length;
  const emAnalise = cadastros.filter(c => c.status === 'em_analise').length;

  const totalPedidos = pedidos.length;
  const valorTotalPedidos = pedidos.reduce((s, p) => s + p.preco, 0);
  const pedidosVendidos = pedidos.filter(p => p.status === 'pago').length;
  const valorVendido = pedidos.filter(p => p.status === 'pago').reduce((s, p) => s + p.preco, 0);

  const comData = cadastros.filter(c => c.status === 'aprovado' && c.updated_at);
  const tempoMedio = comData.length > 0
    ? (comData.reduce((acc, c) => acc + (new Date(c.updated_at!).getTime() - new Date(c.created_at).getTime()) / 1000 / 60 / 60, 0) / comData.length)
    : null;
  const tempoLabel = tempoMedio === null ? '—' : tempoMedio < 24 ? `${tempoMedio.toFixed(0)}h` : `${(tempoMedio / 24).toFixed(1)}d`;

  const origens: Record<string, number> = {};
  cadastros.forEach(c => { const o = c.onde_conheceu || 'Não informado'; origens[o] = (origens[o] || 0) + 1; });
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
  const corDia = pctDia >= 90 ? '#dc2626' : pctDia >= 70 ? '#f59e0b' : '#16a34a';
  const corMes = pctMes >= 90 ? '#dc2626' : pctMes >= 70 ? '#f59e0b' : '#16a34a';

  const cliques = config.cliques_cards || {};
  const cliquesHoje = config.cliques_cards_hoje || {};
  const cliquesMentoria = cliques['mentoria'] || 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ fontSize: 20, fontWeight: 800, color: '#111827', margin: 0 }}>Dashboard Geral</h2>

      {/* KPIs */}
      <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
        {[
          { label: 'Total Leads', value: total, color: '#4f46e5' },
          { label: 'Aprovados', value: aprovados, color: '#16a34a' },
          { label: 'Pendentes', value: pendentes, color: '#f59e0b' },
          { label: 'Em Análise', value: emAnalise, color: '#3b82f6' },
          { label: 'Tempo Médio', value: tempoLabel, color: '#7c3aed', sub: 'de aprovação' },
        ].map(k => (
          <div key={k.label} style={{ background: `${k.color}0d`, border: `1px solid ${k.color}33`, borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${k.color}` }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 3 }}>{k.label}</div>
            {k.sub && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
        {/* Gráfico 30 dias */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Leads — últimos 30 dias</div>
          <LeadsChart30d data={ultimos30} />
        </div>

        {/* Origem */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Origem dos Leads</div>
          <HBarChart color="#4f46e5" items={origensSort.map(([orig, qtd]) => ({ key: orig, label: orig, value: qtd }))} />
        </div>
      </div>

      {/* Engajamento na Loja/Blog */}
      <div>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Engajamento</div>
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14, marginBottom: onlineLoja > 0 ? 14 : 0 }}>
          {[
            { label: 'Online na Loja Agora', value: onlineLoja, color: '#16a34a', live: onlineLoja > 0 },
            { label: 'Já Acessaram o Blog', value: acessaramBlog, color: '#db2777' },
            { label: 'Cliques na Mentoria', value: cliquesMentoria, color: '#0d9488' },
            { label: 'Adições ao Carrinho', value: totalCartAdds, color: '#7c3aed' },
          ].map(k => (
            <div key={k.label} style={{ background: `${k.color}0d`, border: `1px solid ${k.color}33`, borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${k.color}`, position: 'relative' }}>
              {k.live && (
                <span style={{ position: 'absolute', top: 16, right: 16, width: 8, height: 8, borderRadius: '50%', background: '#16a34a', boxShadow: '0 0 0 3px #16a34a33' }} />
              )}
              <div style={{ fontSize: 26, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
        {onlineLoja > 0 && (
          <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: '12px 16px' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8 }}>Quem está online agora</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {onlineLojaLista.map(c => (
                <span key={c.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', border: '1px solid #bbf7d0', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#111827' }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16a34a' }} />
                  {c.nome} {c.sobrenome || ''}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* E-mails enviados */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>E-mails Enviados</div>
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 20 }}>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: '#374151', fontWeight: 600 }}>Hoje</span>
              <span style={{ color: corDia, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{emailsHoje} / {limiteDia}</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 9, overflow: 'hidden' }}>
              <div style={{ background: corDia, borderRadius: 8, height: '100%', width: `${pctDia}%`, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12.5, marginBottom: 6 }}>
              <span style={{ color: '#374151', fontWeight: 600 }}>Este mês</span>
              <span style={{ color: corMes, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>{emailsMes} / {limiteMes}</span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 9, overflow: 'hidden' }}>
              <div style={{ background: corMes, borderRadius: 8, height: '100%', width: `${pctMes}%`, transition: 'width .5s cubic-bezier(.4,0,.2,1)' }} />
            </div>
          </div>
        </div>
        {(pctDia >= 90 || pctMes >= 90) && (
          <div style={{ marginTop: 16, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '12px 16px', fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
            <strong>Atenção:</strong> você está perto do limite de e-mails do Resend. Quando o limite for atingido, os e-mails de aprovação/rejeição param de ser enviados automaticamente (mas a aprovação em si continua funcionando normalmente — use o link do WhatsApp como alternativa).
          </div>
        )}
      </div>

      {/* Cliques nos cards da tela inicial */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Cliques nos Cards (Início)</div>
        <HBarChart color="#16a34a"
          items={CARDS_INICIO.map(c => ({ key: c.key, label: c.label, value: cliques[c.key] || 0, sub: ' cliques', hoje: cliquesHoje[c.key] || 0 }))} />
      </div>

      {/* Produtos mais vistos */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Produtos Mais Vistos</div>
        <HBarChart color="#7c3aed" emptyLabel="Sem dados ainda."
          items={produtosOrdenados.filter(p => (p.views || 0) > 0).map(p => ({
            key: p.id, label: p.nome, value: p.views || 0, sub: ` vistos · ${p.cart_adds || 0} no carrinho`, hoje: p.views_hoje || 0,
          }))} />
      </div>

      {/* Performance Vendedores */}
      {perfVend.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>
            Performance Vendedores
          </div>
          <div className="admin-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Vendedor', 'Leads Ativos', 'Em Análise', 'Convertidos', 'Taxa Conversão'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {perfVend.map(v => (
                <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 700, color: '#111827' }}>{v.nome}</td>
                  <td style={{ padding: '11px 14px', color: '#374151' }}>{v.ativos}</td>
                  <td style={{ padding: '11px 14px' }}>
                    {v.analise > 0
                      ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.analise} solicitações</span>
                      : <span style={{ color: '#6b7280' }}>—</span>}
                  </td>
                  <td style={{ padding: '11px 14px', color: '#15803d', fontWeight: 700 }}>{v.aprovados}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6, width: 60 }}>
                        <div style={{ background: '#16a34a', borderRadius: 4, height: '100%', width: `${v.ativos > 0 ? (v.aprovados / v.ativos) * 100 : 0}%` }} />
                      </div>
                      <span style={{ fontSize: 12, color: '#374151' }}>{v.ativos > 0 ? `${Math.round((v.aprovados / v.ativos) * 100)}%` : '—'}</span>
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
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>Pedidos</div>
        <div className="admin-grid-auto" style={{ display: 'grid', gap: 14 }}>
          {[
            { label: 'Total Pedidos', value: totalPedidos, color: '#4f46e5' },
            { label: 'Valor Total', value: `R$ ${valorTotalPedidos.toFixed(2)}`, color: '#0d9488' },
            { label: 'Pagos', value: pedidosVendidos, color: '#16a34a' },
            { label: 'Valor Pago', value: `R$ ${valorVendido.toFixed(2)}`, color: '#16a34a' },
          ].map(k => (
            <div key={k.label} style={{ background: `${k.color}0d`, border: `1px solid ${k.color}33`, borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${k.color}` }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: k.color }}>{k.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Pedidos recentes */}
      {pedidos.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>
            Pedidos Recentes
          </div>
          <div className="admin-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Cliente', 'Produto', 'Valor', 'Status', 'Data'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.slice(0, 10).map(p => {
                const cc = PIPELINE_STATUS_COLOR[p.status] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{p.cadastro_nome}</div>
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{p.cadastro_email}</div>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151' }}>{p.produto_nome}</td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>R$ {p.preco.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>
                        {PIPELINE_STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{new Date(p.created_at).toLocaleDateString('pt-BR')}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* Leads recentes */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 700, fontSize: 14, color: '#111827' }}>Ultimos Leads</span>
          {onVerTodosLeads && <button onClick={onVerTodosLeads} style={{ background: 'none', border: 'none', color: '#16a34a', cursor: 'pointer', fontSize: 12, fontWeight: 700, fontFamily: 'inherit' }}>Ver todos</button>}
        </div>
        <div className="admin-table-scroll">
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
              {['Paciente', 'CRM', 'Status', 'Origem', 'Data'].map(h => (
                <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cadastros.slice(0, 8).map(c => {
              const sc: Record<string, { bg: string; text: string }> = {
                pendente: { bg: '#fef9c3', text: '#a16207' }, aprovado: { bg: '#dcfce7', text: '#15803d' },
                rejeitado: { bg: '#fef2f2', text: '#dc2626' }, em_analise: { bg: '#eff6ff', text: '#1d4ed8' },
              };
              const cc = sc[c.status] || { bg: '#f3f4f6', text: '#374151' };
              return (
                <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px', fontWeight: 600, color: '#111827' }}>{c.nome} {c.sobrenome}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280' }}>{c.crm || '—'}</td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ padding: '3px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>{c.status}</span>
                  </td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{c.onde_conheceu || '—'}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{new Date(c.created_at).toLocaleDateString('pt-BR')}</td>
                </tr>
              );
            })}
            {cadastros.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhum lead ainda.</td></tr>}
          </tbody>
        </table>
        </div>
      </div>
    </div>
  );
}
