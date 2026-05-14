import { useEffect } from 'react'
import useStore from '@/store/useStore'
import API from '@/config/api'
import { fetchJson } from '@/services/finaraFetch'

/** Kur ticker için periyodik API yenilemesi */
export function useMarket(intervalMs = 120_000) {
  const token = useStore((s) => s.token)

  useEffect(() => {
    if (!token) return undefined

    const run = async () => {
      try {
        const data = await fetchJson(API.MARKET)
        useStore.getState().setMarket(data.rates || [])
      } catch {
        /* sessiz */
      }
    }

    run()
    const id = setInterval(run, intervalMs)
    return () => clearInterval(id)
  }, [intervalMs, token])
}
