'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const DEFAULT_LOGO = 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg';
const DEFAULT_COR_PRIMARIA = '#111827';
const DEFAULT_COR_ACENTO = '#16a34a';

const ONDE_CONHECEU = [
  'Google / Busca',
  'Instagram',
  'Facebook',
  'Indicação de Médico',
  'Blog PeptideZ',
  'WhatsApp',
  'Outro',
];

export default function LandingPage() {
  const router = useRouter();
  const [form, setForm] = useState({ nome: '', sobrenome: '', email: '', whatsapp: '', endereco: '', crm: '', onde_conheceu: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [cfg, setCfg] = useState({ logo: DEFAULT_LOGO, corPrimaria: DEFAULT_COR_PRIMARIA, corAcento: DEFAULT_COR_ACENTO });

  useEffect(() => {
    fetch('/api/config-public')
      .then(r => r.json())
      .then(d => setCfg({
        logo: d.logo || DEFAULT_LOGO,
        corPrimaria: d.corPrimaria || DEFAULT_COR_PRIMARIA,
        corAcento: d.corAcento || DEFAULT_COR_ACENTO,
      }))
      .catch(() => {});
  }, []);

  const handle = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/cadastro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao cadastrar');
      if (data.whatsapp_numero) {
        const msg = `✅ *Obrigado pelo seu cadastro — PeptideZ Health*\n\n👤 *Nome:* ${form.nome} ${form.sobrenome}\n📱 *WhatsApp:* ${form.whatsapp}\n📧 *E-mail:* ${form.email}\n🏠 *Endereço:* ${form.endereco}${form.crm ? `\n🩺 *CRM:* ${form.crm}` : ''}${form.onde_conheceu ? `\n📍 *Como conheceu:* ${form.onde_conheceu}` : ''}`;
        window.open(`https://wa.me/${data.whatsapp_numero}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      router.push('/obrigado');
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao cadastrar');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
    padding: '13px 16px', color: '#111827', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700,
    color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px',
  };

  const { logo, corPrimaria, corAcento } = cfg;

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827' }}>

      {/* Header */}
      <header style={{ borderBottom: '1px solid #e5e7eb', padding: '14px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, background: '#ffffff', zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <img src={logo} alt="Logo"
            style={{ height: 48, maxWidth: 180, objectFit: 'contain', display: 'block' }} />
        </div>
        <a href="#cadastro" style={{ background: corPrimaria, color: '#fff', padding: '9px 24px', borderRadius: 8, fontWeight: 700, fontSize: 13, textDecoration: 'none' }}>
          Solicitar Acesso
        </a>
      </header>

      {/* Hero */}
      <section style={{ padding: '90px 24px 70px', textAlign: 'center', background: '#f0fdf4', borderBottom: '1px solid #bbf7d0' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '6px 20px', borderRadius: 20, fontSize: 12, fontWeight: 700, letterSpacing: 1.5, marginBottom: 28 }}>
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: corAcento, display: 'inline-block' }} />
            EXCLUSIVO PARA PROFISSIONAIS DE SAÚDE
          </div>
          <h1 style={{ fontSize: 'clamp(34px, 6vw, 60px)', fontWeight: 900, lineHeight: 1.1, margin: '0 0 24px', color: '#111827' }}>
            Peptídeos de Alta Pureza<br />
            <span style={{ color: corAcento }}>Para Prescrição Médica</span>
          </h1>
          <p style={{ fontSize: 18, color: '#4b5563', lineHeight: 1.7, margin: '0 auto 44px', maxWidth: 560 }}>
            Plataforma exclusiva com blog especializado, produtos certificados ≥98% de pureza e checkout integrado. Acesso mediante aprovação.
          </p>
          <a href="#cadastro" style={{ background: corPrimaria, color: '#fff', padding: '16px 52px', borderRadius: 8, fontWeight: 700, fontSize: 16, textDecoration: 'none', display: 'inline-block' }}>
            Solicitar Acesso →
          </a>
        </div>
      </section>

      {/* O que são Peptídeos */}
      <section style={{ padding: '80px 24px', maxWidth: 1000, margin: '0 auto' }}>
        <h2 style={{ fontSize: 36, fontWeight: 900, textAlign: 'center', marginBottom: 12, color: '#111827' }}>O que são <span style={{ color: corAcento }}>Peptídeos?</span></h2>
        <p style={{ color: '#6b7280', textAlign: 'center', fontSize: 16, lineHeight: 1.7, maxWidth: 620, margin: '0 auto 56px' }}>
          Moléculas naturais com alto poder terapêutico, regulando processos fundamentais do organismo.
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(270px, 1fr))', gap: 20 }}>
          {[
            { icon: '🔬', titulo: 'Ciência de Ponta', desc: 'Moléculas formadas por aminoácidos que atuam como mensageiros celulares, regulando processos fundamentais do organismo.' },
            { icon: '⚡', titulo: 'Alta Bioatividade', desc: 'Ação precisa em receptores específicos, com menor índice de efeitos colaterais comparado a outras terapias.' },
            { icon: '🛡️', titulo: 'Segurança Comprovada', desc: 'Décadas de pesquisa clínica e uso médico supervisionado comprovam eficácia e segurança dos peptídeos terapêuticos.' },
            { icon: '📋', titulo: 'Prescrição Médica', desc: 'Indicados por médicos especializados. Nossa plataforma é exclusiva para profissionais habilitados.' },
            { icon: '🏆', titulo: 'Pureza Certificada', desc: 'Todos os peptídeos possuem laudo analítico de pureza ≥98%, com rastreabilidade completa e cadeia de frio.' },
            { icon: '🌿', titulo: 'Múltiplas Aplicações', desc: 'Emagrecimento, cognição, imunidade, libido, regeneração, anti-aging, sono e muito mais.' },
          ].map(item => (
            <div key={item.titulo} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
              <div style={{ fontSize: 36, marginBottom: 14 }}>{item.icon}</div>
              <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: '#111827' }}>{item.titulo}</h3>
              <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.65, margin: 0 }}>{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Categorias */}
      <section style={{ padding: '40px 24px 80px', background: '#f9fafb', borderTop: '1px solid #e5e7eb', borderBottom: '1px solid #e5e7eb' }}>
        <div style={{ maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{ fontSize: 30, fontWeight: 800, marginBottom: 10, color: '#111827' }}>Categorias Disponíveis</h2>
          <p style={{ color: '#6b7280', marginBottom: 36, fontSize: 14 }}>Após aprovação você terá acesso a toda a linha exclusiva</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center' }}>
            {['Emagrecimento','Libido','Regenerativos','Imunomodeladores','Cognição','Pele','Saúde do Sono','Anti-Aging','Estimulantes de GH','Mitocondriais'].map(cat => (
              <span key={cat} style={{ background: '#fff', border: '1px solid #d1d5db', color: '#374151', padding: '8px 20px', borderRadius: 20, fontSize: 13, fontWeight: 600 }}>{cat}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Formulário */}
      <section id="cadastro" style={{ padding: '80px 24px 100px', maxWidth: 620, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 44 }}>
          <div style={{ display: 'inline-block', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '5px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
            SOLICITAÇÃO DE ACESSO
          </div>
          <h2 style={{ fontSize: 36, fontWeight: 900, marginBottom: 12, color: '#111827' }}>Solicitar <span style={{ color: corAcento }}>Acesso</span></h2>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>Preencha o formulário. Nossa equipe analisará e enviará o link de acesso exclusivo.</p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '36px 32px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input name="nome" type="text" placeholder="João" required value={form.nome} onChange={handle} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sobrenome *</label>
              <input name="sobrenome" type="text" placeholder="Silva" required value={form.sobrenome} onChange={handle} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>E-mail *</label>
            <input name="email" type="email" placeholder="joao@clinica.com.br" required value={form.email} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Telefone (WhatsApp) *</label>
            <input name="whatsapp" type="tel" placeholder="(11) 99999-9999" required value={form.whatsapp} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Endereço (Clínica / Consultório) *</label>
            <input name="endereco" type="text" placeholder="Rua das Flores, 123 – São Paulo, SP" required value={form.endereco} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>CRM Médico *</label>
            <input name="crm" type="text" placeholder="CRM/SP 123456" value={form.crm} onChange={handle} required style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Onde conheceu o site? <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
            <select name="onde_conheceu" value={form.onde_conheceu} onChange={handle}
              style={{ ...inputStyle, appearance: 'none', cursor: 'pointer' }}>
              <option value="">Selecione...</option>
              {ONDE_CONHECEU.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
          </div>

          {erro && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: 14, borderRadius: 8, fontSize: 14 }}>
              {erro}
            </div>
          )}

          <button type="submit" disabled={loading} style={{
            background: loading ? '#9ca3af' : corPrimaria, color: '#fff',
            fontWeight: 700, padding: '15px 0', borderRadius: 8, border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer', fontSize: 16, fontFamily: 'inherit',
          }}>
            {loading ? 'Enviando...' : 'Solicitar Acesso →'}
          </button>

          <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', margin: 0 }}>
            Ao se cadastrar, você confirma ser profissional de saúde habilitado e concorda com os termos de uso.
          </p>
        </form>
      </section>

      <footer style={{ background: corPrimaria, color: '#9ca3af', borderTop: '1px solid #e5e7eb', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, color: '#fff', fontSize: 17, marginBottom: 6 }}>PeptideZ Health</div>
        <p style={{ fontSize: 13, margin: 0 }}>Exclusivo para Prescrição Médica · Regeneração Celular · © 2026</p>
      </footer>
    </div>
  );
}
