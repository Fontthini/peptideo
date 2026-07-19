import type { Metadata } from "next";
import "./globals.css";
import { mem_getConfig } from '@/lib/db-memory';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = {
  title: "PeptideZ Health | Otimização Bioativa",
  description: "Plataforma exclusiva de peptídeos para prescrição médica. Regeneração celular e otimização da saúde.",
};

const DEFAULT_LOGO = 'https://peptideos.drfamily.com.br/wp-content/uploads/2026/06/cropped-pep.jpg';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const cfg = mem_getConfig();
  const logo = cfg.logo || DEFAULT_LOGO;
  const corPrimaria = cfg.corPrimaria || '#111827';
  const corAcento = cfg.corAcento || '#16a34a';

  const scJson = JSON.stringify({ logo, corPrimaria, corAcento }).replace(/</g, '\\u003c');

  return (
    <html lang="pt-BR">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&display=swap" rel="stylesheet" />
        <link rel="icon" href={logo} />
        <style>{`:root{--cor-primaria:${corPrimaria};--cor-acento:${corAcento}}`}</style>
        <script dangerouslySetInnerHTML={{ __html: `window.__SC__=${scJson}` }} />
      </head>
      <body style={{ fontFamily: "'Montserrat', Arial, sans-serif", background: '#000', color: '#fff', margin: 0 }}>
        {children}
      </body>
    </html>
  );
}
