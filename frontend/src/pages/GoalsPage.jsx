import React from 'react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, Button } from '@/components/ui'
import GoalCard from '@/components/goals/GoalCard'
import GoalModal from '@/components/goals/GoalModal'

const ADV_BORDER = { opportunity: 'var(--green)', goal: 'var(--purple)', warning: 'var(--amber)', tip: 'var(--blue)', investment: 'var(--cyan)' }

export default function GoalsPage() {
  const { goals, goalModal, openGoalModal, advisories } = useStore()
  const goalAdvs = (advisories || []).filter((a) => ['goal', 'opportunity', 'tip', 'investment'].includes(a.type))

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>Tasarruf Hedefleri</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            Hedefler MongoDB ile senkron
          </p>
        </div>
        <Button variant="primary" onClick={openGoalModal}>+ Yeni Hedef</Button>
      </div>

      {goals.length > 0 ? (
        <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {goals.map((g) => <GoalCard key={g.id} goal={g} />)}
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 48, color: 'var(--t3)', fontSize: 13 }}>
          Henüz hedef oluşturulmadı. İlk hedefinizi ekleyin!
        </div>
      )}

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
        </Card>
      )}

      {goalModal && <GoalModal />}
    </div>
  )
}
