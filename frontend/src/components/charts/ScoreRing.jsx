import React from 'react'

const scoreColor = (s) =>
  s >= 750 ? '#00d68f' : s >= 650 ? '#3b8bff' : s >= 600 ? '#ffb429' : '#ff4d6a'

export function ScoreRing({ score = 0, max = 850, size = 130, label }) {
  const min  = 300
  const pct  = (score - min) / (max - min)
  const r    = size * 0.385
  const circ = 2 * Math.PI * r
  const dash = pct * circ * 0.75
  const cx   = size / 2
  const color = scoreColor(score)

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={9}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={9}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1s ease' }} />
      <text x={cx} y={cx - 8}  textAnchor="middle" fontSize={22} fontWeight={800} fill={color}>{score}</text>
      <text x={cx} y={cx + 7}  textAnchor="middle" fontSize={9}  fill="var(--t3)">/ {max}</text>
      {label && <text x={cx} y={cx + 20} textAnchor="middle" fontSize={9} fontWeight={700} fill={color}>{label}</text>}
    </svg>
  )
}

export function HealthScoreRing({ score = 0, level = '', size = 160 }) {
  const r    = size * 0.385
  const circ = 2 * Math.PI * r
  const dash = (score / 100) * circ * 0.75
  const cx   = size / 2
  const color = score >= 75 ? '#00d68f' : score >= 55 ? '#3b8bff' : score >= 35 ? '#ffb429' : '#ff4d6a'

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cx} r={r} fill="none" stroke="var(--bg-3)" strokeWidth={10}
        strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round" />
      <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth={10}
        strokeDasharray={`${dash} ${circ - dash}`}
        strokeDashoffset={circ * 0.125} strokeLinecap="round"
        style={{ transition: 'stroke-dasharray 1.2s ease' }} />
      <text x={cx} y={cx - 10} textAnchor="middle" fontSize={28} fontWeight={800} fill={color}>{score}</text>
      <text x={cx} y={cx + 8}  textAnchor="middle" fontSize={10} fill="var(--t3)">/ 100</text>
      <text x={cx} y={cx + 22} textAnchor="middle" fontSize={10} fontWeight={700} fill={color}>{level}</text>
    </svg>
  )
}
