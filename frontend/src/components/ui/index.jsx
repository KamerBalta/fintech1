// src/components/ui/index.jsx
// Reusable primitive bileşenler

import React from 'react'
import { createPortal } from 'react-dom'
import { clsx } from 'clsx'

// ── Card ─────────────────────────────────────────────────────────────────────
export function Card({ children, className = '', style }) {
  return (
    <div
      className={clsx('rounded-2xl border p-5', className)}
      style={{ background: 'var(--bg-1)', borderColor: 'var(--border)', ...style }}
    >
      {children}
    </div>
  )
}

// ── SectionLabel ─────────────────────────────────────────────────────────────
export function SectionLabel({ children, className = '' }) {
  return (
    <p className={clsx('text-[9px] font-bold tracking-widest uppercase mb-2.5', className)}
       style={{ color: 'var(--t3)' }}>
      {children}
    </p>
  )
}

// ── Badge ────────────────────────────────────────────────────────────────────
const BADGE_VARIANTS = {
  green:  { bg: 'var(--gd)', color: 'var(--green)', border: 'rgba(0,214,143,.2)' },
  blue:   { bg: 'var(--bd)', color: 'var(--blue)',  border: 'rgba(59,139,255,.2)' },
  red:    { bg: 'var(--rd)', color: 'var(--red)',   border: 'rgba(255,77,106,.2)' },
  amber:  { bg: 'var(--ad)', color: 'var(--amber)', border: 'rgba(255,180,41,.2)' },
  purple: { bg: 'var(--pd)', color: 'var(--purple)',border: 'rgba(155,109,255,.2)' },
}

export function Badge({ children, variant = 'green', className = '' }) {
  const v = BADGE_VARIANTS[variant] || BADGE_VARIANTS.green
  return (
    <span
      className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border', className)}
      style={{ background: v.bg, color: v.color, borderColor: v.border }}
    >
      {children}
    </span>
  )
}

// ── Button ───────────────────────────────────────────────────────────────────
export function Button({ children, variant = 'primary', size = 'md', className = '', ...props }) {
  const base = 'inline-flex items-center gap-1.5 rounded-[9px] font-semibold transition-all duration-200 cursor-pointer'
  const sizes = { md: 'px-4 py-2 text-xs', sm: 'px-3 py-1.5 text-[10px]', lg: 'px-5 py-2.5 text-sm' }
  const variants = {
    primary: 'bg-[var(--green)] text-[#050d1a] hover:brightness-110 hover:-translate-y-px',
    ghost:   'bg-[var(--bg-2)] text-[var(--t2)] border border-[var(--border)] hover:border-[var(--border-hi)] hover:text-[var(--t1)]',
    danger:  'bg-[var(--rd)] text-[var(--red)] border border-[rgba(255,77,106,.2)]',
  }
  return (
    <button className={clsx(base, sizes[size], variants[variant], className)} {...props}>
      {children}
    </button>
  )
}

// ── InputField ───────────────────────────────────────────────────────────────
export function InputField({ label, ...props }) {
  return (
    <div>
      {label && <label className="block text-[9px] font-bold tracking-wider uppercase mb-1.5" style={{ color: 'var(--t3)' }}>{label}</label>}
      <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5 border transition-colors focus-within:border-[var(--green)]"
           style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <input className="flex-1 text-[12px] bg-transparent placeholder:text-[var(--t3)]" {...props} />
      </div>
    </div>
  )
}

// ── SelectField ──────────────────────────────────────────────────────────────
export function SelectField({ label, children, ...props }) {
  return (
    <div>
      {label && <label className="block text-[9px] font-bold tracking-wider uppercase mb-1.5" style={{ color: 'var(--t3)' }}>{label}</label>}
      <div className="flex items-center gap-2 rounded-[8px] px-3 py-2.5 border transition-colors focus-within:border-[var(--green)]"
           style={{ background: 'var(--bg-2)', borderColor: 'var(--border)' }}>
        <select className="flex-1 text-[12px] bg-transparent" style={{ background: 'var(--bg-2)' }} {...props}>
          {children}
        </select>
      </div>
    </div>
  )
}

// ── ProgressBar ──────────────────────────────────────────────────────────────
export function ProgressBar({ pct = 0, color = 'var(--green)', height = 6 }) {
  return (
    <div className="rounded-full overflow-hidden" style={{ height, background: 'var(--bg-3)' }}>
      <div className="h-full rounded-full progress-fill"
           style={{ width: `${Math.min(pct, 100)}%`, background: color }} />
    </div>
  )
}

// ── Skeleton ─────────────────────────────────────────────────────────────────
export function Skeleton({ width = '100%', height = 20, className = '' }) {
  return (
    <div className={clsx('skeleton', className)}
         style={{ width, height, borderRadius: 6 }} />
  )
}

// ── Modal ────────────────────────────────────────────────────────────────────
export function Modal({ title, onClose, children }) {
  if (typeof document === 'undefined') return null
  return createPortal(
    <div
      className="fixed inset-0 z-[500] flex items-center justify-center overflow-y-auto overflow-x-hidden p-4 animate-fadeIn"
      style={{ background: 'rgba(2, 6, 23, 0.72)' }}
      role="presentation"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="relative w-full max-w-md max-h-[min(90vh,560px)] overflow-y-auto rounded-2xl border border-slate-700/90 bg-slate-900/95 p-6 shadow-2xl shadow-black/40 backdrop-blur-md animate-slideUp"
        role="dialog"
        aria-modal="true"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-5 flex items-center justify-between gap-3">
          <span className="text-base font-semibold tracking-tight text-slate-100">{title}</span>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-lg leading-none text-slate-400 transition-colors hover:bg-slate-800 hover:text-slate-100"
            aria-label="Kapat"
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ── PulseDot ─────────────────────────────────────────────────────────────────
export function PulseDot() {
  return (
    <div className="w-[7px] h-[7px] rounded-full flex-shrink-0"
         style={{ background: 'var(--green)', animation: 'pulseDot 2s infinite' }} />
  )
}
