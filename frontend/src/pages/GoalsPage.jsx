import React from 'react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, Button } from '@/components/ui'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'
import { MOCK_ADVISORIES } from '@/services/mockData'

const ADV_BORDER = { opportunity: 'var(--green)', goal: 'var(--purple)', warning: 'var(--amber)' }

export default function GoalsPage() {
  const { goals, goalModal, openGoalModal, advisories } = useStore()
  const goalAdvs = (advisories.length ? advisories : MOCK_ADVISORIES).filter((a) => ['goal', 'opportunity'].includes(a.type))

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>Tasarruf Hedefleri</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            Finansal hedeflerinizi takip edin, AI tavsiyeleri alın
          </p>
        </div>
        <Button variant="primary" onClick={openGoalModal}>+ Yeni Hedef</Button>
      </div>

      {/* Goal cards */}
      {goals.length > 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14, marginBottom: 16 }}>
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--t3)', fontSize: 13 }}>
          Henüz hedef oluşturulmadı. İlk hedefinizi ekleyin!
        </div>
      )}

      {/* AI advisories for goals */}
      {goalAdvs.length > 0 && (
        <Card>
          <SectionLabel>AI Hedef Tavsiyeleri</SectionLabel>
          {goalAdvs.map((a, i) => (
            <div key={i} style={{
              display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10,
              background: 'var(--bg-2)', marginBottom: 8,
              border: '1px solid var(--border)',
              borderLeft: `3px solid ${ADV_BORDER[a.type] || 'var(--blue)'}`,
            }}>
              <span style={{ fontSize: 18, flexShrink: 0 }}>{a.icon}</span>
              <div>
                <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>{a.title}</div>
                <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.5 }}>{a.message}</div>
              </div>
            </div>
          ))}
          {/* Static bonus insight */}
          <div style={{
            display: 'flex', gap: 10, padding: '11px 13px', borderRadius: 10,
            background: 'var(--bg-2)', border: '1px solid var(--border)',
            borderLeft: '3px solid var(--green)',
          }}>
            <span style={{ fontSize: 18 }}>💰</span>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 3 }}>Dışarıda Yemek Azaltma Fırsatı</div>
              <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.5 }}>
                Yemek harcamalarını %15 azaltırsan Japonya Tatili hedefine 2 ay erken ulaşırsın.
              </div>
            </div>
          </div>
        </Card>
      )}

      {goalModal && <GoalModal />}
    </div>
  )
}
