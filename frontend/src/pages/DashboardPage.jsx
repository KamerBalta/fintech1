import React from 'react'
import useStore from '@/store/useStore'
import StatCard from '@/components/dashboard/StatCard'
import AreaChart from '@/components/charts/AreaChart'
import { Card, SectionLabel, ProgressBar, Button } from '@/components/ui'
import { fmt, fmtK, CAT_COLORS } from '@/utils/format'
import { MOCK_INSIGHTS, MOCK_LIMITS, MOCK_ADVISORIES, MOCK_GOALS, MOCK_BILLS, BILL_ICONS } from '@/services/mockData'

const BILL_ICONS_MAP = { İletişim: '📡', Enerji: '⚡', Abonelik: '📺', Kredi: '💳', Su: '💧', Sigorta: '🛡', Fatura: '📄' }

export default function DashboardPage() {
    const { insights, limits, advisories, goals, bills, transactions, setTab, user } = useStore()
    const ins = insights || MOCK_INSIGHTS
    const lim = limits || MOCK_LIMITS
    const advs = advisories.length ? advisories : MOCK_ADVISORIES
    const gl = goals.length ? goals : MOCK_GOALS
    const bl = bills.length ? bills : MOCK_BILLS
    const fraudCount = transactions.filter((t) => t.is_fraud).length || 3

    return (
        <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                <div>
                    <div style={{ fontSize: 11, color: 'var(--t3)' }}>Hoş geldiniz, {user?.full_name || 'Kullanıcı'} 👋</div>
                    <h1 style={{ fontSize: 21, fontWeight: 800 }}>Finansal Genel Bakış</h1>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {lim.violations > 0 && (
                        <button onClick={() => setTab('limits')} style={{
                            background: 'var(--rd)', border: '1px solid rgba(255,77,106,.25)',
                            borderRadius: 11, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        }}>
                            <span>🚨</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>{lim.violations} Limit İhlali</div>
                                <div style={{ fontSize: 9, color: 'var(--t3)' }}>Detay için tıklayın</div>
                            </div>
                        </button>
                    )}
                    {fraudCount > 0 && (
                        <button onClick={() => setTab('fraud')} style={{
                            background: 'var(--rd)', border: '1px solid rgba(255,77,106,.25)',
                            borderRadius: 11, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer',
                        }}>
                            <span>⚠️</span>
                            <div style={{ textAlign: 'left' }}>
                                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--red)' }}>{fraudCount} Şüpheli İşlem</div>
                                <div style={{ fontSize: 9, color: 'var(--t3)' }}>İncele</div>
                            </div>
                        </button>
                    )}
                </div>
            </div>

            {/* Stat cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 16 }}>
                <StatCard label="Toplam Varlık" value={`${fmt(ins.total_assets)} ₺`} sub="↑ %12.4 bu ay" color="green" spark={[62, 71, 68, 74, 80, 87]} />
                <StatCard label="Aylık Harcama" value={`${fmt(ins.monthly_spending)} ₺`} sub={`Gelirin %${(ins.monthly_spending / ins.monthly_income * 100).toFixed(1)}'i`} color="blue" spark={[58, 62, 71, 64, 69, 68]} />
                <StatCard label="Tasarruf Oranı" value={`%${ins.savings_rate}`} sub="Ortalamanın üzerinde" color="green" spark={[15, 18, 20, 19, 21, 21]} />
                <StatCard label="Kredi Skoru" value={ins.credit_score} sub={ins.score_label} color={ins.credit_score >= 700 ? 'green' : 'amber'} spark={[68, 70, 71, 72, 72, 72]} />
            </div>

            {/* Charts row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 16 }}>
                <Card>
                    <SectionLabel>Harcama Trendi & Tahmin</SectionLabel>
                    <AreaChart data={ins.spending_forecast} />
                </Card>
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <SectionLabel style={{ margin: 0 }}>Limit Kullanım Durumu</SectionLabel>
                        <Button variant="ghost" size="sm" onClick={() => setTab('limits')}>Tümü →</Button>
                    </div>
                    {Object.entries(lim.usage || {}).slice(0, 5).map(([cat, u]) => (
                        <div key={cat} style={{ marginBottom: 10 }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: 'var(--t2)', marginBottom: 3 }}>
                                <span style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 6, height: 6, borderRadius: '50%', background: CAT_COLORS[cat] || '#4d6b85' }} />
                                    {cat}
                                </span>
                                <span style={{ fontWeight: 700, color: u.status === 'critical' ? 'var(--red)' : u.status === 'warning' ? 'var(--amber)' : 'var(--t1)' }}>
                                    {fmt(u.spent)} / {fmt(u.limit)} ₺
                                </span>
                            </div>
                            <ProgressBar pct={u.pct} height={6}
                                color={u.status === 'critical' ? 'var(--red)' : u.status === 'warning' ? 'var(--amber)' : 'var(--green)'} />
                            <div style={{ fontSize: 9, color: u.status === 'critical' ? 'var(--red)' : u.status === 'warning' ? 'var(--amber)' : 'var(--t3)', marginTop: 2 }}>
                                %{u.pct.toFixed(1)}
                            </div>
                        </div>
                    ))}
                </Card>
            </div>

            {/* Bottom row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                {/* Goals */}
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <SectionLabel style={{ margin: 0 }}>Tasarruf Hedefleri</SectionLabel>
                        <Button variant="ghost" size="sm" onClick={() => setTab('goals')}>Tümü →</Button>
                    </div>
                    {gl.slice(0, 3).map((g) => {
                        const color = g.progress_pct >= 75 ? 'var(--green)' : g.progress_pct >= 40 ? 'var(--blue)' : 'var(--amber)'
                        return (
                            <div key={g.id} style={{ marginBottom: 12 }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                                    <span style={{ fontSize: 12, fontWeight: 600 }}>{g.emoji} {g.title}</span>
                                    <span style={{ fontSize: 11, fontWeight: 700, color }}>{g.progress_pct.toFixed(1)}%</span>
                                </div>
                                <ProgressBar pct={g.progress_pct} color={color} height={5} />
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 9, color: 'var(--t3)', marginTop: 3 }}>
                                    <span>{fmtK(g.saved_amount)} / {fmtK(g.target_amount)} ₺</span>
                                    <span>{g.days_remaining != null ? `${g.days_remaining} gün` : 'Süresiz'}</span>
                                </div>
                            </div>
                        )
                    })}
                </Card>

                {/* Advisory */}
                <Card>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                        <SectionLabel style={{ margin: 0 }}>AI Tavsiyeleri</SectionLabel>
                        <Button variant="ghost" size="sm" onClick={() => setTab('advisory')}>Tümü →</Button>
                    </div>
                    {advs.slice(0, 3).map((a, i) => {
                        const borderColors = { opportunity: 'var(--green)', alert: 'var(--red)', warning: 'var(--amber)', tip: 'var(--blue)', goal: 'var(--purple)', investment: 'var(--cyan)' }
                        return (
                            <div key={i} style={{
                                display: 'flex', gap: 10, padding: '10px 13px', borderRadius: 10, marginBottom: 7,
                                background: 'var(--bg-2)', border: '1px solid var(--border)',
                                borderLeft: `3px solid ${borderColors[a.type] || 'var(--blue)'}`,
                            }}>
                                <span style={{ fontSize: 16, flexShrink: 0 }}>{a.icon}</span>
                                <div>
                                    <div style={{ fontSize: 11, fontWeight: 700, marginBottom: 2 }}>{a.title}</div>
                                    <div style={{ fontSize: 10, color: 'var(--t2)', lineHeight: 1.4 }}>{a.message.substring(0, 80)}…</div>
                                </div>
                            </div>
                        )
                    })}
                </Card>
            </div>
        </div>
    )
}