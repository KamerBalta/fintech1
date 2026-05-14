import React from 'react'
import useStore from '@/store/useStore'
import { useMarket } from '@/hooks/useMarket'

function TickerItem({ symbol, rate, change_pct }) {
  const up = change_pct >= 0
  const rateStr = rate < 100 ? rate.toFixed(4) : rate.toLocaleString('tr-TR')
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 8,
      padding: '0 20px', borderRight: '1px solid var(--border)', height: 38,
    }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--t2)', letterSpacing: '.05em' }}>
        {symbol}
      </span>
      <span style={{ fontSize: 12, fontWeight: 700, color: up ? 'var(--green)' : 'var(--red)' }}>
        {rateStr}
      </span>
      <span style={{
        fontSize: 9, fontWeight: 700, padding: '2px 6px', borderRadius: 4,
        background: up ? 'var(--gd)' : 'var(--rd)',
        color: up ? 'var(--green)' : 'var(--red)',
      }}>
        {up ? '▲' : '▼'}{Math.abs(change_pct).toFixed(2)}%
      </span>
    </div>
  )
}

export default function MarketTicker() {
  useMarket(120000)
  const market = useStore((s) => s.market)
  const items = market.length ? market : []

  if (!items.length) {
    return (
      <div style={{
        background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
        height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 10, color: 'var(--t3)', flexShrink: 0,
      }}>
        Kur verisi yükleniyor…
      </div>
    )
  }

  return (
    <div style={{
      background: 'var(--bg-1)', borderBottom: '1px solid var(--border)',
      height: 38, display: 'flex', alignItems: 'center', overflow: 'hidden', flexShrink: 0,
    }}>
      <div style={{ display: 'flex', animation: 'ticker 45s linear infinite', whiteSpace: 'nowrap' }}>
        {[...items, ...items].map((m, i) => (
          <TickerItem key={`${m.symbol}-${i}`} {...m} />
        ))}
      </div>
    </div>
  )
}
