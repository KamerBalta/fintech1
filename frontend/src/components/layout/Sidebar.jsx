import React from 'react'
import useStore from '@/store/useStore'
import { useExport } from '@/hooks/useExport'

const TABS = [
  { id: 'dashboard', icon: '▦',  label: 'Dashboard'      },
  { id: 'health',    icon: '❤️',  label: 'Sağlık Skoru'   },
  { id: 'advisory',  icon: '🧠',  label: 'AI Tavsiyeleri' },
  { id: 'pdf',       icon: '📄',  label: 'PDF Analiz'     },
  { id: 'fraud',     icon: '🛡',  label: 'Fraud İzleme'   },
  { id: 'limits',    icon: '⚖️',  label: 'Limitler'       },
  { id: 'goals',     icon: '🎯',  label: 'Hedefler'       },
  { id: 'bills',     icon: '📅',  label: 'Faturalar ve Abonelikler' },
]

function NavBtn({ icon, label, active, onClick }) {
  return (
    <button
      onClick={onClick}
      title={label}
      style={{
        width: 44, height: 44, borderRadius: 10, display: 'flex',
        alignItems: 'center', justifyContent: 'center', fontSize: 17,
        transition: 'all .2s', position: 'relative',
        background: active ? 'var(--gd)' : 'transparent',
        color: active ? 'var(--green)' : 'var(--t3)',
        border: 'none', cursor: 'pointer',
      }}
    >
      {icon}
      <span style={{
        position: 'absolute', left: 52, background: 'var(--bg-3)',
        border: '1px solid var(--border)', borderRadius: 7, padding: '3px 10px',
        fontSize: 11, whiteSpace: 'nowrap', color: 'var(--t1)',
        pointerEvents: 'none', opacity: 0,
        transition: 'opacity .15s', zIndex: 200,
      }} className="nav-tooltip">{label}</span>
    </button>
  )
}

export default function Sidebar() {
  const { tab, setTab, logout, setBankDrawerOpen } = useStore()
  const { exportExcel, exportPDF } = useExport()

  return (
    <nav style={{
      width: 64, background: 'var(--bg-1)', borderRight: '1px solid var(--border)',
      position: 'fixed', top: 0, left: 0, bottom: 0,
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      padding: '14px 0', gap: 4, zIndex: 100,
    }}>
      <style>{`.nav-tooltip { opacity: 0 !important; } button:hover .nav-tooltip { opacity: 1 !important; }`}</style>

      {/* Logo */}
      <div style={{
        width: 40, height: 40, borderRadius: 11,
        background: 'linear-gradient(135deg,var(--green),var(--blue))',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 17, fontWeight: 800, color: '#fff', marginBottom: 14,
      }}>F</div>

      {/* Page tabs */}
      {TABS.map((t) => (
        <NavBtn key={t.id} icon={t.icon} label={t.label}
          active={tab === t.id} onClick={() => setTab(t.id)} />
      ))}

      <div style={{ flex: 1 }} />

      <NavBtn icon="👛" label="Bankalarım" active={false} onClick={() => setBankDrawerOpen(true)} />

      {/* Export buttons */}
      <NavBtn icon="📊" label="Excel İndir" active={false} onClick={exportExcel} />
      <NavBtn icon="📑" label="PDF İndir"   active={false} onClick={exportPDF}   />

      {/* Logout */}
      <NavBtn icon="⏻" label="Çıkış" active={false} onClick={logout} />
    </nav>
  )
}
