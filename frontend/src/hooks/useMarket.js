import { useEffect } from 'react'
import useStore from '@/store/useStore'
import { MOCK_MARKET } from '@/services/mockData'

// Kur verisi için polling hook (demo: sadece mock)
export function useMarket(intervalMs = 60_000) {
    const setMarket = useStore((s) => s.setMarket)

    useEffect(() => {
        // Gerçek uygulamada: fetch(API.MARKET) her intervalMs'de
        // Demo: mock veriyi küçük noise ile güncelle
        const update = () => {
            const noisy = MOCK_MARKET.map((r) => ({
                ...r,
                rate: +(r.rate * (1 + (Math.random() - 0.5) * 0.002)).toFixed(r.rate < 100 ? 4 : 0),
                change_pct: +(r.change_pct + (Math.random() - 0.5) * 0.1).toFixed(2),
            }))
            // useStore.setState({ market: noisy }) — omit to avoid noise in demo
        }
        const id = setInterval(update, intervalMs)
        return () => clearInterval(id)
    }, [intervalMs])
}