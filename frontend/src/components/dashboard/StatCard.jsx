import React from 'react'
import { clsx } from 'clsx'

const VALUE_CLASS = {
  green: 'text-emerald-300',
  blue: 'text-sky-300',
  amber: 'text-amber-300',
  red: 'text-rose-300',
  purple: 'text-violet-300',
}

/**
 * Fintech KPI kartı — slate yüzey, net tipografi, Lucide ikon slotu.
 */
export default function StatCard({
  label,
  value,
  sub,
  color = 'green',
  headerRight = null,
  icon = null,
  className = '',
}) {
  const valueClass = VALUE_CLASS[color] || VALUE_CLASS.green

  return (
    <div
      className={clsx(
        'flex min-h-0 min-w-0 flex-col rounded-xl border border-slate-700/80 bg-slate-800/50 p-6 shadow-sm',
        'transition-colors hover:border-slate-600/90 hover:bg-slate-800/70',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-slate-600/50 bg-slate-700/35 text-slate-200 [&>svg]:shrink-0"
          aria-hidden
        >
          {icon}
        </div>
        {headerRight ? <div className="shrink-0 pt-0.5">{headerRight}</div> : null}
      </div>
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={clsx('mt-1.5 text-2xl font-bold tabular-nums tracking-tight text-slate-50 sm:text-[1.65rem]', valueClass)}>
        {value}
      </p>
      {sub ? <p className="mt-2 text-xs leading-relaxed text-slate-400">{sub}</p> : null}
    </div>
  )
}
