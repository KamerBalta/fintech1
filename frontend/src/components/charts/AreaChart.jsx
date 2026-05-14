import React, { useId } from 'react'
import { fmtK } from '@/utils/format'

export default function AreaChart({ data = [], width = 520, height = 140 }) {
  const uid = useId().replace(/:/g, '')
  const predGradId = `predGrad-${uid}`
  const actGradId = `actGrad-${uid}`
  const pad = { t: 10, r: 10, b: 24, l: 44 }
  const W = width - pad.l - pad.r
  const H = height - pad.t - pad.b
  const vals = data.flatMap((d) => [d.predicted, d.actual].filter(Boolean))
  if (!vals.length) {
    return (
      <div className="py-6 text-center text-[11px]" style={{ color: 'var(--t3)' }}>
        Gösterilecek trend verisi yok.
      </div>
    )
  }
  const minV = Math.min(...vals) * 0.92
  const maxV = Math.max(...vals) * 1.05
  const denom = Math.max(1, data.length - 1)
  const sx = (i) => (i / denom) * W
  const sy = (v) => H - ((v - minV) / (maxV - minV)) * H
  const predPts = data.map((d, i) => `${sx(i)},${sy(d.predicted)}`).join(' ')
  const actData = data.filter((d) => d.actual != null)
  const actPts  = actData.map((d, i) => `${sx(i)},${sy(d.actual)}`).join(' ')

  return (
    <div className="w-full min-w-0 max-w-full overflow-hidden">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" className="block max-h-[200px]">
        <defs>
          <linearGradient id={predGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00d68f" stopOpacity=".25" />
            <stop offset="100%" stopColor="#00d68f" stopOpacity="0" />
          </linearGradient>
          <linearGradient id={actGradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#3b8bff" stopOpacity=".2" />
            <stop offset="100%" stopColor="#3b8bff" stopOpacity="0" />
          </linearGradient>
        </defs>
        <g transform={`translate(${pad.l},${pad.t})`}>
          {[0, 0.5, 1].map((t) => {
            const v = minV + t * (maxV - minV)
            return (
              <g key={t}>
                <line x1={0} x2={W} y1={sy(v)} y2={sy(v)} stroke="var(--border)" strokeWidth=".5" />
                <text x={-5} y={sy(v) + 3} textAnchor="end" fontSize={8} fill="var(--t3)">{fmtK(v)}</text>
              </g>
            )
          })}
          <polygon points={`${predPts} ${sx(data.length - 1)},${H} 0,${H}`} fill={`url(#${predGradId})`} stroke="none" />
          <polyline points={predPts} fill="none" stroke="#00d68f" strokeWidth={1.5} strokeDasharray="4 3" />
          {actPts && (
            <>
              <polygon points={`${actPts} ${sx(actData.length - 1)},${H} 0,${H}`} fill={`url(#${actGradId})`} stroke="none" />
              <polyline points={actPts} fill="none" stroke="#3b8bff" strokeWidth={2} />
            </>
          )}
          {data.map((d, i) => (
            <text key={i} x={sx(i)} y={H + 15} textAnchor="middle" fontSize={8} fill="var(--t3)">{d.month}</text>
          ))}
        </g>
      </svg>
      <div style={{ display: 'flex', gap: 14, fontSize: 9, color: 'var(--t3)', marginTop: 4 }}>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, height: 2, background: '#3b8bff', display: 'inline-block' }} />Gerçek
        </span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          <span style={{ width: 12, borderTop: '2px dashed #00d68f', display: 'inline-block' }} />Tahmin
        </span>
      </div>
    </div>
  )
}
