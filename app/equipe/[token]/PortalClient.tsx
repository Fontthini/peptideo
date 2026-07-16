'use client';
import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';

type Cadastro = {
  id: string; nome: string; sobrenome: string; email: string; whatsapp: string;
  endereco: string; crm: string | null; onde_conheceu: string | null;
  status: string; token: string | null; created_at: string; updated_at?: string;
  vendedor_id?: string | null; solicitacao?: string | null;
  obs?: string; motivo_rejeicao?: string;
};
type Membro = { id: string; nome: string; email: string; cargo: string; ativo: boolean; created_at: string; };
type PedidoItem = { nome: string; preco: number; quantidade: number };
type Pedido = {
  id: string; cadastro_nome: string; cadastro_email: string; cadastro_whatsapp?: string;
  produto_nome: string; preco: number; itens?: PedidoItem[];
  status: string; obs?: string; created_at: string; vendedor_id?: string;
};

type Props = { membro: Membro; leads: Cadastro[]; equipe: Membro[]; token: string; };

const CARGO_LABEL: Record<string, string> = { superadmin: 'Super Admin', gerente: 'Gerente', vendedor: 'Vendedor', designer: 'Designer' };
const CARGO_COLOR: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: '#fef9c3', text: '#a16207' }, gerente: { bg: '#eff6ff', text: '#1d4ed8' },
  vendedor: { bg: '#f0fdf4', text: '#15803d' }, designer: { bg: '#fdf4ff', text: '#7c3aed' },
};
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado', em_analise: 'Em Analise' };
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: '#fef9c3', text: '#a16207' }, aprovado: { bg: '#dcfce7', text: '#15803d' },
  rejeitado: { bg: '#fef2f2', text: '#dc2626' }, em_analise: { bg: '#eff6ff', text: '#1d4ed8' },
};
const PEDIDO_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  em_aberto: { bg: '#fef9c3', text: '#a16207' }, vendido: { bg: '#dcfce7', text: '#15803d' }, cancelado: { bg: '#fef2f2', text: '#dc2626' },
};

function Badge({ status, map }: { status: string; map: Record<string, { bg: string; text: string }> }) {
  const c = map[status] || { bg: '#f3f4f6', text: '#374151' };
  return <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: c.bg, color: c.text }}>{STATUS_LABEL[status] || status}</span>;
}

