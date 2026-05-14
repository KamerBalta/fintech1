import React, { useEffect, useMemo, useState } from 'react'
import { Wallet, CreditCard, TrendingUp, Shield, Edit2 } from 'lucide-react'
import useStore from '@/store/useStore'
import StatCard from '@/components/dashboard/StatCard'
import RecentActivityList from '@/components/dashboard/RecentActivityList'
import BankSummaryCard from '@/components/dashboard/BankSummaryCard'
import StatementCutoverAlerts from '@/components/dashboard/StatementCutoverAlerts'
import AreaChart from '@/components/charts/AreaChart'
import { Card, SectionLabel, ProgressBar, Button, InputField, Modal } from '@/components/ui'
import { fmt, fmtK, CAT_COLORS } from '@/utils/format'
import { normalizeBankId } from '@/utils/bankSlug'

const emptyLimits = { usage: {}, alerts: [], violations: 0 }

const INCOME_CATS = new Set(['Maaş', 'Gelir', 'Transfer Girişi'])

export default function DashboardPage() {
  const {
    insights,
    limits,
    advisories,
    goals,
    transactions,
    setTab,
    user,
    saveManualTotalAssets,
    selectedBankId,
    bankPresets,
    patchBankProfiles,
  } = useStore()
  const ins = insights
  const lim = limits || emptyLimits
  const advs = advisories || []
  const gl = goals || []
  const fraudCount = transactions.filter((t) => t.is_fraud).length

  const spentPdf30 = useMemo(() => {
    const ref = new Date()
    const start = new Date(ref.getTime() - 30 * 86400000)
    let s = 0
    for (const t of transactions || []) {
      if (selectedBankId && normalizeBankId(t.bank_id || 'legacy') !== normalizeBankId(selectedBankId)) continue
      if (INCOME_CATS.has(t.category || '')) continue
      if (String(t.source || '') !== 'pdf') continue
      const ds = String(t.date || '').trim().slice(0, 10)
      let td = null
      if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
        const [y, m, d] = ds.split('-').map(Number)
        td = new Date(y, m - 1, d)
      } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(ds)) {
        const [d, m, y] = ds.split('.').map(Number)
        td = new Date(y, m - 1, d)
      }
      if (!td || td < start) continue
      s += Number(t.amount) || 0
    }
    return s
  }, [transactions, selectedBankId])

  const spent30Bank = useMemo(() => {
    const ref = new Date()
    const start = new Date(ref.getTime() - 30 * 86400000)
    let s = 0
    for (const t of transactions || []) {
      if (selectedBankId && normalizeBankId(t.bank_id || 'legacy') !== normalizeBankId(selectedBankId)) continue
      if (INCOME_CATS.has(t.category || '')) continue
      const ds = String(t.date || '').trim().slice(0, 10)
      let td = null
      if (/^\d{4}-\d{2}-\d{2}$/.test(ds)) {
        const [y, m, d] = ds.split('-').map(Number)
        td = new Date(y, m - 1, d)
      } else if (/^\d{2}\.\d{2}\.\d{4}$/.test(ds)) {
        const [d, m, y] = ds.split('.').map(Number)
        td = new Date(y, m - 1, d)
      }
      if (!td || td < start) continue
      s += Number(t.amount) || 0
    }
    return s
  }, [transactions, selectedBankId])

  const bankProfile = useMemo(() => {
    if (!selectedBankId) return null
    const nid = normalizeBankId(selectedBankId)
    return (user?.bank_profiles || []).find((p) => normalizeBankId(p.bank_id) === nid) || null
  }, [user?.bank_profiles, selectedBankId])

  const selectedBankMeta = useMemo(
    () => bankPresets?.find((b) => b.id === normalizeBankId(selectedBankId)),
    [bankPresets, selectedBankId],
  )

  const [bankEditOpen, setBankEditOpen] = useState(false)
  const [bankEditDay, setBankEditDay] = useState('15')
  const [bankEditLimit, setBankEditLimit] = useState('')

  useEffect(() => {
    if (!bankEditOpen || !selectedBankId) return
    const cur =
      bankProfile || {
        bank_id: selectedBankId,
        statement_day: 15,
        monthly_credit_limit: null,
        display_name: null,
      }
    setBankEditDay(String(cur.statement_day ?? 15))
    setBankEditLimit(
      cur.monthly_credit_limit != null && Number.isFinite(Number(cur.monthly_credit_limit))
        ? String(Number(cur.monthly_credit_limit))
        : '',
    )
  }, [bankEditOpen, selectedBankId, bankProfile])

  const saveBankProfileLocal = async () => {
    if (!selectedBankId) return
    const day = parseInt(bankEditDay, 10)
    if (!Number.isFinite(day) || day < 1 || day > 31) return
    const limRaw = String(bankEditLimit || '').trim().replace(/\s/g, '').replace(',', '.')
    const lim = limRaw === '' ? null : parseFloat(limRaw)
    if (lim != null && (!Number.isFinite(lim) || lim < 0)) return
    const profiles = [...(user?.bank_profiles || [])]
    const nid = normalizeBankId(selectedBankId)
    const idx = profiles.findIndex((p) => normalizeBankId(p.bank_id) === nid)
    const base = {
      bank_id: nid,
      statement_day: day,
      monthly_credit_limit: lim,
      display_name:
        bankProfile?.display_name ||
        selectedBankMeta?.name ||
        (selectedBankId && !selectedBankMeta ? selectedBankId : null),
    }
    if (idx >= 0) profiles[idx] = { ...profiles[idx], ...base }
    else profiles.push(base)
    await patchBankProfiles(profiles)
    setBankEditOpen(false)
  }
  const [assetModalOpen, setAssetModalOpen] = useState(false)
  const [assetDraft, setAssetDraft] = useState('')

  useEffect(() => {
    if (!ins) return
    const m = ins.manual_total_assets
    if (m !== null && m !== undefined && Number.isFinite(Number(m))) {
      setAssetDraft(String(Number(m)))
    } else {
      setAssetDraft('')
    }
  }, [ins?.manual_total_assets])

  if (!ins) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-16 text-center text-sm text-slate-400 sm:px-6">
        Finansal özet yükleniyor…
      </div>
    )
  }

  const spendPct =
    ins.monthly_income > 0 ? ((ins.monthly_spending / ins.monthly_income) * 100).toFixed(1) : '—'

  const hasManual = ins.manual_total_assets !== null && ins.manual_total_assets !== undefined
  const computedHint =
    typeof ins.total_assets_computed === 'number' ? ins.total_assets_computed : ins.total_assets

  const openAssetModal = () => {
    if (hasManual && ins.manual_total_assets != null) {
      setAssetDraft(String(Number(ins.manual_total_assets)))
    } else {
      setAssetDraft('')
    }
    setAssetModalOpen(true)
  }

  const handleSaveAssets = async () => {
    await saveManualTotalAssets(assetDraft)
    setAssetModalOpen(false)
  }

  const handleClearAssets = async () => {
    await saveManualTotalAssets('', { clear: true })
    setAssetModalOpen(false)
  }

  const assetEditBtn = (
    <button
      type="button"
      title="Toplam varlığı düzenle"
      onClick={openAssetModal}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-transparent text-slate-400 transition-colors hover:border-slate-600 hover:bg-slate-700/60 hover:text-slate-100"
    >
      <Edit2 className="h-4 w-4" strokeWidth={1.75} aria-hidden />
    </button>
  )

  return (
    <div className="mx-auto w-full min-w-0 max-w-7xl overflow-x-hidden px-4 pb-10 sm:px-6">
      <StatementCutoverAlerts profiles={user?.bank_profiles || []} bankPresets={bankPresets || []} />

      {/* Üst blok: başlık + KPI — grafikten gap-8 ile ayrı */}
      <div className="space-y-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-400 sm:text-sm">Hoş geldiniz, {user?.full_name || 'Kullanıcı'}</p>
            <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-50 sm:text-2xl">Finansal genel bakış</h1>
            {selectedBankId ? (
              <p className="mt-1 text-xs font-medium text-sky-300/95">
                Görünüm: {selectedBankMeta?.name || bankProfile?.display_name || selectedBankId}
              </p>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2">
            {lim.violations > 0 && (
              <button
                type="button"
                onClick={() => setTab('limits')}
                className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-950/30 px-3 py-2 text-left transition-colors hover:border-rose-500/40"
              >
                <span className="text-sm" aria-hidden>
                  🚨
                </span>
                <div>
                  <div className="text-[11px] font-bold text-rose-300">{lim.violations} limit ihlali</div>
                  <div className="text-[10px] text-slate-400">Detay</div>
                </div>
              </button>
            )}
            {fraudCount > 0 && (
              <button
                type="button"
                onClick={() => setTab('fraud')}
                className="flex items-center gap-2 rounded-xl border border-rose-500/25 bg-rose-950/30 px-3 py-2 text-left transition-colors hover:border-rose-500/40"
              >
                <span className="text-sm" aria-hidden>
                  ⚠️
                </span>
                <div>
                  <div className="text-[11px] font-bold text-rose-300">{fraudCount} şüpheli işlem</div>
                  <div className="text-[10px] text-slate-400">İncele</div>
                </div>
              </button>
            )}
          </div>
        </div>

        {ins.analytics_period_label ? (
          <div className="rounded-xl border border-slate-700/80 bg-slate-800/40 px-4 py-3 text-xs leading-relaxed text-slate-300 sm:text-[13px]">
            <span className="font-semibold text-emerald-400/90">Ekstre dönemi:</span> {ins.analytics_period_label}. Üstteki
            aylık gelir ve harcama bu döneme göre; aşağıdaki trend son ayların birleşik görünümüdür.
          </div>
        ) : null}

        {selectedBankId ? (
          <BankSummaryCard
            bankName={selectedBankMeta?.name || bankProfile?.display_name || selectedBankId}
            accent={selectedBankMeta?.accent || '#2dd4a3'}
            totalLimit={bankProfile?.monthly_credit_limit ?? null}
            pdfSpentAmount={spentPdf30}
            allSpentAmount={spent30Bank}
            statementDay={bankProfile?.statement_day ?? null}
            onEditProfile={() => setBankEditOpen(true)}
          />
        ) : null}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-5 lg:grid-cols-4 lg:gap-6">
          <StatCard
            label="Toplam varlık"
            value={`${fmt(ins.total_assets)} ₺`}
            sub={hasManual ? 'Manuel değer' : 'Otomatik tahmin · Dashboard hesabı'}
            color="green"
            icon={<Wallet className="h-5 w-5 text-emerald-400" strokeWidth={1.75} aria-hidden />}
            headerRight={assetEditBtn}
          />
          <StatCard
            label="Aylık harcama"
            value={`${fmt(ins.monthly_spending)} ₺`}
            sub={spendPct === '—' ? 'Gelir verisi yetersiz' : `Gelirin %${spendPct}'i`}
            color="blue"
            icon={<CreditCard className="h-5 w-5 text-sky-400" strokeWidth={1.75} aria-hidden />}
          />
          <StatCard
            label="Tasarruf oranı"
            value={`%${ins.savings_rate}`}
            sub="Gelir − harcama"
            color="green"
            icon={<TrendingUp className="h-5 w-5 text-emerald-400" strokeWidth={1.75} aria-hidden />}
          />
          <StatCard
            label="Kredi skoru"
            value={ins.credit_score}
            sub={ins.score_label}
            color={ins.credit_score >= 700 ? 'green' : 'amber'}
            icon={
              <Shield
                className={ins.credit_score >= 700 ? 'h-5 w-5 text-emerald-400' : 'h-5 w-5 text-amber-300'}
                strokeWidth={1.75}
                aria-hidden
              />
            }
          />
        </div>
      </div>

      {assetModalOpen ? (
        <Modal title="Toplam varlık" onClose={() => setAssetModalOpen(false)}>
          <p className="mb-4 text-sm leading-relaxed text-slate-400">
            Otomatik tahmin:{' '}
            <strong className="font-semibold text-slate-200 tabular-nums">{fmt(computedHint)} ₺</strong>
            {hasManual ? <span className="text-slate-500"> — Şu an manuel değer kullanılıyor.</span> : null}
          </p>
          <InputField
            label="Toplam varlık (₺)"
            type="text"
            inputMode="decimal"
            placeholder="Örn. 450000"
            value={assetDraft}
            onChange={(e) => setAssetDraft(e.target.value)}
          />
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void handleSaveAssets()}>
              Kaydet
            </Button>
            <Button variant="ghost" onClick={() => void handleClearAssets()}>
              Otomatiğe dön
            </Button>
            <Button variant="ghost" onClick={() => setAssetModalOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </Modal>
      ) : null}

      {bankEditOpen && selectedBankId ? (
        <Modal title="Kart limiti ve kesim günü" onClose={() => setBankEditOpen(false)}>
          <p className="mb-3 text-xs text-slate-400">
            Banka:{' '}
            <strong className="text-slate-200">
              {selectedBankMeta?.name || bankProfile?.display_name || selectedBankId}
            </strong>
          </p>
          <InputField
            label="Toplam kart limiti (₺)"
            type="text"
            inputMode="decimal"
            placeholder="Boş bırakılabilir"
            value={bankEditLimit}
            onChange={(e) => setBankEditLimit(e.target.value)}
          />
          <div className="mt-3">
            <InputField
              label="Hesap kesim günü (1-31)"
              type="text"
              inputMode="numeric"
              value={bankEditDay}
              onChange={(e) => setBankEditDay(e.target.value)}
            />
          </div>
          <div className="mt-6 flex flex-wrap gap-2">
            <Button variant="primary" onClick={() => void saveBankProfileLocal()}>
              Kaydet
            </Button>
            <Button variant="ghost" onClick={() => setBankEditOpen(false)}>
              Vazgeç
            </Button>
          </div>
        </Modal>
      ) : null}

      {/* Grafik: üst bloktan net ayrım */}
      <section className="mt-8 space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Harcama trendi</h2>
          <span className="text-[11px] text-slate-500">Kesik çizgi: tahmin · Dolu: gerçekleşen</span>
        </div>
        <Card className="!border-slate-700/80 !bg-slate-800/40 !p-5 sm:!p-6">
          <SectionLabel className="!mb-3 !text-slate-500">Son aylar ve tahmin</SectionLabel>
          <div className="w-full min-w-0 max-w-full overflow-hidden">
            <AreaChart data={ins.spending_forecast || []} width={640} height={128} />
          </div>
        </Card>
      </section>

      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2 lg:gap-6">
        <Card className="!border-slate-700/80 !bg-slate-800/40 !p-5 sm:!p-6">
          <div className="mb-4 flex items-center justify-between gap-2">
            <SectionLabel className="!mb-0 !text-slate-500">Limit kullanımı</SectionLabel>
            <Button variant="ghost" size="sm" onClick={() => setTab('limits')}>
              Tümü →
            </Button>
          </div>
          {Object.keys(lim.usage || {}).length === 0 ? (
            <p className="text-xs text-slate-400">Henüz limit tanımlanmadı.</p>
          ) : (
            Object.entries(lim.usage || {})
              .slice(0, 5)
              .map(([cat, u]) => (
                <div key={cat} className="mb-3 last:mb-0">
                  <div className="mb-1 flex justify-between gap-2 text-[11px] text-slate-300">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: CAT_COLORS[cat] || '#64748b' }} />
                      <span className="truncate">{cat}</span>
                    </span>
                    <span
                      className="shrink-0 font-semibold tabular-nums"
                      style={{
                        color:
                          u.status === 'critical'
                            ? 'var(--red)'
                            : u.status === 'warning'
                              ? 'var(--amber)'
                              : 'var(--t1)',
                      }}
                    >
                      {fmt(u.spent)} / {fmt(u.limit)} ₺
                    </span>
                  </div>
                  <ProgressBar
                    pct={u.pct}
                    height={5}
                    color={
                      u.status === 'critical'
                        ? 'var(--red)'
                        : u.status === 'warning'
                          ? 'var(--amber)'
                          : 'var(--green)'
                    }
                  />
                  <div
                    className="mt-0.5 text-[10px] tabular-nums"
                    style={{
                      color:
                        u.status === 'critical'
                          ? 'var(--red)'
                          : u.status === 'warning'
                            ? 'var(--amber)'
                            : 'var(--t3)',
                    }}
                  >
                    %{u.pct.toFixed(1)}
                  </div>
                </div>
              ))
          )}
        </Card>

        <div className="grid grid-cols-1 gap-4">
          <Card className="!border-slate-700/80 !bg-slate-800/40 !p-5 sm:!p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <SectionLabel className="!mb-0 !text-slate-500">Tasarruf hedefleri</SectionLabel>
              <Button variant="ghost" size="sm" onClick={() => setTab('goals')}>
                Tümü →
              </Button>
            </div>
            {gl.length === 0 ? (
              <p className="text-xs text-slate-400">Henüz hedef yok.</p>
            ) : (
              gl.slice(0, 3).map((g) => {
                const color =
                  g.progress_pct >= 75 ? 'var(--green)' : g.progress_pct >= 40 ? 'var(--blue)' : 'var(--amber)'
                return (
                  <div key={g.id} className="mb-3 last:mb-0">
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="truncate text-xs font-semibold text-slate-200">
                        {g.emoji} {g.title}
                      </span>
                      <span className="shrink-0 text-[11px] font-bold tabular-nums" style={{ color }}>
                        {g.progress_pct.toFixed(1)}%
                      </span>
                    </div>
                    <ProgressBar pct={g.progress_pct} color={color} height={4} />
                    <div className="mt-1 flex justify-between text-[10px] text-slate-400">
                      <span className="tabular-nums">
                        {fmtK(g.saved_amount)} / {fmtK(g.target_amount)} ₺
                      </span>
                      <span>{g.days_remaining != null ? `${g.days_remaining} gün` : 'Süresiz'}</span>
                    </div>
                  </div>
                )
              })
            )}
          </Card>

          <Card className="!border-slate-700/80 !bg-slate-800/40 !p-5 sm:!p-6">
            <div className="mb-4 flex items-center justify-between gap-2">
              <SectionLabel className="!mb-0 !text-slate-500">AI tavsiyeleri</SectionLabel>
              <Button variant="ghost" size="sm" onClick={() => setTab('advisory')}>
                Tümü →
              </Button>
            </div>
            {advs.length === 0 ? (
              <p className="text-xs text-slate-400">Tavsiye bulunmuyor.</p>
            ) : (
              advs.slice(0, 3).map((a, i) => {
                const borderColors = {
                  opportunity: 'var(--green)',
                  alert: 'var(--red)',
                  warning: 'var(--amber)',
                  tip: 'var(--blue)',
                  goal: 'var(--purple)',
                  investment: 'var(--cyan)',
                }
                return (
                  <div
                    key={i}
                    className="mb-2 flex gap-2.5 rounded-lg border border-slate-700/60 bg-slate-900/30 px-3 py-2.5 last:mb-0"
                    style={{ borderLeftWidth: 3, borderLeftColor: borderColors[a.type] || 'var(--blue)' }}
                  >
                    <span className="shrink-0 text-sm">{a.icon}</span>
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-slate-200">{a.title}</div>
                      <div className="mt-0.5 text-[11px] leading-snug text-slate-400">
                        {(a.message || '').length > 100 ? `${a.message.substring(0, 100)}…` : a.message}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </Card>
        </div>
      </div>

      <section className="mt-8 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-slate-400">Son işlemler</h2>
          <button
            type="button"
            className="text-xs font-semibold text-sky-400 transition-colors hover:text-sky-300"
            onClick={() => setTab('pdf')}
          >
            PDF ekstre →
          </button>
        </div>
        <Card className="!border-slate-700/80 !bg-slate-800/40 !p-3 sm:!p-4">
          <RecentActivityList transactions={transactions} max={10} />
        </Card>
      </section>
    </div>
  )
}
