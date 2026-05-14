import React from 'react'
import useStore from '@/store/useStore'

export default function Toaster() {
  const toasts = useStore((s) => s.toasts)
  const removeToast = useStore((s) => s.removeToast)

  if (!toasts.length) return null

  return (
    <div
      className="fixed bottom-5 right-5 z-[400] flex flex-col gap-2 max-w-[min(100vw-2rem,360px)]"
      aria-live="polite"
    >
      {toasts.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => removeToast(t.id)}
          className="rounded-xl border px-4 py-3 text-left text-xs font-semibold shadow-lg transition hover:opacity-90"
          style={{
            background: t.variant === 'error' ? 'var(--rd)' : 'var(--gd)',
            borderColor: t.variant === 'error' ? 'rgba(255,77,106,.35)' : 'rgba(0,214,143,.35)',
            color: t.variant === 'error' ? 'var(--red)' : 'var(--green)',
          }}
        >
          {t.message}
        </button>
      ))}
    </div>
  )
}
