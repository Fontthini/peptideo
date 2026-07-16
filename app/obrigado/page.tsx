import { mem_getConfig } from '@/lib/db-memory';

export default function Obrigado() {
  const cfg = mem_getConfig();
  const logo = cfg.logo || 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg';
  return (
    <div style={{ minHeight: '100vh', background: '#f9fafb', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>

      {/* Header strip */}
      <div style={{ position: 'fixed', top: 0, left: 0, right: 0, background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
        <img src={logo}
          alt="PeptideZ" style={{ height: 36, maxWidth: 140, objectFit: 'contain' }} />
        <span style={{ fontWeight: 800, fontSize: 15, color: '#111827' }}>PeptideZ Health</span>
      </div>

      <div style={{ maxWidth: 500, width: '100%' }}>
        <div style={{ width: 80, height: 80, background: '#dcfce7', border: '2px solid #86efac', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, margin: '0 auto 32px' }}>
          ✅
        </div>

        <h1 style={{ fontSize: 'clamp(28px, 5vw, 42px)', fontWeight: 900, marginBottom: 16, color: '#111827' }}>
          Cadastro Recebido!
        </h1>
        <p style={{ fontSize: 17, color: '#6b7280', lineHeight: 1.7, margin: '0 auto 40px' }}>
          Seu cadastro foi enviado com sucesso. Nossa equipe irá analisar seus dados e você receberá um <strong style={{ color: '#16a34a' }}>link de acesso exclusivo</strong> assim que for aprovado.
        </p>

        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: 28, marginBottom: 32, textAlign: 'left', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontSize: 15, fontWeight: 700, marginBottom: 18, color: '#111827', marginTop: 0 }}>Próximos passos:</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { num: '1', txt: 'Aguarde a análise do seu cadastro (geralmente em até 24h)' },
              { num: '2', txt: 'Você receberá um link de acesso personalizado por e-mail ou WhatsApp' },
              { num: '3', txt: 'Acesse a plataforma, explore o blog científico e a loja completa' },
            ].map(step => (
              <div key={step.num} style={{ display: 'flex', gap: 14, alignItems: 'flex-start' }}>
                <div style={{ width: 28, height: 28, background: '#16a34a', color: '#fff', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 13, flexShrink: 0 }}>{step.num}</div>
                <p style={{ color: '#6b7280', fontSize: 14, lineHeight: 1.55, margin: 0, paddingTop: 4 }}>{step.txt}</p>
              </div>
            ))}
          </div>
        </div>

        <a href="/" style={{ color: '#16a34a', textDecoration: 'none', fontSize: 14, fontWeight: 600 }}>← Voltar ao início</a>
      </div>

      <div style={{ marginTop: 60, color: '#9ca3af', fontSize: 12 }}>
        PeptideZ Health · Otimização Bioativa · Regeneração Celular
      </div>
    </div>
  );
}
