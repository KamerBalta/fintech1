import React from 'react'
import { ProgressBar } from '@/components/ui'
import { fmt } from '@/utils/format'

/**
 * Kullanılabilir limit = toplam limit − PDF (ekstre) kaynaklı harcama (son ~30 gün).
 * allSpentAmount: bilgi amaçlı tüm harcama (aynı pencere).
 */
export default function BankSummaryCard({
  bankName,
  accent = '#2dd4a3',
  totalLimit,
  pdfSpentAmount,
  allSpentAmount,
  statementDay,
  onEditProfile,
}) {
  const cap = totalLimit != null && Number.isFinite(Number(totalLimit)) && Number(totalLimit) > 0
  const capN = cap ? Number(totalLimit) : 0
  const pdfU = Math.max(0, Number(pdfSpentAmount) || 0)
  const allU = Math.max(0, Number(allSpentAmount) || 0)
  const usedForBar = pdfU > 0 ? pdfU : allU
  const remaining = cap ? Math.max(0, capN - pdfU) : null
  const pct = cap && capN > 0 ? Math.min(100, (usedForBar / capN) * 100) : 0

  return (
    <div
      className="rounded-xl border border-slate-700/80 bg-slate-800/50 p-5 shadow-sm"
      style={{ borderTopColor: accent, borderTopWidth: 3 }}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Banka özeti</p>
          <p className="text-base font-bold text-slate-50">{bankName}</p>
        </div>
        {onEditProfile ? (
          <button
            type="button"
            className="text-[11px] font-semibold text-sky-400 hover:underline"
            onClick={onEditProfile}
          >
            Limit & kesim
          </button>
        ) : null}
      </div>
      {statementDay != null ? (
        <p className="mb-3 text-xs text-slate-400">Hesap kesimi: ayın {statementDay}. günü</p>
      ) : null}
      {!cap ? (
        <p className="text-xs text-slate-500">
          Toplam kart limiti tanımlı değil. Bankalarım veya buradaki <strong className="text-slate-300">Limit & kesim</strong>{' '}
          ile manuel girebilirsiniz.
        </p>
      ) : (
        <>
          <div className="mb-2 flex justify-between text-xs text-slate-400">
            <span>Ekstre / PDF harcaması (son ~30 gün)</span>
            <span className="font-semibold tabular-nums text-slate-200">{fmt(pdfU)} ₺</span>
          </div>
          {allU !== pdfU ? (
            <p className="mb-2 text-[10px] text-slate-500">Tüm harcamalar (aynı dönem): {fmt(allU)} ₺</p>
          ) : null}
          <ProgressBar pct={pct} height={8} color={accent} />
          <div className="mt-3 flex justify-between text-sm">
            <div>
              <div className="text-[10px] uppercase text-slate-500">Toplam limit</div>
              <div className="font-bold tabular-nums text-slate-100">{fmt(capN)} ₺</div>
            </div>
            <div className="text-right">
              <div className="text-[10px] uppercase text-slate-500">Kullanılabilir limit</div>
              <div className="font-bold tabular-nums text-emerald-300">{fmt(remaining)} ₺</div>
            </div>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
            Kullanılabilir = toplam limit − PDF ile gelen işlemlerin son ~30 gün harcaması.
          </p>
        </>
      )}
    </div>
  )
}
