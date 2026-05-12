import React from 'react'
import SparkBar from '@/components/charts/SparkBar'

const COLOR_MAP = {
  green:  { css: 'var(--green)',  rgb: '0,214,143'   },
  blue:   { css: 'var(--blue)',   rgb: '59,139,255'  },
  amber:  { css: 'var(--amber)',  rgb: '255,180,41'  },
  red:    { css: 'var(--red)',    rgb: '255,77,106'  },
  purple: { css: 'var(--purple)', rgb: '155,109,255' },
}

export default function StatCard({ label, value, sub, color = 'green', spark = [] }) {
  const c = COLOR_MAP[color] || COLOR_MAP.green

  return (
    <div style={{
      background: 'var(--bg-1)', border: '1px solid var(--border)',
      borderRadius: 16, padding: '16px 18px',
    }}>
      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>
        {label}
      </div>
      <div style={{ fontSize: 22, fontWeight: 800, color: c.css, margin: '5px 0 1px', lineHeight: 1 }}>
        {value}
      </div>
      {spark.length > 0 && <SparkBar data={spark} color={c.css} height={32} />}
      <div style={{ fontSize: 10, color: 'var(--t3)', marginTop: 4 }}>{sub}</div>
    </div>
  )
}
