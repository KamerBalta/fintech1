import React, { useRef } from 'react'
import useStore from '@/store/useStore'
import { Card, SectionLabel, Button } from '@/components/ui'
import DonutChart from '@/components/charts/DonutChart'
import { fmt, CAT_COLORS } from '@/utils/format'

const STEPS = ['Yükleniyor', 'Analiz Ediliyor', 'Kaydediliyor', 'Tamamlandı']

function StepIndicator({ current }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 0, marginBottom: 18 }}>
      {STEPS.map((label, i) => {
        const done = current > i
        const active = current === i + 1
        return (
          <React.Fragment key={i}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 7,
              padding: '7px 14px', borderRadius: 8, fontSize: 11, fontWeight: 600,
              background: active ? 'var(--bg-2)' : 'transparent',
              color: done ? 'var(--green)' : active ? 'var(--t1)' : 'var(--t3)',
            }}>
              <div style={{
                width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 9, fontWeight: 700,
                background: done ? 'var(--green)' : active ? 'var(--blue)' : 'var(--bg-3)',
                color: done ? '#050d1a' : active ? '#fff' : 'var(--t3)',
                boxShadow: active ? '0 0 0 0 rgba(59,139,255,.4)' : 'none',
                animation: active ? 'sp 1.5s infinite' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              {label}
            </div>
            {i < STEPS.length - 1 && (
              <span style={{ color: 'var(--t3)', padding: '0 4px', fontSize: 12 }}>›</span>
            )}
          </React.Fragment>
        )
      })}
      <style>{`@keyframes sp{0%,100%{box-shadow:0 0 0 0 rgba(59,139,255,.4)}50%{box-shadow:0 0 0 6px rgba(59,139,255,0)}}`}</style>
    </div>
  )
}

export default function PDFPage() {
  const {
    uploadStep, pdfName, pdfInsights, billForecast, transactions, categories,
    uploadBankPdf, resetUpload, uploadError,
  } = useStore()
  const fileRef = useRef()
  const [dragOver, setDragOver] = React.useState(false)
  const [localErr, setLocalErr] = React.useState('')

  const cats = Object.keys(categories || {}).length ? categories : {}
  const txns = transactions?.length ? transactions : []
  const isDone = uploadStep === 3
  const err = uploadError || localErr

  const handleFile = async (file) => {
    setLocalErr('')
    try {
      await uploadBankPdf(file)
    } catch (e) {
      setLocalErr(e.message || 'Yükleme başarısız')
    }
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontSize: 21, fontWeight: 800 }}>PDF Banka Ekstresi Analizi</h1>
          <p style={{ fontSize: 11, color: 'var(--t3)', marginTop: 2 }}>
            PDF backend&apos;e gönderilir; işlemler MongoDB&apos;ye kaydedilir
          </p>
        </div>
        {isDone && (
          <Button variant="ghost" onClick={resetUpload}>Yeni Yükleme</Button>
        )}
      </div>

      {uploadStep > 0 && <StepIndicator current={uploadStep} />}

      {err && (
        <div style={{
          marginBottom: 14, padding: '10px 14px', borderRadius: 10,
          background: 'var(--rd)', border: '1px solid rgba(255,77,106,.2)', color: 'var(--red)', fontSize: 11,
        }}>
          {err}
        </div>
      )}

      {!isDone && (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files?.[0]
            if (f) void handleFile(f)
          }}
          onClick={() => fileRef.current?.click()}
          style={{
            border: `2px dashed ${dragOver ? 'var(--green)' : 'var(--border)'}`,
            borderRadius: 16, padding: 48, textAlign: 'center', cursor: 'pointer',
            background: dragOver ? 'var(--gd)' : 'var(--bg-1)',
            transition: 'all .2s',
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf"
            style={{ display: 'none' }}
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) void handleFile(f)
            }}
          />
          <div style={{ fontSize: 48, marginBottom: 12 }}>📤</div>
          <div style={{ fontSize: 14, fontWeight: 700 }}>
            {pdfName || 'PDF dosyanızı sürükleyin veya tıklayın'}
          </div>
          <div style={{ fontSize: 11, color: 'var(--t3)', marginTop: 5 }}>
            Yalnızca .pdf — tablo veya metin satırlarından işlem çıkarılır
          </div>
        </div>
      )}

      {isDone && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 4 }}>
          <Card>
            <SectionLabel>Kategori Dağılımı</SectionLabel>
            <div style={{ marginTop: 12 }}>
              {Object.keys(cats).length ? <DonutChart data={cats} size={190} /> : (
                <p style={{ fontSize: 11, color: 'var(--t3)' }}>Kategori verisi yok.</p>
              )}
            </div>
            {billForecast > 0 && (
              <div style={{
                marginTop: 14, padding: '11px 13px',
                background: 'var(--ad)', border: '1px solid rgba(255,180,41,.2)', borderRadius: 10,
              }}>
                <div style={{ fontSize: 10, color: 'var(--amber)', fontWeight: 700 }}>📅 Gelecek Ay Fatura Tahmini</div>
                <div style={{ fontSize: 18, fontWeight: 800, marginTop: 3 }}>{fmt(billForecast)} ₺</div>
              </div>
            )}
          </Card>

          <Card>
            <SectionLabel>AI İçgörüler</SectionLabel>
            {(pdfInsights || []).map((ins, i) => (
              <div key={i} style={{
                display: 'flex', gap: 8, padding: '9px 11px',
                background: 'var(--bg-2)', borderRadius: 9, marginBottom: 6,
                fontSize: 11, color: 'var(--t2)', lineHeight: 1.5,
              }}>
                <span style={{ flexShrink: 0 }}>💡</span>{ins}
              </div>
            ))}

            <SectionLabel style={{ marginTop: 16 }}>Son İşlemler</SectionLabel>
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {txns.slice(0, 12).map((t) => (
                <div key={t.id} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '7px 0', borderBottom: '1px solid rgba(28,48,80,.4)',
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    {t.is_fraud
                      ? <span style={{ color: 'var(--red)', fontSize: 11 }}>⚠</span>
                      : <div style={{ width: 5, height: 5, borderRadius: '50%', background: CAT_COLORS[t.category] || '#4d6b85' }} />
                    }
                    <div>
                      <div style={{ fontSize: 11, color: 'var(--t1)' }}>{t.description}</div>
                      <div style={{ fontSize: 9, color: 'var(--t3)' }}>
                        {t.date}{t.is_recurring ? ' · 🔄' : ''}
                      </div>
                    </div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: t.is_fraud ? 'var(--red)' : 'var(--t1)' }}>
                    {fmt(t.amount)} ₺
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}
    </div>
  )
}
