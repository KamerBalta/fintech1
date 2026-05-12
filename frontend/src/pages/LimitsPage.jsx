import React from 'react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, ProgressBar, Button } from '@/components/ui'
import LimitModal from '@/components/limits/LimitModal'
import { fmt, CAT_COLORS } from '@/utils/format'
import { MOCK_LIMITS } from '@/services/mockData'

export default function LimitsPage() {
  const { limits, limitModal, openLimitModal } = useStore()
  const lim = limits || MOCK_LIMITS
  const { usage = {}, alerts = [], violations = 0 } = lim

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>Kategori Limit Yönetimi</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            Harcama limitleri belirleyin, anlık takip edin
          </p>
        </div>
        <Button variant="primary" onClick={openLimitModal}>+ Limit Ekle / Düzenle</Button>
      </div>

      {/* Alert banners */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          {alerts.map((a, i) => (
            <div key={i} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 14px', marginBottom: 6, borderRadius: 10,
              background: a.type === 'critical' ? 'var(--rd)' : 'var(--ad)',
              border: `1px solid ${a.type === 'critical' ? 'rgba(255,77,106,.2)' : 'rgba(255,180,41,.2)'}`,
            }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>{a.type === 'critical' ? '🚨' : '⚠️'}</span>
              <span style={{ flex: 1, fontSize: 11, color: 'var(--t1)' }}>{a.message}</span>
              <span style={{
                padding: '2px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                background: a.type === 'critical' ? 'var(--rd)' : 'var(--ad)',
                color: a.type === 'critical' ? 'var(--red)' : 'var(--amber)',
                border: `1px solid ${a.type === 'critical' ? 'rgba(255,77,106,.3)' : 'rgba(255,180,41,.3)'}`,
              }}>
                %{a.pct.toFixed(1)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Limit grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 14 }}>
        {Object.entries(usage).map(([cat, u]) => {
          const statusColor = u.status === 'critical' ? 'var(--red)' : u.status === 'warning' ? 'var(--amber)' : 'var(--green)'
          const statusLabel = u.status === 'critical' ? '🚨 Kritik' : u.status === 'warning' ? '⚠️ Uyarı' : '✓ Normal'
          const statusBadge = u.status === 'critical' ? 'red' : u.status === 'warning' ? 'amber' : 'green'
          return (
            <Card key={cat}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <div style={{ width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[cat] || '#4d6b85' }} />
                  <span style={{ fontSize: 13, fontWeight: 700 }}>{cat}</span>
                </div>
                <span style={{
                  padding: '3px 9px', borderRadius: 20, fontSize: 9, fontWeight: 700,
                  background: u.status === 'critical' ? 'var(--rd)' : u.status === 'warning' ? 'var(--ad)' : 'var(--gd)',
                  color: statusColor,
                  border: `1px solid ${statusColor}30`,
                }}>{statusLabel}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--t2)', marginBottom: 8 }}>
                <span>Harcanan: <strong style={{ color: 'var(--t1)' }}>{fmt(u.spent)} ₺</strong></span>
                <span>Limit: <strong style={{ color: 'var(--t1)' }}>{fmt(u.limit)} ₺</strong></span>
              </div>

              <ProgressBar pct={u.pct} height={10} color={statusColor} />

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginTop: 6 }}>
                <span style={{ color: statusColor }}>%{u.pct.toFixed(1)} kullanıldı</span>
                <span style={{ color: 'var(--t3)' }}>
                  Kalan: {fmt(Math.max(0, u.limit - u.spent))} ₺
                </span>
              </div>
            </Card>
          )
        })}
      </div>

      {limitModal && <LimitModal />}
    </div>
  )
}
