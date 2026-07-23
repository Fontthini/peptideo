'use client';
import { useState, useEffect } from 'react';

const DEFAULT_LOGO = 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg';
const DEFAULT_COR_PRIMARIA = '#111827';
const DEFAULT_COR_ACENTO = '#16a34a';

export default function IndicarMedicoClient({ token, medicoNome }: { token: string; medicoNome: string }) {
  const [form, setForm] = useState({ nome: '', sobrenome: '', whatsapp: '', email: '', endereco: '', crm: '' });
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState('');
  const [enviado, setEnviado] = useState(false);
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

  const handle = (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErro('');
    try {
      const res = await fetch('/api/indicacao-medico', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...form, token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao enviar');
      if (data.whatsapp_numero) {
        const msg = `Olá! Fui indicado(a) pelo(a) Dr(a). ${medicoNome} para conhecer a PeptideZ Health.\n\n👤 *Nome:* ${form.nome} ${form.sobrenome}\n🩺 *CRM:* ${form.crm}\n📱 *WhatsApp:* ${form.whatsapp}${form.email ? `\n📧 *E-mail:* ${form.email}` : ''}\n🏠 *Endereço:* ${form.endereco}`;
        window.open(`https://wa.me/${data.whatsapp_numero}?text=${encodeURIComponent(msg)}`, '_blank');
      }
      setEnviado(true);
    } catch (err: unknown) {
      setErro(err instanceof Error ? err.message : 'Erro ao enviar');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', background: '#fff', border: '1px solid #d1d5db', borderRadius: 8,
    padding: '13px 16px', color: '#111827', fontSize: 15, fontFamily: 'inherit',
    outline: 'none', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 700,
    color: '#374151', textTransform: 'uppercase', letterSpacing: '0.6px',
  };

  const { logo, corPrimaria, corAcento } = cfg;

  if (enviado) {
    return (
      <div style={{ minHeight: '100vh', background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: 24 }}>
        <div style={{ maxWidth: 440 }}>
          <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
          <h1 style={{ fontSize: 26, fontWeight: 800, marginBottom: 12, color: '#111827' }}>Cadastro Recebido!</h1>
          <p style={{ color: '#4b5563', fontSize: 15, lineHeight: 1.6 }}>
            Obrigado! Sua indicação do Dr(a). {medicoNome} foi registrada. Nossa equipe vai entrar em contato pelo WhatsApp em breve.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#ffffff', color: '#111827' }}>
      <header style={{ borderBottom: '1px solid #e5e7eb', padding: '14px 32px', display: 'flex', alignItems: 'center' }}>
        <img src={logo} alt="Logo" style={{ height: 44, maxWidth: 170, objectFit: 'contain', display: 'block' }} />
      </header>

      <section style={{ padding: '56px 24px 80px', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ display: 'inline-block', background: '#dcfce7', border: '1px solid #86efac', color: '#15803d', padding: '5px 16px', borderRadius: 20, fontSize: 11, fontWeight: 700, letterSpacing: 1.5, marginBottom: 16 }}>
            INDICAÇÃO ENTRE MÉDICOS
          </div>
          <h1 style={{ fontSize: 30, fontWeight: 900, marginBottom: 12, color: '#111827' }}>
            Você foi indicado(a) pelo(a)<br /><span style={{ color: corAcento }}>Dr(a). {medicoNome}</span>
          </h1>
          <p style={{ color: '#6b7280', fontSize: 15, lineHeight: 1.6 }}>
            Preencha seus dados para solicitar seu acesso à plataforma exclusiva PeptideZ Health.
          </p>
        </div>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 18, background: '#fff', border: '1px solid #e5e7eb', borderRadius: 16, padding: '32px 28px', boxShadow: '0 4px 16px rgba(0,0,0,0.06)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div>
              <label style={labelStyle}>Nome *</label>
              <input name="nome" type="text" placeholder="Maria" required value={form.nome} onChange={handle} style={inputStyle} />
            </div>
            <div>
              <label style={labelStyle}>Sobrenome</label>
              <input name="sobrenome" type="text" placeholder="Silva" value={form.sobrenome} onChange={handle} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={labelStyle}>CRM *</label>
            <input name="crm" type="text" placeholder="CRM/SP 123456" required value={form.crm} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>WhatsApp *</label>
            <input name="whatsapp" type="tel" placeholder="(11) 99999-9999" required value={form.whatsapp} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>E-mail <span style={{ color: '#9ca3af', fontWeight: 400, textTransform: 'none', fontSize: 11 }}>(opcional)</span></label>
            <input name="email" type="email" placeholder="maria@email.com" value={form.email} onChange={handle} style={inputStyle} />
          </div>

          <div>
            <label style={labelStyle}>Endereço *</label>
            <input name="endereco" type="text" placeholder="Rua das Flores, 123 – São Paulo, SP" required value={form.endereco} onChange={handle} style={inputStyle} />
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
            {loading ? 'Enviando...' : 'Enviar Cadastro →'}
          </button>
        </form>
      </section>

      <footer style={{ background: corPrimaria, color: '#9ca3af', padding: '32px 24px', textAlign: 'center' }}>
        <div style={{ fontWeight: 800, color: '#fff', fontSize: 17, marginBottom: 6 }}>PeptideZ Health</div>
        <p style={{ fontSize: 13, margin: 0 }}>Exclusivo para Prescrição Médica · Regeneração Celular · © 2026</p>
      </footer>
    </div>
  );
}
