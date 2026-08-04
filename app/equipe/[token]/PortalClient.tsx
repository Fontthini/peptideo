'use client';
import { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { DashboardOverview, type DashProduto, type DashConfig } from '@/components/DashboardOverview';
import { HBarChart } from '@/components/DashboardCharts';
import { corDaEtiqueta } from '@/lib/etiquetas';

type Cadastro = {
  id: string; nome: string; sobrenome: string; email: string; whatsapp: string;
  endereco: string; crm: string | null; onde_conheceu: string | null;
  status: string; token: string | null; created_at: string; updated_at?: string;
  vendedor_id?: string | null; solicitacao?: string | null;
  obs?: string; motivo_rejeicao?: string;
  last_seen_loja?: string | null; last_seen_blog?: string | null;
  tags?: string[];
};

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
type Membro = { id: string; nome: string; email: string; cargo: string; ativo: boolean; created_at: string; };
type PedidoItem = { nome: string; preco: number; quantidade: number };
type Pedido = {
  id: string; cadastro_nome: string; cadastro_email: string; cadastro_whatsapp?: string;
  produto_nome: string; preco: number; itens?: PedidoItem[];
  status: string; obs?: string; created_at: string; vendedor_id?: string;
};
type Indicacao = {
  id: string; medico_id: string; medico_nome: string;
  nome: string; sobrenome: string; whatsapp: string; email: string; endereco: string;
  status: string; created_at: string; tipo?: 'paciente' | 'medico'; crm?: string;
};
type Despesa = { id: string; tipo: 'entrada' | 'saida'; categoria: string; descricao: string; valor: number; data: string; comprovante_url?: string; created_at: string; };
type MentoriaCliqueLog = { id: string; medico_id: string; medico_nome: string; created_at: string; };
type Material = { nome: string; url: string };
type Artigo = { id: string; titulo: string; conteudo: string; imagem?: string; video?: string; categoria?: string; materiais: Material[]; publicado: boolean; created_at: string; updated_at: string; };

type Props = { membro: Membro; leads: Cadastro[]; equipe: Membro[]; token: string; logo?: string; };

const CARGO_LABEL: Record<string, string> = { superadmin: 'Super Admin', gerente: 'Gerente', vendedor: 'Vendedor' };
const CARGO_COLOR: Record<string, { bg: string; text: string }> = {
  superadmin: { bg: '#fef9c3', text: '#a16207' }, gerente: { bg: '#eff6ff', text: '#1d4ed8' },
  vendedor: { bg: '#f0fdf4', text: '#15803d' },
};
const STATUS_LABEL: Record<string, string> = { pendente: 'Pendente', aprovado: 'Aprovado', rejeitado: 'Rejeitado', em_analise: 'Em Analise' };
const STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pendente: { bg: '#fef9c3', text: '#a16207' }, aprovado: { bg: '#dcfce7', text: '#15803d' },
  rejeitado: { bg: '#fef2f2', text: '#dc2626' }, em_analise: { bg: '#eff6ff', text: '#1d4ed8' },
};
const PEDIDO_STATUS_LABEL: Record<string, string> = {
  em_atendimento: 'Em Atendimento', negociacao: 'Negociação', pago: 'Pago', cancelado: 'Cancelado',
};
const PEDIDO_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  em_atendimento: { bg: '#eff6ff', text: '#1d4ed8' }, negociacao: { bg: '#fef9c3', text: '#a16207' },
  pago: { bg: '#dcfce7', text: '#15803d' }, cancelado: { bg: '#fef2f2', text: '#dc2626' },
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
      {sub && <div style={{ fontSize: 10, color: '#6b7280', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

const ABA_NAV: { key: string; icon: string; label: string; color: string; gerenteOnly?: boolean }[] = [
  { key: 'dashboard', icon: '#', label: 'Dashboard', color: '#4f46e5', gerenteOnly: true },
  { key: 'leads', icon: 'L', label: 'Leads', color: '#16a34a' },
  { key: 'pedidos', icon: 'P', label: 'Pedidos', color: '#4f46e5' },
  { key: 'indicacoes', icon: 'I', label: 'Indicações', color: '#0d9488' },
  { key: 'indicacoes-medicas', icon: 'M', label: 'Indicações Médicas', color: '#0891b2', gerenteOnly: true },
  { key: 'financeiro', icon: '$', label: 'Financeiro', color: '#ca8a04', gerenteOnly: true },
  { key: 'mentoria', icon: '%', label: 'Mentoria', color: '#0d9488', gerenteOnly: true },
  { key: 'blog', icon: 'B', label: 'Blog', color: '#db2777', gerenteOnly: true },
  { key: 'rastreio', icon: 'R', label: 'Link de Rastreio', color: '#0891b2', gerenteOnly: true },
];

function SideNav({ aba, handlers, gerenteOnly }: { aba: string; handlers: Record<string, () => void>; gerenteOnly?: boolean }) {
  const itens = ABA_NAV.filter(i => !i.gerenteOnly || gerenteOnly);
  return (
    <aside className="portal-sidenav" style={{ flexShrink: 0, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 10, alignSelf: 'flex-start', display: 'flex' }}>
      {itens.map(item => {
        const ativo = aba === item.key;
        return (
          <button key={item.key} className="portal-navitem" onClick={handlers[item.key]}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', border: 'none', borderRadius: 8, marginBottom: 2,
              background: ativo ? `${item.color}14` : 'transparent',
              color: ativo ? item.color : '#374151',
              fontWeight: ativo ? 700 : 500, fontSize: 14, fontFamily: 'inherit',
              cursor: 'pointer', textAlign: 'left',
            }}>
            <span style={{
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              width: 26, height: 26, borderRadius: 7, fontSize: 12, fontWeight: 800, flexShrink: 0,
              background: ativo ? item.color : `${item.color}1a`, color: ativo ? '#fff' : item.color,
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
            <div style={{ fontSize: 12, color: '#6b7280', marginTop: 2 }}>Lead desde {formatDate(lead.created_at)}</div>
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
                <span style={{ color: '#6b7280', minWidth: 110 }}>{k}:</span>
                <span style={{ color: '#111827', fontWeight: 500 }}>{v}</span>
              </div>
            ))}
          </div>

          {/* Botao WhatsApp contato */}
          {waLead && (
            <a href={waLead} target="_blank" rel="noreferrer"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
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
              ? `https://wa.me/${lead.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`
              : null;
            return waReenvio ? (
              <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#15803d' }}>✅ Lead aprovado — envie o link de acesso:</div>
                <a href={waReenvio} target="_blank" rel="noreferrer"
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                  <span style={{ fontSize: 18 }}>📱</span> Enviar Link de Acesso via WhatsApp
                </a>
                <div style={{ fontSize: 11, color: '#6b7280', wordBreak: 'break-all' }}>{lojaUrl}</div>
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
              <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>🔗 Link de indicação para pacientes deste médico:</div>
                <button onClick={copiarIndicacao}
                  style={{ background: linkCopiado ? '#dbeafe' : '#fff', color: '#1d4ed8', border: '1px solid #bfdbfe', borderRadius: 8, padding: '10px 0', cursor: 'pointer', fontWeight: 700, fontSize: 13, fontFamily: 'inherit' }}>
                  {linkCopiado ? '✓ Link copiado!' : 'Copiar Link de Indicação'}
                </button>
                <div style={{ fontSize: 11, color: '#6b7280', wordBreak: 'break-all' }}>{indicarUrl}</div>
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
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#25D366', color: '#fff', borderRadius: 8, padding: '12px 0', textDecoration: 'none', fontWeight: 700, fontSize: 14 }}>
                <span style={{ fontSize: 18 }}>📱</span> Enviar Link de Acesso via WhatsApp
              </a>
              <div style={{ fontSize: 11, color: '#6b7280', wordBreak: 'break-all' }}>
                Clique no botao verde acima para abrir o WhatsApp com a mensagem ja preenchida.
              </div>
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
  const [indicacoes, setIndicacoes] = useState<Indicacao[]>([]);
  const [aba, setAba] = useState<'leads' | 'pedidos' | 'indicacoes'>('leads');
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
    setAba('pedidos');
  }

  async function carregarIndicacoes() {
    const r = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
    if (r.ok) setIndicacoes(await r.json());
    setAba('indicacoes');
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
    <div className="portal-shell">
      {selectedLead && (
        <LeadDetail
          lead={selectedLead} equipe={equipe} token={token} cargo={membro.cargo}
          onClose={() => setSelectedLead(null)}
          onUpdate={d => { setLista(prev => prev.map(l => l.id === d.id ? { ...l, ...d } : l)); setSelectedLead(s => s ? { ...s, ...d } : s); }}
        />
      )}

      <SideNav aba={aba} handlers={{ leads: () => setAba('leads'), pedidos: carregarPedidos, indicacoes: carregarIndicacoes }} />

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 24 }}>
      {/* KPIs */}
      <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
        <StatCard label="Meus Leads" value={meusLeads.length} color="#16a34a" />
        <StatCard label="Em Analise" value={emAnalise.length} sub="aguardando gerente" color="#3b82f6" />
        <StatCard label="Aprovados" value={aprovados.length} color="#7c3aed" />
        <StatCard label="Livres" value={semVendedor.length} sub="disponiveis" color="#f59e0b" />
      </div>

      {msg && <div style={{ background: '#f0fdf4', border: '1px solid #86efac', borderRadius: 8, padding: '10px 16px', fontSize: 13, color: '#15803d' }}>{msg}</div>}

      {/* ABA PEDIDOS */}
      {aba === 'pedidos' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Pedidos dos meus Clientes</div>
          {pedidos.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhum pedido ainda. Os pedidos aparecem quando seus clientes finalizam o carrinho.</div>}
          <div className="portal-table-scroll">
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
                      <div style={{ fontSize: 11, color: '#6b7280' }}>{p.cadastro_email}</div>
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
                        {PEDIDO_STATUS_LABEL[p.status] || p.status}
                      </span>
                    </td>
                    <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{formatDate(p.created_at)}</td>
                    <td style={{ padding: '10px 14px' }}>
                      <select value={p.status} disabled={loadingPedido === p.id} onChange={e => marcarPedido(p.id, e.target.value)}
                        style={{ background: cc.bg, color: cc.text, border: '1px solid #d1d5db', borderRadius: 6, padding: '5px 8px', fontSize: 11, fontWeight: 700, fontFamily: 'inherit', cursor: 'pointer' }}>
                        <option value="em_atendimento">Em Atendimento</option>
                        <option value="negociacao">Negociação</option>
                        <option value="pago">Pago</option>
                        <option value="cancelado">Cancelado</option>
                      </select>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ABA INDICACOES */}
      {aba === 'indicacoes' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Pacientes Indicados pelos meus Médicos</div>
          {indicacoes.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhuma indicação ainda. Copie o link de indicação de um médico aprovado para começar.</div>}
          <div className="portal-table-scroll">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                {['Paciente', 'Contato', 'Médico Indicador', 'Data'].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {indicacoes.map(i => (
                <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ fontWeight: 600, color: '#111827' }}>{i.nome} {i.sobrenome}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{i.email || '—'}</div>
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    {i.whatsapp && (
                      <a href={`https://wa.me/${i.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                        style={{ fontSize: 12, color: '#25D366', textDecoration: 'none', fontWeight: 600 }}>
                        {i.whatsapp}
                      </a>
                    )}
                  </td>
                  <td style={{ padding: '10px 14px', color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>{i.medico_nome}</td>
                  <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{formatDate(i.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      )}

      {/* ABA LEADS */}
      {aba === 'leads' && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {[['meus', `Meus (${meusLeads.length})`], ['livres', `Livres (${semVendedor.length})`], ['analise', `Em Analise (${emAnalise.length})`], ['aprovados', 'Aprovados']].map(([v, l]) => (
              <button key={v} onClick={() => setFiltro(v)}
                style={{ padding: '6px 14px', borderRadius: 20, border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: filtro === v ? 700 : 500, background: filtro === v ? '#111827' : '#f3f4f6', color: filtro === v ? '#fff' : '#374151', fontFamily: 'inherit' }}>
                {l}
              </button>
            ))}
          </div>
          <div className="portal-table-scroll">
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
                <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhum lead neste filtro.</td></tr>
              )}
              {visivel.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer' }}
                  onClick={() => setSelectedLead(l)}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontWeight: 700, color: '#111827' }}>{l.nome} {l.sobrenome}</div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{l.email}</div>
                    {l.obs && <div style={{ fontSize: 11, color: '#7c3aed', marginTop: 2 }}>📝 Com anotacao</div>}
                    <TagsLead tags={l.tags} />
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
                    <div style={{ fontSize: 11, color: '#6b7280' }}>{l.crm || 'Sem CRM'}</div>
                  </td>
                  <td style={{ padding: '11px 14px', color: '#6b7280', fontSize: 12 }}>{formatDate(l.created_at)}</td>
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
        </div>
      )}
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
  const [aba, setAba] = useState<'dashboard' | 'leads' | 'pedidos' | 'indicacoes' | 'indicacoes-medicas' | 'financeiro' | 'mentoria' | 'blog' | 'rastreio'>('leads');
  const [buscaMedico, setBuscaMedico] = useState('');
  const [buscaIndicacao, setBuscaIndicacao] = useState('');
  const [filtroEtiqueta, setFiltroEtiqueta] = useState('todas');

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

  const vendedores = equipe.filter(e => e.cargo === 'vendedor' && e.ativo);
  const perf = vendedores.map(v => ({
    ...v,
    leads: lista.filter(l => l.vendedor_id === v.id).length,
    aprovados: lista.filter(l => l.vendedor_id === v.id && l.status === 'aprovado').length,
    analise: lista.filter(l => l.vendedor_id === v.id && l.status === 'em_analise').length,
    pedidosVendidos: pedidos.filter(p => p.vendedor_id === v.id && p.status === 'pago').length,
    valorVendido: pedidos.filter(p => p.vendedor_id === v.id && p.status === 'pago').reduce((s, p) => s + p.preco, 0),
  }));

  async function carregarPedidos() {
    const r = await fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } });
    if (r.ok) setPedidos(await r.json());
    setAba('pedidos');
  }

  async function carregarIndicacoes(destino: 'indicacoes' | 'indicacoes-medicas' = 'indicacoes') {
    const r = await fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } });
    if (r.ok) setIndicacoes(await r.json());
    setAba(destino);
  }

  async function carregarDashboard() {
    setAba('dashboard');
    setLoadingDashboard(true);
    try {
      const [rp, ri, rprod, rcfg] = await Promise.all([
        pedidos.length === 0 ? fetch('/api/portal/pedidos', { headers: { 'x-member-token': token } }) : null,
        indicacoes.length === 0 ? fetch('/api/portal/indicacoes', { headers: { 'x-member-token': token } }) : null,
        fetch('/api/portal/produtos', { headers: { 'x-member-token': token } }),
        fetch('/api/portal/config-summary', { headers: { 'x-member-token': token } }),
      ]);
      if (rp?.ok) setPedidos(await rp.json());
      if (ri?.ok) setIndicacoes(await ri.json());
      if (rprod.ok) setProdutosDash(await rprod.json());
      if (rcfg.ok) setConfigDash(await rcfg.json());
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
        leads: () => setAba('leads'),
        pedidos: carregarPedidos,
        indicacoes: () => carregarIndicacoes('indicacoes'),
        'indicacoes-medicas': () => carregarIndicacoes('indicacoes-medicas'),
        financeiro: carregarFinanceiro,
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
      {!['dashboard', 'financeiro', 'mentoria', 'blog', 'rastreio'].includes(aba) && (
        <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
          <StatCard label="Total Leads" value={lista.length} color="#111827" />
          <StatCard label="Pendentes" value={pendentes.length} color="#f59e0b" />
          <StatCard label="Em Analise" value={emAnalise.length} sub="solicitacoes" color="#3b82f6" />
          <StatCard label="Aprovados" value={aprovados.length} color="#16a34a" />
          <StatCard label="Rejeitados" value={rejeitados.length} color="#dc2626" />
        </div>
      )}

      {/* ABA DASHBOARD (identico ao /admin) */}
      {aba === 'dashboard' && (
        loadingDashboard ? (
          <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
        ) : (
          <DashboardOverview
            cadastros={lista} pedidos={pedidos} equipe={equipe} produtos={produtosDash} config={configDash}
          />
        )
      )}

      {/* ABA PEDIDOS */}
      {aba === 'pedidos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
            <StatCard label="Total Pedidos" value={totalPedidos} color="#111827" />
            <StatCard label="Valor Total" value={`R$ ${valorPedidos.toFixed(2)}`} color="#6b7280" />
            <StatCard label="Pagos" value={pedidosVendidos.length} color="#16a34a" />
            <StatCard label="Valor Pago" value={`R$ ${pedidosVendidos.reduce((s,p) => s+p.preco,0).toFixed(2)}`} color="#16a34a" />
          </div>

          {/* Performance vendedores com pedidos */}
          {perf.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Performance por Vendedor</div>
              <div className="portal-table-scroll">
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                    {['Vendedor', 'Leads', 'Aprovados', 'Pedidos Pagos', 'Valor Pago'].map(h => (
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
            </div>
          )}

          {/* Tabela pedidos */}
          <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
            <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Todos os Pedidos</div>
            {pedidos.length === 0 && <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhum pedido ainda.</div>}
            <div className="portal-table-scroll">
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
                          {PEDIDO_STATUS_LABEL[p.status] || p.status}
                        </span>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{formatDate(p.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ABA INDICACOES */}
      {aba === 'indicacoes' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <input value={buscaIndicacao} onChange={e => setBuscaIndicacao(e.target.value)}
          placeholder="Buscar por médico indicador ou paciente indicado..."
          style={{ maxWidth: 380, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
        {(() => {
          const indicacoesPacientes = indicacoes.filter(i => i.tipo !== 'medico');
          const q = buscaIndicacao.trim().toLowerCase();
          const indicacoesFiltradas = !q ? indicacoesPacientes : indicacoesPacientes.filter(i =>
            `${i.medico_nome} ${i.nome} ${i.sobrenome} ${i.email || ''}`.toLowerCase().includes(q));

          const porMedico = new Map<string, number>();
          indicacoesFiltradas.forEach(i => porMedico.set(i.medico_nome, (porMedico.get(i.medico_nome) || 0) + 1));
          const ranking = [...porMedico.entries()].sort((a, b) => b[1] - a[1]);
          const maxIndic = Math.max(...ranking.map(([, n]) => n), 1);

          return (
            <>
              {ranking.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Indicações por Médico</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ranking.map(([medico, n]) => (
                      <div key={medico}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: '#374151', fontWeight: 600 }}>{medico}</span>
                          <span style={{ color: '#7c3aed', fontWeight: 700 }}>{n} indicaç{n === 1 ? 'ão' : 'ões'}</span>
                        </div>
                        <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                          <div style={{ background: '#7c3aed', borderRadius: 4, height: '100%', width: `${(n / maxIndic) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Todas as Indicações de Pacientes</div>
                {indicacoesFiltradas.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                    {indicacoesPacientes.length === 0 ? 'Nenhuma indicação ainda.' : 'Nenhuma indicação encontrada para essa busca.'}
                  </div>
                )}
                <div className="portal-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Paciente', 'Contato', 'Médico Indicador', 'Data'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {indicacoesFiltradas.map(i => (
                      <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{i.nome} {i.sobrenome}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{i.email || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {i.whatsapp && (
                            <a href={`https://wa.me/${i.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                              style={{ fontSize: 12, color: '#25D366', textDecoration: 'none', fontWeight: 600 }}>
                              {i.whatsapp}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#7c3aed', fontWeight: 700, fontSize: 12 }}>{i.medico_nome}</td>
                        <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{formatDate(i.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          );
        })()}
        </div>
      )}

      {/* ABA INDICACOES MEDICAS */}
      {aba === 'indicacoes-medicas' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        <input value={buscaIndicacao} onChange={e => setBuscaIndicacao(e.target.value)}
          placeholder="Buscar por médico indicador, indicado ou CRM..."
          style={{ maxWidth: 380, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
        {(() => {
          const indicacoesMedicas = indicacoes.filter(i => i.tipo === 'medico');
          const q = buscaIndicacao.trim().toLowerCase();
          const indicacoesFiltradas = !q ? indicacoesMedicas : indicacoesMedicas.filter(i =>
            `${i.medico_nome} ${i.nome} ${i.sobrenome} ${i.email || ''} ${i.crm || ''}`.toLowerCase().includes(q));

          const porMedico = new Map<string, number>();
          indicacoesFiltradas.forEach(i => porMedico.set(i.medico_nome, (porMedico.get(i.medico_nome) || 0) + 1));
          const ranking = [...porMedico.entries()].sort((a, b) => b[1] - a[1]);
          const maxIndic = Math.max(...ranking.map(([, n]) => n), 1);

          return (
            <>
              {ranking.length > 0 && (
                <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 24 }}>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 16 }}>Indicações Médicas por Médico</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {ranking.map(([medico, n]) => (
                      <div key={medico}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                          <span style={{ color: '#374151', fontWeight: 600 }}>{medico}</span>
                          <span style={{ color: '#0891b2', fontWeight: 700 }}>{n} indicaç{n === 1 ? 'ão' : 'ões'}</span>
                        </div>
                        <div style={{ background: '#f3f4f6', borderRadius: 4, height: 6 }}>
                          <div style={{ background: '#0891b2', borderRadius: 4, height: '100%', width: `${(n / maxIndic) * 100}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Todas as Indicações Médicas</div>
                {indicacoesFiltradas.length === 0 && (
                  <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>
                    {indicacoesMedicas.length === 0 ? 'Nenhuma indicação médica ainda.' : 'Nenhuma indicação encontrada para essa busca.'}
                  </div>
                )}
                <div className="portal-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Médico Indicado', 'CRM', 'Contato', 'Médico Indicador', 'Data'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {indicacoesFiltradas.map(i => (
                      <tr key={i.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontWeight: 600, color: '#111827' }}>{i.nome} {i.sobrenome}</div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>{i.email || '—'}</div>
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6b7280' }}>{i.crm || '—'}</td>
                        <td style={{ padding: '10px 14px' }}>
                          {i.whatsapp && (
                            <a href={`https://wa.me/${i.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                              style={{ fontSize: 12, color: '#25D366', textDecoration: 'none', fontWeight: 600 }}>
                              {i.whatsapp}
                            </a>
                          )}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#0891b2', fontWeight: 700, fontSize: 12 }}>{i.medico_nome}</td>
                        <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{formatDate(i.created_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>
            </>
          );
        })()}
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
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            <div className="portal-grid-auto" style={{ display: 'grid', gap: 14 }}>
              <StatCard label="Total Entradas" value={`R$ ${totalEntradas.toFixed(2)}`} color="#16a34a" />
              <StatCard label="Total Saídas" value={`R$ ${totalSaidas.toFixed(2)}`} color="#dc2626" />
              <StatCard label="Saldo" value={`R$ ${saldo.toFixed(2)}`} color={saldo >= 0 ? '#4f46e5' : '#dc2626'} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 20 }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Entradas por Categoria</div>
                <HBarChart color="#16a34a" emptyLabel="Sem entradas ainda." items={porCategoria('entrada')} />
              </div>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 22 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 14 }}>Saídas por Categoria</div>
                <HBarChart color="#dc2626" emptyLabel="Sem saídas ainda." items={porCategoria('saida')} />
              </div>
            </div>

            <div className="portal-split-380" style={{ display: 'grid', gap: 20, alignItems: 'start' }}>
              <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
                <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Lançamentos</div>
                {loadingDespesas ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
                ) : despesas.length === 0 ? (
                  <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhum lançamento ainda.</div>
                ) : (
                  <div className="portal-table-scroll">
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        {['Data', 'Tipo', 'Categoria', 'Descrição', 'Valor', 'Ações'].map(h => (
                          <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {despesas.map(d => (
                        <tr key={d.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                          <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12, whiteSpace: 'nowrap' }}>{new Date(d.data + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: d.tipo === 'entrada' ? '#dcfce7' : '#fee2e2', color: d.tipo === 'entrada' ? '#15803d' : '#dc2626' }}>
                              {d.tipo === 'entrada' ? 'Entrada' : 'Saída'}
                            </span>
                          </td>
                          <td style={{ padding: '10px 14px', color: '#374151' }}>{d.categoria}</td>
                          <td style={{ padding: '10px 14px', color: '#6b7280' }}>{d.descricao}</td>
                          <td style={{ padding: '10px 14px', fontWeight: 700, color: d.tipo === 'entrada' ? '#16a34a' : '#dc2626' }}>R$ {d.valor.toFixed(2)}</td>
                          <td style={{ padding: '10px 14px' }}>
                            <button onClick={() => setEditandoDespesa(d)}
                              style={{ background: '#eff6ff', color: '#1d4ed8', border: '1px solid #bfdbfe', padding: '5px 11px', borderRadius: 5, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit' }}>
                              Editar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                )}
              </div>

              <div style={{ position: 'sticky', top: 24, background: '#fff', border: `1px solid ${editandoDespesa ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: 22 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{editandoDespesa ? 'Editar Lançamento' : 'Novo Lançamento'}</div>
                  {editandoDespesa && <button type="button" onClick={() => setEditandoDespesa(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>-</button>}
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
                          style={{ flex: 1, background: atual === t ? cor : '#fff', color: atual === t ? '#fff' : cor, border: `1px solid ${cor}`, padding: '9px 0', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 700, fontFamily: 'inherit' }}>
                          {t === 'entrada' ? 'Entrada' : 'Saída'}
                        </button>
                      );
                    })}
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria *</label>
                    <select value={editandoDespesa ? editandoDespesa.categoria : novaDespesa.categoria}
                      onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, categoria: e.target.value })) : setNovaDespesa(v => ({ ...v, categoria: e.target.value }))}
                      required style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}>
                      <option value="">Selecione...</option>
                      {categoriasFinanceiras.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
                      <input id="nova-cat-financeira" placeholder="Nova categoria..." style={{ flex: 1, border: '1px solid #d1d5db', borderRadius: 6, padding: '6px 10px', fontSize: 12, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
                      <button type="button" onClick={() => {
                        const el = document.getElementById('nova-cat-financeira') as HTMLInputElement | null;
                        if (el && el.value.trim()) { adicionarCategoriaFinanceira(el.value); el.value = ''; }
                      }} style={{ background: '#f9fafb', color: '#374151', border: '1px solid #d1d5db', padding: '6px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'inherit', fontWeight: 600 }}>
                        + Categoria
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Descrição *</label>
                    <input value={editandoDespesa ? editandoDespesa.descricao : novaDespesa.descricao}
                      onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, descricao: e.target.value })) : setNovaDespesa(v => ({ ...v, descricao: e.target.value }))}
                      required placeholder="Ex: Comissão vendedor, Almoço com cliente..."
                      style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Valor (R$) *</label>
                      <input type="number" min="0" step="0.01"
                        value={editandoDespesa ? editandoDespesa.valor : novaDespesa.valor}
                        onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, valor: parseFloat(e.target.value) || 0 })) : setNovaDespesa(v => ({ ...v, valor: e.target.value }))}
                        required placeholder="0.00"
                        style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Data *</label>
                      <input type="date" value={editandoDespesa ? editandoDespesa.data : novaDespesa.data}
                        onChange={e => editandoDespesa ? setEditandoDespesa(v => v && ({ ...v, data: e.target.value })) : setNovaDespesa(v => ({ ...v, data: e.target.value }))}
                        required style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
                    </div>
                  </div>
                  <button type="submit" style={{ background: '#111827', color: '#fff', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
                    {editandoDespesa ? 'Salvar Alterações' : 'Registrar Lançamento'}
                  </button>
                </form>
              </div>
            </div>
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
              <StatCard label="Cliques totais" value={mentoriaCliques.length} color="#0d9488" />
              <StatCard label="Médicos" value={porMedico.size} color="#4f46e5" />
            </div>
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              {loadingMentoria ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
              ) : mentoriaCliques.length === 0 ? (
                <div style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Ninguém clicou no card Mentoria ainda.</div>
              ) : (
                <div className="portal-table-scroll">
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                      {['Médico', 'WhatsApp', 'E-mail', 'Quando'].map(h => (
                        <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {mentoriaCliques.map(c => {
                      const medico = lista.find(l => l.id === c.medico_id);
                      return (
                      <tr key={c.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#111827' }}>{c.medico_nome}</td>
                        <td style={{ padding: '10px 14px', color: '#374151' }}>{medico?.whatsapp || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#374151' }}>{medico?.email || '—'}</td>
                        <td style={{ padding: '10px 14px', color: '#6b7280', fontSize: 12 }}>{new Date(c.created_at).toLocaleString('pt-BR')}</td>
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
              <div style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>
                Blog <span style={{ color: '#6b7280', fontSize: 13, fontWeight: 400 }}>({artigos.filter(a => a.publicado).length}/{artigos.length} publicados)</span>
              </div>
            </div>
            {msgBlog && (
              <div style={{ marginBottom: 14, background: msgBlog.startsWith('OK:') ? '#f0fdf4' : '#fef2f2', border: `1px solid ${msgBlog.startsWith('OK:') ? '#86efac' : '#fecaca'}`, color: msgBlog.startsWith('OK:') ? '#15803d' : '#dc2626', padding: '10px 14px', borderRadius: 8, fontSize: 13 }}>
                {msgBlog.replace(/^(OK|R):\s*/, '')}
              </div>
            )}
            {loadingArtigos ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280' }}>Carregando...</div>
            ) : artigos.length === 0 ? (
              <div style={{ padding: 40, textAlign: 'center', color: '#6b7280', background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                Nenhum artigo. Crie um ao lado.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {artigos.map(a => (
                  <div key={a.id} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden', display: 'flex', opacity: a.publicado ? 1 : 0.7 }}>
                    {a.imagem ? (
                      <div style={{ width: 90, flexShrink: 0, background: '#f9fafb' }}>
                        <img src={a.imagem} alt={a.titulo} style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                      </div>
                    ) : (
                      <div style={{ width: 70, flexShrink: 0, background: 'linear-gradient(135deg, #0f172a, #db2777)' }} />
                    )}
                    <div style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111827' }}>{a.titulo}</div>
                        <span style={{ padding: '2px 8px', borderRadius: 12, fontSize: 10, fontWeight: 700, background: a.publicado ? '#dcfce7' : '#f3f4f6', color: a.publicado ? '#15803d' : '#6b7280' }}>
                          {a.publicado ? 'Publicado' : 'Rascunho'}
                        </span>
                      </div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                        <button onClick={() => togglePublicarArtigo(a)}
                          style={{ background: '#f9fafb', color: '#374151', border: '1px solid #e5e7eb', padding: '5px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'inherit', fontWeight: 600 }}>
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

          <div style={{ position: 'sticky', top: 24, background: '#fff', border: `1px solid ${editandoArtigo ? '#bbf7d0' : '#e5e7eb'}`, borderRadius: 12, padding: 22 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>{editandoArtigo ? 'Editar Artigo' : 'Novo Artigo'}</div>
              {editandoArtigo && <button type="button" onClick={() => setEditandoArtigo(null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 20 }}>-</button>}
            </div>
            <form onSubmit={salvarArtigo} style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Título *</label>
                <input value={editandoArtigo ? editandoArtigo.titulo : novoArtigo.titulo}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, titulo: e.target.value })) : setNovoArtigo(a => ({ ...a, titulo: e.target.value }))}
                  required placeholder="Título do artigo"
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Categoria</label>
                <select value={editandoArtigo ? (editandoArtigo.categoria || '') : novoArtigo.categoria}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, categoria: e.target.value })) : setNovoArtigo(a => ({ ...a, categoria: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box', cursor: 'pointer' }}>
                  <option value="">Selecione...</option>
                  {categoriasBlog.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Imagem</label>
                <div style={{ display: 'flex', gap: 8 }}>
                  <input value={editandoArtigo ? (editandoArtigo.imagem || '') : novoArtigo.imagem}
                    onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, imagem: e.target.value })) : setNovoArtigo(a => ({ ...a, imagem: e.target.value }))}
                    placeholder="URL da imagem"
                    style={{ flex: 1, minWidth: 0, border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
                  <label style={{ background: uploadandoArtigo ? '#e5e7eb' : '#f9fafb', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: '#374151', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
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
                <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Conteúdo</label>
                <textarea value={editandoArtigo ? editandoArtigo.conteudo : novoArtigo.conteudo}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, conteudo: e.target.value })) : setNovoArtigo(a => ({ ...a, conteudo: e.target.value }))}
                  rows={8} placeholder="Texto do artigo..."
                  style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 12px', fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box', resize: 'vertical' }} />
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#374151', cursor: 'pointer' }}>
                <input type="checkbox" checked={editandoArtigo ? editandoArtigo.publicado : novoArtigo.publicado}
                  onChange={e => editandoArtigo ? setEditandoArtigo(a => a && ({ ...a, publicado: e.target.checked })) : setNovoArtigo(a => ({ ...a, publicado: e.target.checked }))} />
                Publicar imediatamente
              </label>
              <button type="submit" style={{ background: '#111827', color: '#fff', fontWeight: 700, padding: '12px 0', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 14, fontFamily: 'inherit' }}>
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
          ? (rastreioSelecionado.tipo === 'medico' ? `55${(rastreioSelecionado.whatsapp || '').replace(/\D/g, '')}` : (rastreioSelecionado.whatsapp || '').replace(/\D/g, ''))
          : '';

        return (
          <div style={{ maxWidth: 720 }}>
            <h2 style={{ fontSize: 18, fontWeight: 800, color: '#111827', marginBottom: 6, marginTop: 0 }}>Link de Rastreio</h2>
            <p style={{ color: '#6b7280', fontSize: 13, marginBottom: 20 }}>
              Encontre o médico ou paciente, cole o link de rastreio do pedido e envie pelo WhatsApp.
            </p>

            {!rastreioSelecionado ? (
              <>
                <input value={buscaRastreio} onChange={e => setBuscaRastreio(e.target.value)}
                  placeholder="Buscar médico ou paciente por nome..." autoFocus
                  style={{ maxWidth: 420, border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box', marginBottom: 16, display: 'block', width: '100%' }} />

                {q.length < 2 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                    Digite ao menos 2 letras do nome para buscar.
                  </div>
                ) : resultados.length === 0 ? (
                  <div style={{ padding: 40, textAlign: 'center', color: '#9ca3af', fontSize: 13, background: '#f9fafb', borderRadius: 12, border: '1px dashed #d1d5db' }}>
                    Nenhum médico ou paciente encontrado para &quot;{buscaRastreio}&quot;.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {resultados.map(r => (
                      <button key={`${r.tipo}-${r.id}`} onClick={() => { setRastreioSelecionado(r); setLinkRastreio(''); }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                        <div>
                          <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{r.nome}</div>
                          <div style={{ color: '#6b7280', fontSize: 12 }}>{r.whatsapp || 'sem WhatsApp cadastrado'}</div>
                        </div>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
                          background: r.tipo === 'medico' ? '#eff6ff' : '#f0fdf4', color: r.tipo === 'medico' ? '#1d4ed8' : '#15803d',
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
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '12px 16px' }}>
                  <div>
                    <div style={{ fontWeight: 700, color: '#111827', fontSize: 14 }}>{rastreioSelecionado.nome}</div>
                    <div style={{ color: '#6b7280', fontSize: 12 }}>{rastreioSelecionado.whatsapp || 'sem WhatsApp cadastrado'} · {rastreioSelecionado.tipo === 'medico' ? 'Médico' : 'Paciente'}</div>
                  </div>
                  <button onClick={() => { setRastreioSelecionado(null); setBuscaRastreio(''); setLinkRastreio(''); }}
                    style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '7px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600, fontFamily: 'inherit' }}>
                    Trocar
                  </button>
                </div>

                <div>
                  <label style={{ display: 'block', marginBottom: 5, fontSize: 11, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Link de rastreio *</label>
                  <input value={linkRastreio} onChange={e => setLinkRastreio(e.target.value)}
                    placeholder="https://..." style={{ width: '100%', border: '1px solid #d1d5db', borderRadius: 8, padding: '10px 13px', fontSize: 14, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
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
                    style={{ background: '#fff', color: '#374151', border: '1px solid #d1d5db', padding: '11px 18px', borderRadius: 8, cursor: linkRastreio.trim() ? 'pointer' : 'not-allowed', fontSize: 13, fontWeight: 600, fontFamily: 'inherit', opacity: linkRastreio.trim() ? 1 : 0.5 }}>
                    Copiar mensagem
                  </button>
                  <a href={linkRastreio.trim() && numeroWhats ? `https://wa.me/${numeroWhats}?text=${encodeURIComponent(mensagem)}` : undefined}
                    target="_blank" rel="noreferrer"
                    onClick={e => { if (!linkRastreio.trim() || !numeroWhats) e.preventDefault(); }}
                    style={{
                      background: '#fff', color: linkRastreio.trim() && numeroWhats ? '#16a34a' : '#9ca3af',
                      border: `1px solid ${linkRastreio.trim() && numeroWhats ? '#86efac' : '#e5e7eb'}`, padding: '11px 18px', borderRadius: 8, cursor: linkRastreio.trim() && numeroWhats ? 'pointer' : 'not-allowed',
                      fontSize: 13, fontWeight: 700, fontFamily: 'inherit', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 8,
                    }}>
                    Abrir WhatsApp →
                  </a>
                </div>
                <div style={{ color: '#9ca3af', fontSize: 11, marginTop: -6 }}>
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
          {perf.length > 0 && (
            <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, overflow: 'hidden' }}>
              <div style={{ padding: '14px 20px', borderBottom: '1px solid #f3f4f6', fontWeight: 700, fontSize: 14, color: '#111827' }}>Performance Vendedores</div>
              <div className="portal-table-scroll">
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
                          : <span style={{ color: '#6b7280' }}>—</span>}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#15803d', fontWeight: 700 }}>{v.aprovados}</td>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{v.leads > 0 ? `${Math.round((v.aprovados / v.leads) * 100)}%` : '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              </div>
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
            <div style={{ padding: '12px 20px', borderBottom: '1px solid #f3f4f6', display: 'flex', flexDirection: 'column', gap: 10 }}>
              <input value={buscaMedico} onChange={e => setBuscaMedico(e.target.value)}
                placeholder="Buscar médico por nome, e-mail, WhatsApp ou CRM..."
                style={{ width: '100%', maxWidth: 380, border: '1px solid #d1d5db', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', color: '#111827', background: '#fff', boxSizing: 'border-box' }} />
              {todasEtiquetas.length > 0 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: 0.5, marginRight: 2 }}>Etiqueta:</span>
                  <button onClick={() => setFiltroEtiqueta('todas')}
                    style={{ background: filtroEtiqueta === 'todas' ? '#111827' : '#fff', color: filtroEtiqueta === 'todas' ? '#fff' : '#374151', border: `1px solid ${filtroEtiqueta === 'todas' ? '#111827' : '#d1d5db'}`, padding: '3px 12px', borderRadius: 20, cursor: 'pointer', fontWeight: filtroEtiqueta === 'todas' ? 700 : 500, fontFamily: 'inherit', fontSize: 12 }}>
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
                <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                  {['Paciente', 'Status', 'Vendedor', 'Solicitacao', 'Data'].map(h => (
                    <th key={h} style={{ padding: '11px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#6b7280', textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visivel.length === 0 && <tr><td colSpan={5} style={{ padding: 32, textAlign: 'center', color: '#6b7280' }}>Nenhum lead.</td></tr>}
                {visivel.map(l => {
                  const vendNome = equipe.find(e => e.id === l.vendedor_id)?.nome;
                  return (
                    <tr key={l.id} onClick={() => setSelectedLead(l)}
                      style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: l.solicitacao ? '#fffbeb' : '#fff' }}>
                      <td style={{ padding: '11px 14px' }}>
                        <div style={{ fontWeight: 700, color: '#111827' }}>{l.nome} {l.sobrenome}</div>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>{l.email}</div>
                        <TagsLead tags={l.tags} />
                      </td>
                      <td style={{ padding: '11px 14px' }}><Badge status={l.status} map={STATUS_COLOR} /></td>
                      <td style={{ padding: '11px 14px', color: '#111827', fontSize: 12 }}>{vendNome || <span style={{ color: '#6b7280' }}>Livre</span>}</td>
                      <td style={{ padding: '11px 14px' }}>
                        {l.solicitacao ? (
                          <span style={{ padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: l.solicitacao === 'aprovar' ? '#dcfce7' : '#fef2f2', color: l.solicitacao === 'aprovar' ? '#15803d' : '#dc2626' }}>
                            Sol. {l.solicitacao === 'aprovar' ? 'Aprovacao' : 'Rejeicao'}
                          </span>
                        ) : <span style={{ color: '#6b7280', fontSize: 12, fontWeight: 600 }}>—</span>}
                      </td>
                      <td style={{ padding: '11px 14px', color: '#374151', fontSize: 12 }}>{formatDate(l.created_at)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}
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
  const cc = CARGO_COLOR[cargo] || { bg: '#f3f4f6', text: '#374151' };

  useEffect(() => {
    const enviar = () => fetch('/api/portal/heartbeat', { method: 'POST', headers: { 'x-member-token': token } }).catch(() => {});
    enviar();
    const id = setInterval(enviar, 45000);
    return () => clearInterval(id);
  }, [token]);

  return (
    <div style={{ minHeight: '100vh', background: '#f8fafc' }}>
      <style>{`
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
        @media (max-width: 760px) { .portal-navitem { width: auto; white-space: nowrap; } }

        .portal-grid-auto { grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); }
        .portal-table-scroll { overflow-x: auto; }
        .portal-split-380 { grid-template-columns: 1fr 380px; }
        @media (max-width: 900px) { .portal-split-380 { grid-template-columns: 1fr; } }
      `}</style>
      <header className="portal-header" style={{ background: '#fff', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <img src={logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg'}
            alt="PeptideZ" style={{ height: 40, maxWidth: 160, objectFit: 'contain' }} />
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

      <main className="portal-main" style={{ maxWidth: 1200, margin: '0 auto' }}>
        <h1 style={{ fontSize: 22, fontWeight: 800, color: '#111827', margin: '0 0 24px' }}>
          {cargo === 'vendedor' && 'Meus Leads & Pedidos'}
          {cargo === 'gerente' && 'Dashboard — Gerente'}
          {cargo === 'superadmin' && 'Painel Completo'}
        </h1>

        {cargo === 'vendedor' && <VendedorView membro={membro} leads={leads} equipe={equipe} token={token} />}
        {cargo === 'gerente' && <GerenteView membro={membro} leads={leads} equipe={equipe} token={token} logo={logo} />}
        {cargo === 'superadmin' && <GerenteView membro={membro} leads={leads} equipe={equipe} token={token} logo={logo} />}
      </main>
    </div>
  );
}
