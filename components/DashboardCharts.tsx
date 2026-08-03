'use client';
import { useState } from 'react';

const ONLINE_THRESHOLD_MS = 90 * 1000;

export function estaOnline(lastSeen?: string | null) {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() < ONLINE_THRESHOLD_MS;
}

export function LeadsChart30d({ data }: { data: [string, number][] }) {
  const [hover, setHover] = useState<number | null>(null);
  const w = 600, h = 180, padL = 28, padR = 8, padT = 10, padB = 26;
  const plotW = w - padL - padR, plotH = h - padT - padB;
  const n = data.length;
  const max = Math.max(...data.map(([, v]) => v), 1);
  const total = data.reduce((s, [, v]) => s + v, 0);
  const stepX = n > 1 ? plotW / (n - 1) : plotW;
  const yFor = (v: number) => padT + plotH - (v / max) * plotH;
  const pts = data.map(([, v], i) => [padL + i * stepX, yFor(v)] as const);
  const linePath = pts.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const areaPath = `${linePath} L${pts[n - 1][0].toFixed(1)},${padT + plotH} L${pts[0][0].toFixed(1)},${padT + plotH} Z`;

  // Pico (maior valor, ultima ocorrencia) e ponto de hoje, para rotulo direto
  let peakIdx = 0;
  data.forEach(([, v], i) => { if (v >= data[peakIdx][1]) peakIdx = i; });
  const todayIdx = n - 1;

  // ~6 marcas de data no eixo X, sempre incluindo a primeira e a ultima
  const labelCount = Math.min(6, n);
  const labelIdxs = Array.from({ length: labelCount }, (_, k) => Math.round((k * (n - 1)) / (labelCount - 1 || 1)));

  const handleMove = (e: React.MouseEvent<SVGRectElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * w;
    let idx = Math.round((x - padL) / stepX);
    idx = Math.max(0, Math.min(n - 1, idx));
    setHover(idx);
  };

  const hi = hover ?? -1;
  const gridVals = [0, Math.round(max / 2), max];

  return (
    <div style={{ position: 'relative' }}>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ width: '100%', height: h, display: 'block', overflow: 'visible' }}>
        <defs>
          <linearGradient id="leadsGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#16a34a" stopOpacity="0.28" />
            <stop offset="100%" stopColor="#16a34a" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Linhas de grade recessivas + rotulo do eixo Y */}
        {gridVals.map((v, i) => {
          const y = yFor(v);
          return (
            <g key={i}>
              <line x1={padL} x2={w - padR} y1={y} y2={y} stroke="#f1f5f9" strokeWidth={1} />
              <text x={padL - 6} y={y + 3} textAnchor="end" fontSize={9} fill="#9ca3af">{v}</text>
            </g>
          );
        })}

        {/* Rotulos de data no eixo X */}
        {labelIdxs.map(i => (
          <text key={i} x={pts[i][0]} y={h - 6} textAnchor="middle" fontSize={9} fill="#9ca3af">{data[i][0]}</text>
        ))}

        <path d={areaPath} fill="url(#leadsGrad)" stroke="none" />
        <path d={linePath} fill="none" stroke="#16a34a" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

        {/* Rotulo direto no pico (se houver leads) */}
        {data[peakIdx][1] > 0 && (
          <text x={pts[peakIdx][0]} y={yFor(data[peakIdx][1]) - 8} textAnchor="middle" fontSize={10} fontWeight={700} fill="#15803d">
            {data[peakIdx][1]}
          </text>
        )}

        {/* Marcador fixo de "hoje" */}
        <circle cx={pts[todayIdx][0]} cy={pts[todayIdx][1]} r={3} fill="#fff" stroke="#16a34a" strokeWidth={2} />

        {/* Crosshair + ponto no hover */}
        {hi >= 0 && (
          <>
            <line x1={pts[hi][0]} x2={pts[hi][0]} y1={padT} y2={padT + plotH} stroke="#16a34a" strokeWidth={1} strokeDasharray="3,3" opacity={0.5} />
            <circle cx={pts[hi][0]} cy={pts[hi][1]} r={4} fill="#16a34a" stroke="#fff" strokeWidth={2} />
          </>
        )}

        {/* Area sensivel ao mouse */}
        <rect x={padL} y={0} width={plotW} height={h} fill="transparent"
          onMouseMove={handleMove} onMouseLeave={() => setHover(null)} style={{ cursor: 'crosshair' }} />
      </svg>

      {hi >= 0 && (
        <div style={{
          position: 'absolute', pointerEvents: 'none',
          left: `${(pts[hi][0] / w) * 100}%`, top: 0,
          transform: `translateX(${hi > n - 5 ? '-100%' : '0%'})`,
          background: '#111827', color: '#fff', borderRadius: 6, padding: '5px 9px',
          fontSize: 11, whiteSpace: 'nowrap', boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}>
          <div style={{ fontWeight: 700 }}>{data[hi][0]}</div>
          <div style={{ color: '#86efac' }}>{data[hi][1]} lead{data[hi][1] === 1 ? '' : 's'}</div>
        </div>
      )}

      <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>{total} leads nos últimos 30 dias</div>
    </div>
  );
}

export type HBarItem = { key: string; label: string; value: number; sub?: string; hoje?: number };

export function HBarChart({ items, color, emptyLabel = 'Sem dados ainda.' }: { items: HBarItem[]; color: string; emptyLabel?: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const max = Math.max(...items.map(i => i.value), 1);

  if (items.length === 0) {
    return <div style={{ color: '#6b7280', fontSize: 13 }}>{emptyLabel}</div>;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
      {items.map(item => {
        const pct = Math.max((item.value / max) * 100, item.value > 0 ? 2 : 0);
        const hovered = hover === item.key;
        return (
          <div key={item.key}
            onMouseEnter={() => setHover(item.key)} onMouseLeave={() => setHover(null)}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', fontSize: 12.5, marginBottom: 5, gap: 10 }}>
              <span style={{ color: hovered ? color : '#374151', fontWeight: hovered ? 700 : 600, transition: 'color .15s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.label}
              </span>
              <span style={{ flexShrink: 0, display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ color: '#111827', fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {item.value}{item.sub && <span style={{ color: '#9ca3af', fontWeight: 500, marginLeft: 4 }}>{item.sub}</span>}
                </span>
                {!!item.hoje && (
                  <span style={{ background: `${color}1a`, color, fontWeight: 700, fontSize: 10, padding: '2px 6px', borderRadius: 10, whiteSpace: 'nowrap' }}>
                    +{item.hoje} hoje
                  </span>
                )}
              </span>
            </div>
            <div style={{ background: '#f1f5f9', borderRadius: 8, height: 9, overflow: 'hidden' }}>
              <div style={{
                background: color, borderRadius: 8, height: '100%', width: `${pct}%`,
                opacity: hovered ? 1 : 0.82,
                boxShadow: hovered ? `0 0 0 2px ${color}30` : 'none',
                transition: 'width .5s cubic-bezier(.4,0,.2,1), opacity .15s, box-shadow .15s',
              }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
