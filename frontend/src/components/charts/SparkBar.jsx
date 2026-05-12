import React from 'react'

export default function SparkBar({ data = [], color = 'var(--green)', height = 32 }) {
  const max = Math.max(...data, 1)
  const rgb = color.includes('green') ? '0,214,143'
    : color.includes('blue')  ? '59,139,255'
    : color.includes('amber') ? '255,180,41'
    : '0,214,143'

  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height }}>
      {data.map((v, i) => (
        <div key={i} style={{
          flex: 1, minWidth: 3,
          height: `${(v / max) * 100}%`,
          borderRadius: '2px 2px 0 0',
          background: i === data.length - 1 ? color : `rgba(${rgb},.3)`,
          transition: 'height .5s ease',
        }} />
      ))}
    </div>
  )
}
