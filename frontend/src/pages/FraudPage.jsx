import React from 'react'
import useStore from '@/store/useStore'
import { Card, Badge, Button } from '@/components/ui'
import { fmt, CAT_COLORS } from '@/utils/format'

export default function FraudPage() {
  const { transactions, fraudFilter, setFraudFilter } = useStore()
  const txns = transactions || []

  const filtered =
    fraudFilter === 'fraud' ? txns.filter((t) => t.is_fraud)
    : fraudFilter === 'safe' ? txns.filter((t) => !t.is_fraud)
    : txns

  const fraudCount = txns.filter((t) => t.is_fraud).length

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>Fraud İzleme Merkezi</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            İşlemler MongoDB&apos;den gelir
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { label: `${fraudCount} Şüpheli`, color: 'var(--red)', bg: 'var(--rd)' },
            { label: `${txns.length - fraudCount} Güvenli`, color: 'var(--green)', bg: 'var(--gd)' },
          ].map((s) => (
            <div key={s.label} style={{
              background: s.bg, border: `1px solid ${s.color}30`,
              borderRadius: 10, padding: '10px 14px', textAlign: 'center',
            }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.label.split(' ')[0]}</div>
              <div style={{ fontSize: 9, color: 'var(--t3)' }}>{s.label.split(' ')[1]}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 7, marginBottom: 14 }}>
        {[
          { key: 'all', label: 'Tümü' },
          { key: 'fraud', label: '⚠ Şüpheli' },
          { key: 'safe', label: '✓ Güvenli' },
        ].map(({ key, label }) => (
          <Button key={key} variant={fraudFilter === key ? 'primary' : 'ghost'} size="sm"
            onClick={() => setFraudFilter(key)}>
            {label}
          </Button>
        ))}
      </div>

      {txns.length === 0 ? (
        <p style={{ fontSize: 12, color: 'var(--t3)', padding: 20 }}>Henüz işlem yok. PDF ekstresi yükleyin veya seed verisini kullanın.</p>
      ) : (
        <Card style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 11 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Tarih', 'Açıklama', 'Kategori', 'Tutar', 'Risk Skoru', 'Durum', 'AI Nedenleri'].map((h) => (
                    <th key={h} style={{
                      padding: '8px 12px', textAlign: 'left',
                      fontSize: 9, fontWeight: 700, letterSpacing: '.06em',
                      textTransform: 'uppercase', color: 'var(--t3)',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((t) => {
                  let xai = []
                  try { xai = JSON.parse(t.xai_reasons || '[]') } catch { /* ignore */ }
                  return (
                    <tr key={t.id} style={{ background: t.is_fraud ? 'rgba(255,77,106,.04)' : 'transparent' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = t.is_fraud ? 'rgba(255,77,106,.08)' : 'var(--bg-2)' }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = t.is_fraud ? 'rgba(255,77,106,.04)' : 'transparent' }}>
                      <td style={{ padding: '9px 12px', color: 'var(--t3)', whiteSpace: 'nowrap' }}>{t.date}</td>
                      <td style={{ padding: '9px 12px', fontWeight: t.is_fraud ? 700 : 400, color: t.is_fraud ? 'var(--red)' : 'var(--t1)' }}>
                        {t.is_fraud && '⚠ '}{t.description}
                        {t.is_recurring && (
                          <span style={{
                            marginLeft: 6, padding: '1px 6px', borderRadius: 10, fontSize: 8,
                            background: 'var(--bd)', color: 'var(--blue)', border: '1px solid rgba(59,139,255,.2)',
                          }}>🔄</span>
                        )}
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          <div style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[t.category] || '#4d6b85', flexShrink: 0 }} />
                          <span style={{ color: 'var(--t3)' }}>{t.category}</span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px', fontWeight: 700, color: t.is_fraud ? 'var(--red)' : 'var(--t1)' }}>
                        {fmt(t.amount)} ₺
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ width: 48, height: 4, background: 'var(--bg-3)', borderRadius: 2, overflow: 'hidden' }}>
                            <div style={{
                              height: '100%', borderRadius: 2,
                              width: `${t.risk_score}%`,
                              background: t.risk_score > 65 ? 'var(--red)' : t.risk_score > 35 ? 'var(--amber)' : 'var(--green)',
                            }} />
                          </div>
                          <span style={{ fontSize: 10, color: t.risk_score > 65 ? 'var(--red)' : 'var(--t3)' }}>
                            {t.risk_score}%
                          </span>
                        </div>
                      </td>
                      <td style={{ padding: '9px 12px' }}>
                        <Badge variant={t.is_fraud ? 'red' : 'green'}>
                          {t.is_fraud ? '⚠ Şüpheli' : '✓ Güvenli'}
                        </Badge>
                      </td>
                      <td style={{ padding: '9px 12px', maxWidth: 200 }}>
                        {xai.length > 0 ? (
                          <div style={{ fontSize: 9, color: 'var(--t3)' }}>
                            {xai.map((r, i) => <div key={i}>• {r}</div>)}
                          </div>
                        ) : '–'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
