// Desenha a arte de rastreio direto no Canvas 2D — sem depender de bibliotecas
// de "DOM para imagem" (que sao frageis com CSS moderno e recursos externos).
// Isso garante que a imagem sempre gera, de forma rapida e sem risco de travar.
export function gerarArteRastreioPNG(nome: string, link: string): string {
  const w = 680;
  const h = 420;
  const ratio = 2;

  const canvas = document.createElement('canvas');
  canvas.width = w * ratio;
  canvas.height = h * ratio;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  ctx.scale(ratio, ratio);

  const roundRect = (x: number, y: number, width: number, height: number, r: number) => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + width, y, x + width, y + height, r);
    ctx.arcTo(x + width, y + height, x, y + height, r);
    ctx.arcTo(x, y + height, x, y, r);
    ctx.arcTo(x, y, x + width, y, r);
    ctx.closePath();
  };

  // Fundo com degrade
  const grad = ctx.createLinearGradient(0, 0, w * 0.4, h);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#111827');
  roundRect(0, 0, w, h, 24);
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.textAlign = 'center';

  // Wordmark
  let y = 74;
  const primeiroNome = (nome || '').split(' ')[0] || '';
  ctx.font = '900 18px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  const wordmarkPeptide = 'PEPTIDE';
  const wordmarkResto = 'Z HEALTH';
  ctx.textBaseline = 'alphabetic';
  const wPeptide = ctx.measureText(wordmarkPeptide).width;
  const wResto = ctx.measureText(wordmarkResto).width;
  const totalW = wPeptide + wResto;
  let xStart = w / 2 - totalW / 2;
  ctx.textAlign = 'left';
  ctx.fillStyle = '#4ade80';
  ctx.fillText(wordmarkPeptide, xStart, y);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(wordmarkResto, xStart + wPeptide, y);
  ctx.textAlign = 'center';

  // Emoji caixa
  y += 46;
  ctx.font = '32px system-ui, "Segoe UI Emoji", "Apple Color Emoji", sans-serif';
  ctx.fillText('📦', w / 2, y);

  // Saudacao
  y += 40;
  ctx.font = '800 22px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(`Olá, ${primeiroNome || '...'}!`, w / 2, y);

  // Corpo do texto
  y += 32;
  ctx.font = '400 15px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Seu pedido da PeptideZ Health já está a caminho.', w / 2, y);
  y += 22;
  ctx.fillText('Acompanhe a entrega em tempo real:', w / 2, y);

  // Pilula com o link
  y += 34;
  const linkTexto = link || 'seu-link-de-rastreio-aparece-aqui.com';
  ctx.font = '700 15px ui-monospace, "Cascadia Code", "Courier New", monospace';
  const maxPillWidth = w - 96;
  let linkExibido = `🔗 ${linkTexto}`;
  let linkWidth = ctx.measureText(linkExibido).width;
  while (linkWidth > maxPillWidth - 40 && linkExibido.length > 8) {
    linkExibido = linkExibido.slice(0, -5) + '…';
    linkWidth = ctx.measureText(linkExibido).width;
  }
  const pillW = Math.min(linkWidth + 48, maxPillWidth);
  const pillH = 44;
  const pillX = w / 2 - pillW / 2;
  const pillY = y;
  roundRect(pillX, pillY, pillW, pillH, 12);
  ctx.fillStyle = 'rgba(22,163,74,0.16)';
  ctx.fill();
  ctx.lineWidth = 1;
  ctx.strokeStyle = 'rgba(22,163,74,0.45)';
  ctx.stroke();
  ctx.fillStyle = '#4ade80';
  ctx.textBaseline = 'middle';
  ctx.fillText(linkExibido, w / 2, pillY + pillH / 2 + 1);
  ctx.textBaseline = 'alphabetic';

  // Rodape
  ctx.font = '400 12px system-ui, -apple-system, "Segoe UI", Roboto, Arial, sans-serif';
  ctx.fillStyle = '#64748b';
  ctx.fillText('PeptideZ Health · Otimização Bioativa', w / 2, h - 28);

  return canvas.toDataURL('image/png');
}
