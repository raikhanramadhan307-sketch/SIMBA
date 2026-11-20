'use client';
import { useState } from 'react';

// Grafik SVG murni (tanpa library tambahan)
export const GREEN = '#168a57';
export const GREEN_LIGHT = '#8fc7aa';

function niceMax(v) {
  if (v <= 4) return 4;
  const p = 10 ** Math.floor(Math.log10(v));
  const n = v / p;
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 4 ? 4 : n <= 8 ? 8 : 10) * p;
}
const fmt = (v) => (v >= 1000 ? `${+(v / 1000).toFixed(1)}k` : Math.round(v));
const smooth = (p) => p.map((q, i) => (i === 0 ? `M${q[0]},${q[1]}` : `C${(p[i - 1][0] + q[0]) / 2},${p[i - 1][1]} ${(p[i - 1][0] + q[0]) / 2},${q[1]} ${q[0]},${q[1]}`)).join(' ');

export function Legend() {
  return (
    <div className="flex flex-wrap gap-4 text-xs text-slate-500">
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GREEN }} />Barang masuk</span>
      <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: GREEN_LIGHT }} />Barang keluar</span>
    </div>
  );
}

// Batang berbentuk pil: masuk (solid) dan keluar (arsir), tooltip saat disorot
export function BarChart({ data }) {
  const [hover, setHover] = useState(null);
  const W = 640, H = 270, L = 36, R = 8, T = 40, B = 28;
  const max = niceMax(Math.max(1, ...data.flatMap((d) => [d.incoming, d.outgoing])));
  const iw = W - L - R, ih = H - T - B, gw = iw / data.length, bw = Math.min(20, gw / 3.2);
  const y = (v) => T + ih - (v / max) * ih;
  const pill = (x, v, fill, op, label) => v > 0 && (
    <rect x={x} y={T + ih - Math.max(bw, T + ih - y(v))} width={bw} height={Math.max(bw, T + ih - y(v))} rx={bw / 2} fill={fill} opacity={op}>
      <title>{label}</title>
    </rect>
  );
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik barang masuk dan keluar">
      <defs>
        <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="6" height="6" fill={GREEN_LIGHT} /><line x1="0" y1="0" x2="0" y2="6" stroke="#6fb592" strokeWidth="2" />
        </pattern>
      </defs>
      {[0, 1, 2, 3, 4].map((i) => {
        const v = (max / 4) * i;
        return (
          <g key={i}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="#e2e8f0" strokeDasharray="4 4" />
            <text x={L - 8} y={y(v) + 4} textAnchor="end" fontSize="11" fill="#94a3b8">{fmt(v)}</text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const cx = L + gw * i + gw / 2;
        const op = hover === null || hover === i ? 1 : 0.4;
        return (
          <g key={d.key}>
            {pill(cx - bw - 2, d.incoming, GREEN, op, `${d.label}: masuk ${d.incoming}`)}
            {pill(cx + 2, d.outgoing, 'url(#hatch)', op, `${d.label}: keluar ${d.outgoing}`)}
            <text x={cx} y={H - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">{d.label}</text>
            <rect x={L + gw * i} y={T - 20} width={gw} height={ih + 20} fill="transparent" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          </g>
        );
      })}
      {hover !== null && (() => {
        const d = data[hover], cx = L + gw * hover + gw / 2, w = 112;
        const top = Math.min(y(d.incoming), y(d.outgoing));
        const bx = Math.min(Math.max(cx - w / 2, L), W - R - w), by = Math.max(2, top - 52);
        return (
          <g pointerEvents="none">
            <rect x={bx} y={by} width={w} height={40} rx="12" fill={GREEN} />
            <text x={bx + 12} y={by + 17} fontSize="11" fill="#fff" fontWeight="600">Masuk: {d.incoming}</text>
            <text x={bx + 12} y={by + 32} fontSize="11" fill="#d3ecdf">Keluar: {d.outgoing}</text>
          </g>
        );
      })()}
    </svg>
  );
}

// Grafik area satu seri dengan gradasi hijau
export function AreaChart({ data, field }) {
  const W = 320, H = 150, L = 6, R = 6, T = 12, B = 22;
  const max = niceMax(Math.max(1, ...data.map((d) => d[field])));
  const iw = W - L - R, ih = H - T - B, base = T + ih;
  const x = (i) => L + (iw * i) / Math.max(1, data.length - 1);
  const y = (v) => T + ih - (v / max) * ih;
  const pts = data.map((d, i) => [x(i), y(d[field])]);
  const last = pts[pts.length - 1];
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Grafik pergerakan barang 14 hari terakhir">
      <defs>
        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={GREEN} stopOpacity="0.28" /><stop offset="100%" stopColor={GREEN} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 1, 2].map((i) => <line key={i} x1={L} x2={W - R} y1={T + (ih / 2) * i} y2={T + (ih / 2) * i} stroke="#e2e8f0" strokeDasharray="4 4" />)}
      <path d={`${smooth(pts)} L${last[0]},${base} L${pts[0][0]},${base} Z`} fill="url(#areaGrad)" />
      <path d={smooth(pts)} fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" />
      <circle cx={last[0]} cy={last[1]} r="4" fill="#fff" stroke={GREEN} strokeWidth="2" />
      {data.map((d, i) => i % 3 === 0 && <text key={d.day} x={x(i)} y={H - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">{d.day.slice(8)}</text>)}
    </svg>
  );
}