function StatCard({ label, value, sub, color }: { label: string; value: number | string; sub?: string; color?: string }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '18px 20px', borderTop: `4px solid ${color || '#111827'}` }}>
      <div style={{ fontSize: 26, fontWeight: 800, color: color || '#111827' }}>{value}</div>
      <div style={{ fontSize: 12, fontWeight: 600, color: '#374151', marginTop: 3 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#9ca3af', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
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

  const vendNome = equipe.find(e => e.id === lead.vendedor_id)?.nome;

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
    ? `https://wa.me/${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(`Ola ${waNome}! Aqui e a equipe PeptideZ Health. Estou entrando em contato sobre seu cadastro.`)}`
    : null;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 800 }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 520, background: '#fff', overflowY: 'auto', boxShadow: '-4px 0 32px rgba(0,0,0,0.18)', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 18, color: '#111827' }}>{lead.nome} {lead.sobrenome}</div>
            <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>Lead desde {formatDate(lead.created_at)}</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280' }}>×</button>
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
          <div style={{ background: '#f9fafb', borderRadius: 10, padding: 16, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 13 }}>
            {[
              ['Email', lead.email],
              ['WhatsApp', lead.whatsapp],
              ['Endereco', lead.endereco],
              ['CRM', lead.crm || '—'],
              ['Como conheceu', lead.onde_conheceu || '—'],
              ['Vendedor', vendNome || 'Sem vendedor'],
            ].map(([k, v]) => (
              <div key={k} style={{ display: 'flex', gap: 8 }}>
                <span style={{ color: '#9ca3af', minWidth: 110 }}>{k}:</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Botao WhatsApp */}
          {waLead && (
            <a href={waLead} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
              <span style={{ fontSize: 18 }}>📱</span> Iniciar Conversa no WhatsApp
            </a>
          )}

          {/* Motivo de rejeicao (se houver) */}
          {lead.motivo_rejeicao && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#dc2626' }}>
              <strong>Motivo da rejeicao:</strong> {lead.motivo_rejeicao}
            </div>
          )}

          {/* Observacoes */}
          <div>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', marginBottom: 6, letterSpacing: 0.5 }}>
              Anotacoes / Observacoes
            </label>
            <textarea
              value={obs}
              onChange={e => setObs(e.target.value)}
              placeholder="Registre informacoes da conversa, interesses, proximos passos..."
              rows={5}
              style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', color: '#111827', background: '#fff' }}
            />
            <button onClick={salvarObs} disabled={loading === 'obs'}
              style={{ marginTop: 6, background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '7px 18px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
              {loading === 'obs' ? 'Salvando...' : 'Salvar Anotacao'}
            </button>
          </div>

          {msg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#15803d' }}>{msg}</div>}

          {/* Link WhatsApp de aprovacao */}
          {waLink && (
            <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 10 }}>Lead aprovado! Envie a mensagem de boas-vindas:</div>
              <a href={waLink} target="_blank" rel="noreferrer"
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>📱</span> Enviar Link de Acesso via WhatsApp
              </a>
            </div>
          )}

          {/* Acoes de vendedor */}
          {cargo === 'vendedor' && lead.status !== 'aprovado' && lead.status !== 'rejeitado' && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Solicitar ao Gerente</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {!lead.solicitacao && (
                  <>
                    <button onClick={() => acao('solicitar_aprovar')} disabled={!!loading}
                      style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '11px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                      Solicitar Aprovacao deste Lead
                    </button>
                    <div>
                      <textarea value={motivo} onChange={e => setMotivo(e.target.value)}
                        placeholder="Motivo para rejeitar (opcional)..."
                        rows={2}
                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 12, fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box', marginBottom: 6, color: '#111827', background: '#fff' }} />
                      <button onClick={() => acao('solicitar_rejeitar')} disabled={!!loading}
                        style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '11px 0', borderRadius: 8, cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit', width: '100%' }}>
                        Solicitar Rejeicao
                      </button>
                    </div>
                  </>
                )}
                {lead.solicitacao && (
                  <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e' }}>
                    Solicitacao de {lead.solicitacao === 'aprovar' ? 'aprovacao' : 'rejeicao'} enviada ao gerente. Aguardando decisao.
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Acoes de gerente */}
          {(cargo === 'gerente' || cargo === 'superadmin') && lead.status !== 'aprovado' && lead.status !== 'rejeitado' && (
            <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 16 }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>Decisao do Gerente</div>
              {lead.solicitacao && (
                <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px', fontSize: 13, color: '#92400e', marginBottom: 10 }}>
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
   VENDEDOR VIEW
   ========================================================= */
function VendedorView({ membro, leads: leadsInit, equipe, token }: Props) {
  const [lista, setLista] = useState(leadsInit);
  const [filtro, setFiltro] = useState('meus');
  const [selectedLead, setSelectedLead] = useState<Cadastro | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [abaPedidos, setAbaPedidos] = useState(false);
  const [loadingPedido, setLoadingPedido] = useState('');
  const [msg, setMsg] = useState('');

  const meusLeads = lista.filter(l => l.vendedor_id === membro.id);
  const semVendedor = lista.filter(l => !l.vendedor_id && l.status === 'pendente');
  const emAnalise = lista.filter(l => l.vendedor_id === membro.id && l.status === 'em_analise');
  const aprovados = lista.filter(l => l.vendedor_id === membro.id && l.status === 'aprovado');

  const visivel = filtro === 'meus' ? meusLeads
    : filtro === 'livres' ? semVendedor
    : filtro === 'analise' ? emAnalise
    : filtro === 'aprovados' ? aprovados
    : lista;

  async function carregarPedidos() {
    const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
    if (r.ok) setPedidos(await r.json());
    setAbaPedidos(true);
  }

  async function marcarPedido(id: string, status: string) {
    setLoadingPedido(id);
    try {
      const r = await fetch('/api/portal/pedidos', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-member-token': token },
        body: JSON.stringify({ id, status }),
      });
      if (r.ok) {
        const p = await r.json();
        setPedidos(prev => prev.map(x => x.id === id ? p : x));
        setMsg('Pedido atualizado!');
        setTimeout(() => setMsg(''), 3000);
      }
    } finally { setLoadingPedido(''); }
  }

  async function assumir(leadId: string) {
    const r = await fetch(`/api/portal/leads/${leadId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'x-member-token': token },
      body: JSON.stringify({ action: 'assumir' }),
    });
    if (r.ok) {
      const d = await r.json();
      setLista(prev => prev.map(l => l.id === leadId ? { ...l, ...d } : l));
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {selectedLead && (
        <LeadDetail
          lead={selectedLead} equipe={equipe} token={token} cargo={membro.cargo}
          onClose={() => setSelectedLead(null)}
          onUpdate={d => { setLista(prev => prev.map(l => l.id === d.id ? { ...l, ...d } : l)); setSelectedLead(s => s ? { ...s, ...d } : s); }}
        />
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
        <StatCard label="Meus Leads" value={meusLeads.length} color="#16a34a" />
        <StatCard label="Em Analise" value={emAnalise.length} sub="aguardando gerente" color="#3b82f6" />
        <StatCard label="Aprovados" value={aprovados.length} color="#7c3aed" />
        <StatCard label="Livres" value={semVendedor.length} sub="disponiveis" color="#f59e0b" />
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#15803d' }}>{msg}</div>}

      {/* Tabs: Leads / Pedidos */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setAbaPedidos(false)}
          style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: !abaPedidos ? 700 : 500, background: !abaPedidos ? '#111827' : '#f3f4f6', color: !abaPedidos ? '#fff' : '#374151', fontSize: 13 }}>
          Leads
        </button>
        <button onClick={carregarPedidos}
          style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: abaPedidos ? 700 : 500, background: abaPedidos ? '#111827' : '#f3f4f6', color: abaPedidos ? '#fff' : '#374151', fontSize: 13 }}>
          Meus Pedidos
        </button>
      </div>

      {/* ABA PEDIDOS */}
      {abaPedidos && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Pedidos dos meus Clientes</div>
          {pedidos.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum pedido ainda. Os pedidos aparecem quando seus clientes finalizam o carrinho.</div>}
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Cliente', 'Produto(s)', 'Valor', 'Status', 'Data', 'Acao'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {pedidos.map(p => {
                const cc = PEDIDO_STATUS_COLOR[p.status] || { bg: '#f3f4f6', text: '#374151' };
                return (
                  <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 14px' }}>
                      <div style={{ fontWeight: 600, color: '#111827' }}>{p.cadastro_nome}</div>
                      <div style={{ fontSize: 11, color: '#9ca3af' }}>{p.cadastro_email}</div>
                      {p.cadastro_whatsapp && (
                        <a href={`https://wa.me/${p.cadastro_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                          style={{ fontSize: 11, color: '#25D366', textDecoration: 'none', fontWeight: 600 }}>
                          WA: {p.cadastro_whatsapp}
                        </a>
                      )}
                    </td>
                    <td style={{ padding: '10px 14px', color: '#374151', maxWidth: 200 }}>
                      {p.itens ? p.itens.map(i => `${i.nome} x${i.quantidade}`).join(', ') : p.produto_nome}
                    </td>
                    <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>R$ {p.preco.toFixed(2)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>
                        {p.status === 'em_aberto' ? 'Em Aberto' : p.status === 'vendido' ? 'Vendido' : 'Cancelado'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{formatDate(p.created_at)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      {p.status === 'em_aberto' && (
                        <div style={{ display: 'flex', gap: 5 }}>
                          <button onClick={() => marcarPedido(p.id, 'vendido')} disabled={loadingPedido === p.id}
                            style={{ background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 700 }}>
                            Marcar Vendido
                          </button>
                          <button onClick={() => marcarPedido(p.id, 'cancelado')} disabled={loadingPedido === p.id}
                            style={{ background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                            Cancelar
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ABA LEADS */}
      {!abaPedidos && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['meus', `Meus (${meusLeads.length})`], ['livres', `Livres (${semVendedor.length})`], ['analise', `Em Analise (${emAnalise.length})`], ['aprovados', 'Aprovados']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filtro === v ? 700 : 500, background: filtro === v ? '#111827' : '#f3f4f6', color: filtro === v ? '#fff' : '#374151', fontFamily: 'inherit' }}>
                {l}
              </button>
            ))}
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Paciente', 'Status', 'Contato', 'Data', 'Acoes'].map(h => (
                  <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visivel.length === 0 && (
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum lead neste filtro.</td></tr>
              )}
              {visivel.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => setSelectedLead(l)}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{l.nome} {l.sobrenome}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{l.email}</div>
                    {l.obs && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>📝 Com anotacao</div>}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge status={l.status} map={STATUS_COLOR} />
                    {l.solicitacao && (
                      <div style={{ marginTop: 4 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, background: l.solicitacao === 'aprovar' ? '#dcfce7' : '#fef2f2', color: l.solicitacao === 'aprovar' ? '#15803d' : '#dc2626', padding: '2px 7px', borderRadius: 10 }}>
                          Sol. {l.solicitacao === 'aprovar' ? 'Aprov.' : 'Rejei.'}
                        </span>
                      </div>
                    )}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 12, color: '#374151' }}>{l.whatsapp}</div>
                    <div style={{ fontSize: 11, color: '#9ca3af' }}>{l.crm || 'Sem CRM'}</div>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12 }}>{formatDate(l.created_at)}</td>
                  <td style={{ padding: '11px 14px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      {!l.vendedor_id && l.status === 'pendente' && (
                        <button onClick={() => assumir(l.id)}
                          style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
                          Assumir
                        </button>
                      )}
                      <button onClick={() => setSelectedLead(l)}
                        style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '5px 10px', borderRadius: 5, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit' }}>
                        Ver Detalhes
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* =========================================================
   GERENTE VIEW
   ========================================================= */
function GerenteView({ membro, leads: leadsInit, equipe, token }: Props) {
  const [lista, setLista] = useState(leadsInit);
  const [filtro, setFiltro] = useState('todos');
  const [selectedLead, setSelectedLead] = useState<Cadastro | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [abaPedidos, setAbaPedidos] = useState(false);

  const pendentes = lista.filter(l => l.status === 'pendente');
  const emAnalise = lista.filter(l => l.status === 'em_analise');
  const aprovados = lista.filter(l => l.status === 'aprovado');
  const rejeitados = lista.filter(l => l.status === 'rejeitado');

  const visivel = filtro === 'analise' ? emAnalise
    : filtro === 'pendente' ? pendentes
    : filtro === 'aprovado' ? aprovados
    : filtro === 'rejeitado' ? rejeitados
    : lista;

  const vendedores = equipe.filter(e => e.cargo === 'vendedor' && e.ativo);
  const perf = vendedores.map(v => ({
    ...v,
    leads: lista.filter(l => l.vendedor_id === v.id).length,
    aprovados: lista.filter(l => l.vendedor_id === v.id && l.status === 'aprovado').length,
    analise: lista.filter(l => l.vendedor_id === v.id && l.status === 'em_analise').length,
    pedidosVendidos: pedidos.filter(p => p.vendedor_id === v.id && p.status === 'vendido').length,
    valorVendido: pedidos.filter(p => p.vendedor_id === v.id && p.status === 'vendido').reduce((s, p) => s + p.preco, 0),
  }));

  async function carregarPedidos() {
    const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
    if (r.ok) setPedidos(await r.json());
    setAbaPedidos(true);
  }

  const totalPedidos = pedidos.length;
  const valorPedidos = pedidos.reduce((s, p) => s + p.preco, 0);
  const pedidosVendidos = pedidos.filter(p => p.status === 'vendido');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {selectedLead && (
        <LeadDetail
          lead={selectedLead} equipe={equipe} token={token} cargo={membro.cargo}
          onClose={() => setSelectedLead(null)}
          onUpdate={d => { setLista(prev => prev.map(l => l.id === d.id ? { ...l, ...d } : l)); setSelectedLead(s => s ? { ...s, ...d } : s); }}
        />
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 }}>
        <StatCard label="Total Leads" value={lista.length} color="#111827" />
        <StatCard label="Pendentes" value={pendentes.length} color="#f59e0b" />
        <StatCard label="Em Analise" value={emAnalise.length} sub="solicitacoes" color="#3b82f6" />
        <StatCard label="Aprovados" value={aprovados.length} color="#16a34a" />
        <StatCard label="Rejeitados" value={rejeitados.length} color="#dc2626" />
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => setAbaPedidos(false)}
          style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: !abaPedidos ? 700 : 500, background: !abaPedidos ? '#111827' : '#f3f4f6', color: !abaPedidos ? '#fff' : '#374151', fontSize: 13 }}>
          Leads
        </button>
        <button onClick={carregarPedidos}
          style={{ padding: '8px 20px', borderRadius: 20, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontWeight: abaPedidos ? 700 : 500, background: abaPedidos ? '#111827' : '#f3f4f6', color: abaPedidos ? '#fff' : '#374151', fontSize: 13 }}>
          Pedidos & Vendas
        </button>
      </div>

      {/* ABA PEDIDOS */}
      {abaPedidos && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
            <StatCard label="Total Pedidos" value={totalPedidos} color="#111827" />
            <StatCard label="Valor Total" value={`R$ ${valorPedidos.toFixed(2)}`} color="#6b7280" />
            <StatCard label="Vendidos" value={pedidosVendidos.length} color="#16a34a" />
            <StatCard label="Valor Vendido" value={`R$ ${pedidosVendidos.reduce((s,p) => s+p.preco,0).toFixed(2)}`} color="#16a34a" />
          </div>

          {/* Performance vendedores com pedidos */}
          {perf.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Performance por Vendedor</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Vendedor', 'Leads', 'Aprovados', 'Pedidos Vendidos', 'Valor Vendido'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perf.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>{v.nome}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{v.leads}</td>
                      <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 700 }}>{v.aprovados}</td>
                      <td style={{ padding: '10px 14px', color: '#7c3aed', fontWeight: 700 }}>{v.pedidosVendidos}</td>
                      <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 800 }}>R$ {v.valorVendido.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Tabela pedidos */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Todos os Pedidos</div>
            {pedidos.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum pedido ainda.</div>}
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Cliente', 'Produto(s)', 'Valor', 'Vendedor', 'Status', 'Data'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pedidos.map(p => {
                  const cc = PEDIDO_STATUS_COLOR[p.status] || { bg: '#f3f4f6', text: '#374151' };
                  const vendNome = equipe.find(e => e.id === p.vendedor_id)?.nome;
                  return (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontWeight: 600, color: '#111827' }}>{p.cadastro_nome}</div>
                        {p.cadastro_whatsapp && (
                          <a href={`https://wa.me/${p.cadastro_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                            style={{ fontSize: 11, color: '#25D366', textDecoration: 'none' }}>{p.cadastro_whatsapp}</a>
                        )}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#374151', maxWidth: 200, fontSize: 12 }}>
                        {p.itens ? p.itens.map(i => `${i.nome} x${i.quantidade}`).join(', ') : p.produto_nome}
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#16a34a' }}>R$ {p.preco.toFixed(2)}</td>
                      <td style={{ padding: '10px 14px', color: '#374151', fontSize: 12 }}>{vendNome || '—'}</td>
                      <td style={{ padding: '10px 14px' }}>
                        <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: cc.bg, color: cc.text }}>
                          {p.status === 'em_aberto' ? 'Em Aberto' : p.status === 'vendido' ? 'Vendido' : 'Cancelado'}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#9ca3af', fontSize: 12 }}>{formatDate(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ABA LEADS */}
      {!abaPedidos && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {perf.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Performance Vendedores</div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Vendedor', 'Leads', 'Em Analise', 'Aprovados', 'Taxa'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {perf.map(v => (
                    <tr key={v.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>{v.nome}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{v.leads}</td>
                      <td style={{ padding: '10px 14px' }}>
                        {v.analise > 0 ? <span style={{ background: '#eff6ff', color: '#1d4ed8', padding: '2px 8px', borderRadius: 20, fontSize: 11, fontWeight: 700 }}>{v.analise}</span>
                          : <span style={{ color: '#d1d5db' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 700 }}>{v.aprovados}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{v.leads > 0 ? `${Math.round((v.aprovados / v.leads) * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[['todos', `Todos (${lista.length})`], ['analise', `Analise (${emAnalise.length})`], ['pendente', `Pendentes (${pendentes.length})`], ['aprovado', 'Aprovados'], ['rejeitado', 'Rejeitados']].map(([v, l]) => (
                <button key={v} onClick={() => setFiltro(v)}
                  style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filtro === v ? 700 : 500, background: filtro === v ? '#111827' : '#f3f4f6', color: filtro === v ? '#fff' : '#374151', fontFamily: 'inherit' }}>
                  {l}
                </button>
              ))}
            </div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Paciente', 'Status', 'Vendedor', 'Solicitacao', 'Data'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visivel.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#9ca3af' }}>Nenhum lead.</td></tr>}
                {visivel.map(l => {
                  const vendNome = equipe.find(e => e.id === l.vendedor_id)?.nome;
                  return (
                    <tr key={l.id} onClick={() => setSelectedLead(l)}
                      style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: l.solicitacao ? '#fffbeb' : '#fff' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{l.nome} {l.sobrenome}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af' }}>{l.email}</div>
                      </td>
                      <td style={{ padding: '11px 14px' }}><Badge status={l.status} map={STATUS_COLOR} /></td>
                      <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 12 }}>{vendNome || <span style={{ color: '#d1d5db' }}>Livre</span>}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {l.solicitacao ? (
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.solicitacao === 'aprovar' ? '#dcfce7' : '#fef2f2', color: l.solicitacao === 'aprovar' ? '#15803d' : '#dc2626' }}>
                            Sol. {l.solicitacao === 'aprovar' ? 'Aprovacao' : 'Rejeicao'}
                          </span>
                        ) : <span style={{ color: '#d1d5db', fontSize: 11 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#9ca3af', fontSize: 12 }}>{formatDate(l.created_at)}</td>
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
}

/* =========================================================
   DESIGNER VIEW
   ========================================================= */
function DesignerView({ membro, token }: { membro: Membro; token: string }) {
  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, maxWidth: 700 }}>
        <a href={`/designer/${token}?section=produtos`} style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, padding: 32, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🧪</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Produtos</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Editar catalogo de peptideos, imagens, precos e descricoes</div>
          </div>
        </a>
        <a href={`/designer/${token}?section=blog`} style={{ textDecoration: 'none' }}>
          <div style={{ background: '#fff', border: '2px solid #e5e7eb', borderRadius: 16, padding: 32, textAlign: 'center', cursor: 'pointer' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>📝</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#111827', marginBottom: 8 }}>Blog & Conteudo</div>
            <div style={{ fontSize: 13, color: '#6b7280' }}>Criar artigos, banners e materiais para membros</div>
          </div>
        </a>
      </div>
      <div style={{ marginTop: 20, background: '#fdf4ff', border: '1px solid #e9d5ff', borderRadius: 10, padding: '14px 18px', fontSize: 13, color: '#7c3aed', maxWidth: 700 }}>
        Designer: acesso exclusivo a edicao de produtos e blog. Painel administrativo completo e restrito.
      </div>
    </div>
  );
}

/* =========================================================
   MAIN PORTAL
   ========================================================= */
export default function PortalClient({ membro, leads, equipe, token }: Props) {
  const router = useRouter();
  const cargo = membro.cargo;
  const cc = CARGO_COLOR[cargo] || { bg: '#f3f4f6', text: '#374151' };

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <header style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '14px 28px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: 24, fontWeight: 900, color: '#111827', letterSpacing: -1 }}>PeptideZ</div>
          <span style={{ background: cc.bg, color: cc.text, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700 }}>
            {CARGO_LABEL[cargo] || cargo}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: 13, color: '#6b7280' }}>Ola, <strong style={{ color: '#111827' }}>{membro.nome.split(' ')[0]}</strong></span>
          <button onClick={() => router.push('/equipe/login')}
            style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '7px 14px', borderRadius: 7, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
            Sair
          </button>
        </div>
      </header>

      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>
          {cargo === 'vendedor' && 'Meus Leads & Pedidos'}
          {cargo === 'gerente' && 'Dashboard — Gerente'}
          {cargo === 'designer' && 'Ferramentas de Conteudo'}
          {cargo === 'superadmin' && 'Painel Completo'}
        </h1>

        {cargo === 'vendedor' && <VendedorView membro={membro} leads={leads} equipe={equipe} token={token} />}
        {cargo === 'gerente' && <GerenteView membro={membro} leads={leads} equipe={equipe} token={token} />}
        {cargo === 'designer' && <DesignerView membro={membro} token={token} />}
        {cargo === 'superadmin' && <GerenteView membro={membro} leads={leads} equipe={equipe} token={token} />}
      </main>
    </div>
  );
}
