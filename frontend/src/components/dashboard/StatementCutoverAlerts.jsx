import React, { useMemo } from 'react'
import { normalizeBankId } from '@/utils/bankSlug'

function daysUntilNextStatement(statementDay, ref = new Date()) {
  const sd = Math.min(31, Math.max(1, Math.floor(Number(statementDay) || 15)))
  const y = ref.getFullYear()
  const m = ref.getMonth()
  const d = ref.getDate()
  let target = new Date(y, m, sd, 0, 0, 0, 0)
  if (target.getTime() <= ref.getTime()) {
    target = new Date(y, m + 1, sd, 0, 0, 0, 0)
  }
  return Math.ceil((target.getTime() - ref.getTime()) / 86400000)
}

export default function StatementCutoverAlerts({ profiles = [], bankPresets = [] }) {
  const alerts = useMemo(() => {
    const out = []
    for (const p of profiles || []) {
      if (!p?.bank_id || p.statement_day == null) continue
      const days = daysUntilNextStatement(p.statement_day)
      if (days <= 2) {
        const name =
          bankPresets.find((b) => normalizeBankId(b.id) === normalizeBankId(p.bank_id))?.name ||
          p.display_name ||
          p.bank_id
        out.push({ bank_id: p.bank_id, name, days })
      }
    }
    return out
  }, [profiles, bankPresets])

  if (!alerts.length) return null

  return (
    <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:justify-end">
      {alerts.map((a) => (
        <div
          key={a.bank_id}
          className="flex items-center gap-3 rounded-xl border border-amber-500/35 bg-amber-950/40 px-4 py-3 text-left shadow-sm"
        >
          <span className="text-lg" aria-hidden>
            📅
          </span>
          <div>
            <div className="text-[11px] font-bold text-amber-200">Hesap kesimi yaklaşıyor</div>
            <div className="text-[11px] text-amber-100/90">
              {a.name}: kesime {a.days === 0 ? 'bugün' : `${a.days} gün`} kaldı.
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}
