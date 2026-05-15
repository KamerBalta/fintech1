import React, { useState } from 'react'
import { Repeat2, Trash2 } from 'lucide-react'
import { fmt } from '@/utils/format'
import { Modal, Button } from '@/components/ui'

export default function SubscriptionRow({ subscription, onRemove }) {
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [removing, setRemoving] = useState(false)

  const handleConfirm = async () => {
    setRemoving(true)
    try {
      await onRemove(subscription.id)
      setConfirmOpen(false)
    } catch {
      /* store notifies */
    } finally {
      setRemoving(false)
    }
  }

  return (
    <>
      <div className="group flex items-center justify-between gap-3 border-b border-slate-700/40 py-2.5 last:border-0">
        <div className="flex min-w-0 flex-1 items-center gap-2.5">
          <Repeat2 className="h-4 w-4 shrink-0 text-emerald-400/80" strokeWidth={1.5} aria-hidden />
          <div className="min-w-0">
            <div className="truncate text-[12px] font-semibold text-slate-100">
              {subscription.label}
            </div>
            <div className="text-[9px] text-slate-500">
              {subscription.sample_count} örnek · Son: {subscription.last_seen || '—'}
              {subscription.bank_id ? ` · ${subscription.bank_id}` : ''}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-[13px] font-bold tabular-nums text-slate-100">
            ~{fmt(subscription.monthly_estimate_try)} ₺/ay
          </span>
          <button
            type="button"
            title="Aboneliği kaldır"
            onClick={() => setConfirmOpen(true)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 opacity-0 transition hover:bg-rose-950/50 hover:text-rose-400 group-hover:opacity-100 focus:opacity-100"
            aria-label="Aboneliği sil"
          >
            <Trash2 className="h-4 w-4" strokeWidth={1.75} />
          </button>
        </div>
      </div>

      {confirmOpen ? (
        <Modal title="Aboneliği kaldır" onClose={() => !removing && setConfirmOpen(false)}>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Bu aboneliği listeden kaldırmak istediğinize emin misiniz? İşlem geçmişi silinmez; yalnızca
            abonelik listesinden ve sabit gider toplamından düşülür.
          </p>
          <p className="mb-5 text-sm font-medium text-slate-200">{subscription.label}</p>
          <div className="flex flex-wrap gap-2">
            <Button variant="danger" onClick={() => void handleConfirm()} disabled={removing}>
              {removing ? 'Kaldırılıyor…' : 'Evet, kaldır'}
            </Button>
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={removing}>
              Vazgeç
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
