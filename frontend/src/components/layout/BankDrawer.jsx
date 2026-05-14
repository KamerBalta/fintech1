import React, { useState } from 'react'
import { Building2, Landmark, Plus } from 'lucide-react'
import useStore from '@/store/useStore'
import { Button, InputField, Modal } from '@/components/ui'
import { slugifyBankLabel, normalizeBankId, mergeBankPresetsWithProfiles } from '@/utils/bankSlug'

export default function BankDrawer() {
  const bankDrawerOpen = useStore((s) => s.bankDrawerOpen)
  const setBankDrawerOpen = useStore((s) => s.setBankDrawerOpen)
  const bankPresets = useStore((s) => s.bankPresets) || []
  const user = useStore((s) => s.user)
  const selectedBankId = useStore((s) => s.selectedBankId)
  const setSelectedBank = useStore((s) => s.setSelectedBank)
  const patchBankProfiles = useStore((s) => s.patchBankProfiles)

  const merged = mergeBankPresetsWithProfiles(bankPresets, user?.bank_profiles)

  const [addOpen, setAddOpen] = useState(false)
  const [addName, setAddName] = useState('')
  const [addLimit, setAddLimit] = useState('')
  const [addDay, setAddDay] = useState('15')

  const handleAddManual = async () => {
    const label = addName.trim()
    if (!label) return
    const bid = slugifyBankLabel(label)
    const day = parseInt(addDay, 10)
    if (!Number.isFinite(day) || day < 1 || day > 31) return
    const lr = String(addLimit || '').trim().replace(/\s/g, '').replace(',', '.')
    const lim = lr === '' ? null : parseFloat(lr)
    if (lim != null && (!Number.isFinite(lim) || lim < 0)) return
    const profiles = [...(user?.bank_profiles || [])]
    const n = normalizeBankId(bid)
    const idx = profiles.findIndex((p) => normalizeBankId(p.bank_id) === n)
    const row = { bank_id: n, display_name: label, statement_day: day, monthly_credit_limit: lim }
    if (idx >= 0) profiles[idx] = { ...profiles[idx], ...row }
    else profiles.push(row)
    await patchBankProfiles(profiles)
    setAddOpen(false)
    setAddName('')
    setAddLimit('')
    setAddDay('15')
    setSelectedBank(n)
  }

  if (!bankDrawerOpen) return null

  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-[190] bg-black/50 backdrop-blur-[2px]"
        aria-label="Kapat"
        onClick={() => setBankDrawerOpen(false)}
      />
      <div className="fixed bottom-0 left-16 right-0 z-[200] max-h-[min(72vh,560px)] overflow-hidden rounded-t-2xl border border-slate-700/90 bg-slate-900/98 shadow-2xl animate-slideUp">
        <div className="mx-auto max-w-7xl px-4 pb-6 pt-3 sm:px-6">
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-slate-600" />
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Landmark className="h-4 w-4 text-sky-400" strokeWidth={1.75} aria-hidden />
              <h2 className="text-sm font-bold text-slate-100">Bankalarım</h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="ghost" size="sm" type="button" onClick={() => setAddOpen(true)}>
                <Plus className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
                Manuel banka
              </Button>
              <button
                type="button"
                className="text-xs font-semibold text-sky-400 hover:underline"
                onClick={() => setSelectedBank(null)}
              >
                Tüm bankalar
              </button>
            </div>
          </div>
          <div className="grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto pb-2 sm:grid-cols-3 md:grid-cols-4">
            {merged.map((b) => {
              const active = selectedBankId && normalizeBankId(selectedBankId) === normalizeBankId(b.id)
              return (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => setSelectedBank(b.id)}
                  className={`flex flex-col items-center gap-2 rounded-xl border p-4 transition-all ${
                    active
                      ? 'border-[var(--bank-accent,#2dd4a3)] bg-slate-800/90 ring-2 ring-[var(--bank-accent-soft)]'
                      : 'border-slate-700/80 bg-slate-800/50 hover:border-slate-600'
                  }`}
                >
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-full text-white shadow-inner"
                    style={{ background: b.accent || '#334155' }}
                  >
                    <Building2 className="h-5 w-5 opacity-95" strokeWidth={1.6} aria-hidden />
                  </div>
                  <span className="text-center text-[11px] font-semibold leading-tight text-slate-200">{b.name}</span>
                  <span className="text-[9px] text-slate-500">{b.id}</span>
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {addOpen ? (
        <Modal title="Manuel banka ekle" onClose={() => setAddOpen(false)}>
          <p className="mb-3 text-xs text-slate-400">
            Banka adı URL-benzeri bir kimliğe dönüştürülür (ör. &quot;TEB&quot; → <code className="text-slate-200">teb</code>).
          </p>
          <InputField label="Banka adı" value={addName} onChange={(e) => setAddName(e.target.value)} placeholder="Örn. TEB" />
          <div className="mt-3">
            <InputField
              label="Toplam kart limiti (₺)"
              value={addLimit}
              onChange={(e) => setAddLimit(e.target.value)}
              placeholder="İsteğe bağlı"
            />
          </div>
          <div className="mt-3">
            <InputField label="Hesap kesim günü" value={addDay} onChange={(e) => setAddDay(e.target.value)} />
          </div>
          <div className="mt-6 flex gap-2">
            <Button variant="primary" type="button" onClick={() => void handleAddManual()}>
              Kaydet
            </Button>
            <Button variant="ghost" type="button" onClick={() => setAddOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </Modal>
      ) : null}
    </>
  )
}
