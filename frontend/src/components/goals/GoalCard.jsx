import React from 'react'
import { Trash2 } from 'lucide-react'
import { ProgressBar, Badge, Button } from '@/components/ui'
import { fmtK } from '@/utils/format'
import useStore from '@/store/useStore'

const progressColor = (pct) =>
  pct >= 75 ? 'var(--green)' : pct >= 40 ? 'var(--blue)' : 'var(--amber)'

export default function GoalCard({ goal }) {
  const addToGoal = useStore((s) => s.addToGoal)
  const deleteGoal = useStore((s) => s.deleteGoal)
  const { id, title, emoji, target_amount, saved_amount, category, progress_pct, days_remaining } = goal
  const color = progressColor(progress_pct)

  const onDelete = (e) => {
    e.stopPropagation()
    if (!window.confirm('Bu hedefi kalıcı olarak silmek istiyor musunuz?')) return
    void deleteGoal(id)
  }

  return (
    <div style={{ background: 'var(--bg-1)', border: '1px solid var(--border)', borderRadius: 16, padding: 18 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
        <div style={{ fontSize: 28, lineHeight: 1 }}>{emoji}</div>
        <button
          type="button"
          title="Hedefi sil"
          onClick={onDelete}
          aria-label="Hedefi sil"
          style={{
            flexShrink: 0,
            width: 34,
            height: 34,
            borderRadius: 10,
            border: '1px solid var(--border)',
            background: 'var(--bg-2)',
            color: 'var(--t3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'color .15s, border-color .15s, background .15s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = 'var(--red)'
            e.currentTarget.style.borderColor = 'rgba(255,77,106,.35)'
            e.currentTarget.style.background = 'var(--rd)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = 'var(--t3)'
            e.currentTarget.style.borderColor = 'var(--border)'
            e.currentTarget.style.background = 'var(--bg-2)'
          }}
        >
          <Trash2 size={16} strokeWidth={2} />
        </button>
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 3 }}>{title}</div>
      <Badge variant="blue" style={{ fontSize: '8px', marginBottom: 10 }}>{category}</Badge>

      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t3)', margin: '8px 0 4px' }}>
        <span>{fmtK(saved_amount)} ₺</span>
        <span>{fmtK(target_amount)} ₺</span>
      </div>

      <ProgressBar pct={progress_pct} color={color} height={6} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 }}>
        <span style={{ fontSize: 18, fontWeight: 800, color }}>{progress_pct.toFixed(1)}%</span>
        <span style={{ fontSize: 9, color: 'var(--t3)' }}>
          {days_remaining != null ? `${days_remaining} gün kaldı` : 'Süresiz'}
        </span>
      </div>

      <Button variant="ghost" size="sm" onClick={() => {
        const amt = parseFloat(String(prompt('Ne kadar eklemek istersiniz? (₺)') || '').replace(',', '.')) || 0
        if (amt > 0) void addToGoal(id, amt)
      }} style={{ marginTop: 10, width: '100%', justifyContent: 'center' }}>
        + Birikim Ekle
      </Button>
    </div>
  )
}
