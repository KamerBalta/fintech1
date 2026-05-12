import React from 'react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, Badge, PulseDot } from '@/components/ui'
import { MOCK_ADVISORIES, MOCK_MARKET } from '@/services/mockData'

const TYPE_META = {
  opportunity: { color: 'var(--green)',  label: 'Fırsat',   border: 'var(--green)'  },
  alert:       { color: 'var(--red)',    label: 'Kritik',   border: 'var(--red)'    },
  warning:     { color: 'var(--amber)',  label: 'Uyarı',    border: 'var(--amber)'  },
  tip:         { color: 'var(--blue)',   label: 'İpucu',    border: 'var(--blue)'   },
  goal:        { color: 'var(--purple)', label: 'Hedef',    border: 'var(--purple)' },
  investment:  { color: 'var(--cyan)',   label: 'Yatırım',  border: 'var(--cyan)'   },
}

export default function AdvisoryPage() {
  const { advisories, market, setTab } = useStore()
  const advs   = advisories.length ? advisories : MOCK_ADVISORIES
  const rates  = market.length     ? market      : MOCK_MARKET

  const critCount = advs.filter((a) => a.type === 'alert').length
  const oppCount  = advs.filter((a) => a.type === 'opportunity').length

  const handleAction = (actionType) => {
    const map = { view_goal: 'goals', view_limits: 'limits', view_credit: 'health', view_transactions: 'fraud', update_goal: 'goals' }
    if (map[actionType]) setTab(map[actionType])
  }

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>Otonom AI Tavsiyeleri</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            Piyasa verileri + hedefleriniz + harcama analizi ile kişiselleştirilmiş öneriler
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <PulseDot />
          <span style={{ fontSize: 10, color: 'var(--green)' }}>Canlı piyasa verisi aktif</span>
        </div>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Aktif Tavsiye', value: advs.length,  color: 'var(--blue)'   },
          { label: 'Kritik Uyarı', value: critCount,     color: 'var(--red)'    },
          { label: 'Fırsat',       value: oppCount,       color: 'var(--green)'  },
        ].map((s) => (
          <div key={s.label} style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 16, padding: '16px 18px' }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--t3)' }}>{s.label}</div>
            <div style={{ fontSize: 28, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 14 }}>
        {/* Advisory cards */}
        <div>
          {advs.map((a, i) => {
            const meta = TYPE_META[a.type] || TYPE_META.tip
            return (
              <div key={i} style={{
                display: 'flex', gap: 14, padding: '14px 16px', borderRadius: 12, marginBottom: 10,
                background: 'var(--bg-1)', border: '1px solid var(--border)',
                borderLeft: `3px solid ${meta.border}`,
                transition: 'border-color .2s',
              }}>
                <span style={{ fontSize: 24, flexShrink: 0 }}>{a.icon}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 700 }}>{a.title}</span>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', padding: '2px 8px',
                      borderRadius: 20, fontSize: 9, fontWeight: 700,
                      background: `${meta.color}20`, color: meta.color, border: `1px solid ${meta.color}30`,
                    }}>{meta.label}</span>
                  </div>
                  <p style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.6, marginBottom: 8 }}>{a.message}</p>
                  <button onClick={() => handleAction(a.action_type)} style={{
                    background: 'var(--bg-2)', border: '1px solid var(--border)', borderRadius: 7,
                    padding: '5px 11px', fontSize: 10, fontWeight: 600, color: 'var(--t2)', cursor: 'pointer',
                  }}>
                    {a.action_label} →
                  </button>
                </div>
              </div>
            )
          })}
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* Market rates */}
          <Card>
            <SectionLabel>Canlı Piyasa Verileri</SectionLabel>
            {rates.map((m) => (
              <div key={m.symbol} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(28,48,80,.4)' }}>
                <span style={{ fontSize: 11, color: 'var(--t2)' }}>{m.symbol}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 11, fontWeight: 700 }}>
                    {m.rate < 100 ? m.rate.toFixed(4) : m.rate.toLocaleString('tr-TR')}
                  </span>
                  <span style={{
                    fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
                    background: m.change_pct >= 0 ? 'var(--gd)' : 'var(--rd)',
                    color: m.change_pct >= 0 ? 'var(--green)' : 'var(--red)',
                  }}>
                    {m.change_pct >= 0 ? '▲' : '▼'}{Math.abs(m.change_pct).toFixed(2)}%
                  </span>
                </div>
              </div>
            ))}
          </Card>

          {/* Context engine info */}
          <Card>
            <SectionLabel>Bağlam Motoru</SectionLabel>
            {[
              ['📊', 'Harcama trendi', 'Son 3 ay analiz edildi'],
              ['🎯', 'Hedef entegrasyonu', '4 aktif hedef değerlendiriliyor'],
              ['💱', 'Kur takibi', '30 günlük ortalama hesaplandı'],
              ['⚠️', 'Risk profili', 'Limit ihlalleri dahil edildi'],
              ['🤖', 'AI motoru', 'Kural tabanlı + piyasa sinyalleri'],
            ].map(([icon, label, val]) => (
              <div key={label} style={{ display: 'flex', gap: 8, fontSize: 10, color: 'var(--t2)', marginBottom: 7 }}>
                <span>{icon}</span>
                <span><strong style={{ color: 'var(--t1)' }}>{label}:</strong> {val}</span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </div>
  )
}
