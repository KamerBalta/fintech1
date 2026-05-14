import React from 'react'
import { clsx } from 'clsx'
import { fmt, CAT_COLORS } from '@/utils/format'

function categoryGlyph(category, description) {
  const c = (category || 'Diğer').trim()
  if (c === 'Market & Gıda') return '🛒'
  if (c === 'Ulaşım') return '🚗'
  if (c === 'Alışveriş') return '🛍️'
  if (c === 'Faturalar') return '📄'
  if (c === 'Yemek') return '🍽️'
  if (c === 'Abonelik') return '📺'
  if (c === 'Sağlık') return '💊'
  if (c === 'Eğlence') return '🎬'
  if (c === 'Kredi') return '🏦'
  const ch = (description || c || '?').trim().charAt(0).toUpperCase()
  return ch || '₺'
}

export default function RecentActivityList({ transactions = [], max = 10, onViewAll }) {
  const rows = (transactions || []).slice(0, max)

  if (!rows.length) {
    return (
      <p className="py-8 text-center text-[11px]" style={{ color: 'var(--t3)' }}>
        Henüz işlem yok. PDF ekstre yükleyerek başlayın.
      </p>
    )
  }

  return (
    <ul className="flex flex-col gap-1.5">
      {rows.map((t) => {
        const dot = CAT_COLORS[t.category] || '#5c738c'
        const fraud = Boolean(t.is_fraud)
        return (
          <li
            key={t.id}
            className={clsx(
              'flex items-center gap-3 rounded-xl border px-3 py-2.5 sm:px-4 sm:py-3',
              'bg-[var(--bg-1)]/60 transition-colors hover:bg-[var(--bg-2)]/90',
            )}
            style={{ borderColor: 'var(--border)' }}
          >
            <div
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[15px]"
              style={{
                background: 'var(--bg-2)',
                boxShadow: `inset 0 0 0 1px ${fraud ? 'rgba(255,77,106,.35)' : 'rgba(255,255,255,.04)'}`,
              }}
            >
              {fraud ? '⚠️' : categoryGlyph(t.category, t.description)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-[12px] font-semibold" style={{ color: 'var(--t1)' }}>
                {t.description || '—'}
              </div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]" style={{ color: 'var(--t3)' }}>
                <span className="inline-flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
                  {t.category || 'Diğer'}
                </span>
                <span>·</span>
                <span>{t.date || '—'}</span>
                {t.is_recurring ? <span className="text-[9px]">🔄 Tekrarlayan</span> : null}
              </div>
            </div>
            <div
              className="shrink-0 text-right text-[12px] font-bold tabular-nums"
              style={{ color: fraud ? 'var(--red)' : 'var(--t1)' }}
            >
              {fmt(t.amount)} ₺
            </div>
          </li>
        )
      })}
    </ul>
  )
}
