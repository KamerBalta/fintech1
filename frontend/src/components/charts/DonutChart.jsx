import React from 'react'
import { fmtK, CAT_COLORS } from '@/utils/format'

export default function DonutChart({ data = {}, size = 180 }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1
  const cx = size / 2, cy = size / 2
  const r = size * 0.4, inner = size * 0.244
  let angle = -Math.PI / 2

  const slices = Object.entries(data).map(([label, value]) => {
    const pct   = value / total
    const sweep = pct * 2 * Math.PI
    const x1 = cx + r * Math.cos(angle),           y1 = cy + r * Math.sin(angle)
    const x2 = cx + r * Math.cos(angle + sweep),   y2 = cy + r * Math.sin(angle + sweep)
    const ix1 = cx + inner * Math.cos(angle),       iy1 = cy + inner * Math.sin(angle)
    const ix2 = cx + inner * Math.cos(angle + sweep), iy2 = cy + inner * Math.sin(angle + sweep)
    const large = sweep > Math.PI ? 1 : 0
    const path = `M${x1} ${y1} A${r} ${r} 0 ${large} 1 ${x2} ${y2} L${ix2} ${iy2} A${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1}Z`
    angle += sweep
    return { label, value, pct, path, color: CAT_COLORS[label] || '#4d6b85' }
  })

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{ flexShrink: 0 }}>
        {slices.map((s, i) => (
          <path key={i} d={s.path} fill={s.color} stroke="var(--bg-1)" strokeWidth={2}>
            <title>{s.label}: {(s.pct * 100).toFixed(1)}%</title>
          </path>
        ))}
        <text x={cx} y={cy - 8}  textAnchor="middle" fontSize={10} fill="var(--t3)">Toplam</text>
        <text x={cx} y={cy + 8}  textAnchor="middle" fontSize={13} fontWeight={800} fill="var(--t1)">{fmtK(total)} ₺</text>
      </svg>
      <div style={{ flex: 1 }}>
        {slices.map((s) => (
          <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: 2, background: s.color, flexShrink: 0 }} />
              <span style={{ fontSize: 10, color: 'var(--t2)' }}>{s.label}</span>
            </div>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t1)' }}>{s.value.toLocaleString('tr-TR', { minimumFractionDigits: 0 })} ₺</span>
          </div>
        ))}
      </div>
    </div>
  )
}
