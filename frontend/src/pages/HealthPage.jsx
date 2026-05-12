import React from 'react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, ProgressBar } from '@/components/ui'
import { HealthScoreRing } from '@/components/charts/ScoreRing'
import { MOCK_HEALTH } from '@/services/mockData'

const BREAKDOWN_LABELS = {
  savings: 'Tasarruf Oranı',
  budget:  'Bütçe Disiplini',
  fraud:   'Fraud Güvenliği',
  bills:   'Düzenli Ödemeler',
  goals:   'Hedef İlerlemesi',
}

const LOCKED_BADGES = [
  { emoji: '🏆', title: 'Tasarruf Ustası',  desc: 'Aylık %30+ tasarruf oranı',       hint: 'Tasarruf oranını %30\'un üzerine çıkar' },
  { emoji: '🛡️',  title: 'Bütçe Koruyucu',  desc: 'Hiçbir kategori limitini aşma',    hint: 'Bu ay tüm limitlerde kal' },
  { emoji: '🌈', title: 'Çeşitlendirici',   desc: '6+ kategori dengeli kullan',        hint: '6 farklı kategoride harcama yap' },
]

export default function HealthPage() {
  const health = useStore((s) => s.health) || MOCK_HEALTH
  const { score, level, breakdown, badges } = health

  return (
    <div>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontSize: 21, fontWeight: 800 }}>Finansal Sağlık Skoru</h1>
        <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
          Gamification sistemi — puan hesaplama, rozetler ve seviye takibi
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>

        {/* Sol: Score ring + breakdown */}
        <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: 28 }}>
          <HealthScoreRing score={score} level={level} size={170} />

          <div style={{ width: '100%', marginTop: 24 }}>
            <SectionLabel>Puan Kırılımı</SectionLabel>
            {Object.entries(breakdown).map(([key, v]) => {
              const pct   = (v.points / v.max) * 100
              const color = pct >= 80 ? 'var(--green)' : pct >= 60 ? 'var(--blue)' : 'var(--amber)'
              return (
                <div key={key} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, marginBottom: 4 }}>
                    <span style={{ color: 'var(--t2)' }}>{BREAKDOWN_LABELS[key] || key}</span>
                    <span style={{ fontWeight: 700, color }}>
                      {v.points}/{v.max}p {v.value ? `(${v.value})` : ''}
                    </span>
                  </div>
                  <ProgressBar pct={pct} color={color} height={5} />
                </div>
              )
            })}
          </div>
        </Card>

        {/* Sağ: Kazanılan + kilitli rozetler */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Card>
            <SectionLabel>Kazanılan Rozetler</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 4 }}>
              {badges.map((b) => (
                <div key={b.id} title={b.description} style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '6px 12px', borderRadius: 20, fontSize: 11, fontWeight: 600,
                  background: 'var(--bg-2)', border: `1px solid ${b.color}30`,
                  cursor: 'default',
                }}>
                  <span>{b.emoji}</span>
                  <span style={{ color: b.color }}>{b.title}</span>
                </div>
              ))}
            </div>
            {badges.length === 0 && (
              <p style={{ fontSize: 11, color: 'var(--t3)' }}>Henüz rozet kazanılmadı.</p>
            )}
          </Card>

          <Card>
            <SectionLabel>Kilitli Rozetler</SectionLabel>
            {LOCKED_BADGES.map((b, i) => (
              <div key={i} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: i < LOCKED_BADGES.length - 1 ? '1px solid rgba(28,48,80,.4)' : 'none',
                opacity: 0.5,
              }}>
                <span style={{ fontSize: 22 }}>{b.emoji}</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 11, fontWeight: 600 }}>{b.title}</div>
                  <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 2 }}>{b.desc}</div>
                </div>
                <span style={{ fontSize: 9, color: 'var(--t3)' }}>🔒 Kilitli</span>
              </div>
            ))}
          </Card>

          {/* Sonraki hedef */}
          <Card style={{ background: 'var(--bd)', border: '1px solid rgba(59,139,255,.2)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', marginBottom: 6 }}>
              🎯 Sonraki Rozet Hedefi
            </div>
            <div style={{ fontSize: 11, color: 'var(--t2)', lineHeight: 1.5 }}>
              Eğlence limitini bu ay aşmayın →{' '}
              <strong style={{ color: 'var(--t1)' }}>Bütçe Koruyucu</strong> rozetini kazan!
            </div>
            <div style={{ marginTop: 10 }}>
              <ProgressBar pct={40} color="var(--blue)" height={5} />
              <div style={{ fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>1/3 kriterde başarılı</div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
