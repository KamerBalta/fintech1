import React from 'react'
import { Receipt, Repeat2 } from 'lucide-react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, Button } from '@/components/ui'
import BillModal from '@/components/bills/BillModal'
import { fmt } from '@/utils/format'

const BILL_ICONS = { İletişim: '📡', Enerji: '⚡', Abonelik: '📺', Kredi: '💳', Su: '💧', Sigorta: '🛡', Fatura: '📄' }

function DaysBadge({ days }) {
  const d = days ?? 99
  const [bg, color] =
    d <= 5
      ? ['var(--rd)', 'var(--red)']
      : d <= 10
        ? ['var(--ad)', 'var(--amber)']
        : ['var(--gd)', 'var(--green)']
  return (
    <span style={{ fontSize: 9, fontWeight: 700, padding: '3px 8px', borderRadius: 6, background: bg, color }}>
      {d} gün
    </span>
  )
}

export default function BillsPage() {
  const { bills, billModal, openBillModal, markBillPaid, subscriptions, subscriptionMonthlyTotal } = useStore()
  const bl = bills || []
  const subs = subscriptions || []

  const totalMonth = bl.reduce((a, b) => a + (b.amount || 0), 0)
  const thisWeekAmt = bl.filter((b) => (b.days_until ?? 99) <= 7).reduce((a, b) => a + (b.amount || 0), 0)

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>Faturalar ve Abonelikler</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            Sabit faturalar ve ekstrelerden tespit edilen abonelikler
          </p>
        </div>
        <Button variant="primary" onClick={openBillModal}>
          + Fatura Ekle
        </Button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 16 }}>
        {[
          { label: 'Aylık fatura toplamı', value: `${fmt(totalMonth)} ₺`, color: 'var(--t1)' },
          { label: 'Tahmini abonelik yükü', value: `${fmt(subscriptionMonthlyTotal)} ₺`, color: 'var(--green)' },
          { label: 'Bu hafta (fatura)', value: `${fmt(thisWeekAmt)} ₺`, color: 'var(--amber)' },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              background: 'var(--bg-1)',
              border: '1px solid var(--border)',
              borderRadius: 16,
              padding: '16px 18px',
            }}
          >
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: '.08em',
                textTransform: 'uppercase',
                color: 'var(--t3)',
              }}
            >
              {s.label}
            </div>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 6 }}>{s.value}</div>
          </div>
        ))}
      </div>

      <Card style={{ marginBottom: 16 }}>
        <div className="mb-2 flex items-center gap-2">
          <Repeat2 className="h-4 w-4 text-emerald-400" strokeWidth={1.75} aria-hidden />
          <SectionLabel>Abonelikler (işlemlerden)</SectionLabel>
        </div>
        <p style={{ fontSize: 10, color: 'var(--t3)', marginBottom: 12 }}>
          Netflix, Spotify vb. veya aylık tekrarlayan tutarlar analiz ile &quot;Abonelik&quot; kategorisine taşınır.
        </p>
        {subs.map((s) => (
          <div
            key={s.label}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '10px 0',
              borderBottom: '1px solid rgba(28,48,80,.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Repeat2 className="h-4 w-4 shrink-0 text-slate-400" strokeWidth={1.5} aria-hidden />
              <div>
                <div style={{ fontSize: 12, fontWeight: 600 }}>{s.label}</div>
                <div style={{ fontSize: 9, color: 'var(--t3)' }}>
                  {s.sample_count} örnek · Son: {s.last_seen || '—'}
                  {s.bank_id ? ` · ${s.bank_id}` : ''}
                </div>
              </div>
            </div>
            <div style={{ fontSize: 14, fontWeight: 800 }}>~{fmt(s.monthly_estimate_try)} ₺/ay</div>
          </div>
        ))}
        {subs.length === 0 && (
          <p style={{ textAlign: 'center', padding: 16, color: 'var(--t3)', fontSize: 11 }}>
            Henüz abonelik satırı yok; PDF yükleyin veya işlemler analiz edilsin.
          </p>
        )}
      </Card>

      <Card>
        <div className="mb-2 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-sky-400" strokeWidth={1.75} aria-hidden />
          <SectionLabel>Yaklaşan faturalar</SectionLabel>
        </div>
        {bl.map((b) => (
          <div
            key={b.id}
            style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 0',
              borderBottom: '1px solid rgba(28,48,80,.4)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: 10,
                  background: 'var(--bg-2)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  flexShrink: 0,
                }}
              >
                {BILL_ICONS[b.category] || '📄'}
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600 }}>{b.name}</div>
                <div style={{ fontSize: 10, color: 'var(--t3)' }}>
                  Her ayın {b.due_day}. günü · {b.category}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 15, fontWeight: 800 }}>{fmt(b.amount)} ₺</div>
                <DaysBadge days={b.days_until} />
              </div>
              <Button variant="ghost" size="sm" onClick={() => void markBillPaid(b.id)}>
                Ödendi ✓
              </Button>
            </div>
          </div>
        ))}
        {bl.length === 0 && (
          <p style={{ textAlign: 'center', padding: 24, color: 'var(--t3)', fontSize: 12 }}>
            Henüz manuel fatura eklenmedi.
          </p>
        )}
      </Card>

      {billModal && <BillModal />}
    </div>
  )
}
