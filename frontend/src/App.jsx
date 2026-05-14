import React, { useEffect } from 'react'
import useStore from '@/store/useStore'

// ─────────────────────────────────────────────────────────────
// Layout Components
// ─────────────────────────────────────────────────────────────
import Sidebar from '@/components/layout/Sidebar'
import MarketTicker from '@/components/layout/MarketTicker'

// ─────────────────────────────────────────────────────────────
// Dashboard Components
// ─────────────────────────────────────────────────────────────
import ChatWidget from '@/components/dashboard/ChatWidget'
import BankDrawer from '@/components/layout/BankDrawer'
import Toaster from '@/components/ui/Toaster'
import { Toaster as HotToaster } from 'react-hot-toast'

// ─────────────────────────────────────────────────────────────
// Pages
// ─────────────────────────────────────────────────────────────
import AuthPage from '@/pages/AuthPage'
import DashboardPage from '@/pages/DashboardPage'
import HealthPage from '@/pages/HealthPage'
import AdvisoryPage from '@/pages/AdvisoryPage'
import PDFPage from '@/pages/PDFPage'
import FraudPage from '@/pages/FraudPage'
import LimitsPage from '@/pages/LimitsPage'
import GoalsPage from '@/pages/GoalsPage'
import BillsPage from '@/pages/BillsPage'

// ─────────────────────────────────────────────────────────────
// Page Map
// sidebar tab → component
// ─────────────────────────────────────────────────────────────
const PAGE_MAP = {
    dashboard: DashboardPage,
    health: HealthPage,
    advisory: AdvisoryPage,
    pdf: PDFPage,
    fraud: FraudPage,
    limits: LimitsPage,
    goals: GoalsPage,
    bills: BillsPage,
}

export default function App() {
    const token = useStore((state) => state.token)
    const tab = useStore((state) => state.tab)

    useEffect(() => {
        if (token) {
            void useStore.getState().hydrateSession()
        }
    }, [token])

    // kullanıcı giriş yapmadıysa
    if (!token) {
        return <AuthPage />
    }

    // aktif page
    const ActivePage = PAGE_MAP[tab] || DashboardPage

    return (
        <div
            style={{
                display: 'flex',
                minHeight: '100vh',
                backgroundColor: 'var(--bg-0)',
                color: 'var(--t1)',
            }}
        >
            {/* Sidebar */}
            <Sidebar />

            <BankDrawer />

            {/* Main Content */}
            <div
                style={{
                    marginLeft: 64,
                    flex: 1,
                    minWidth: 0,
                    display: 'flex',
                    flexDirection: 'column',
                    minHeight: '100vh',
                }}
            >
                {/* Market ticker */}
                <MarketTicker />

                {/* Dynamic Page */}
                <main
                    key={tab}
                    className="flex-1 min-w-0 overflow-x-hidden py-5"
                    style={{
                        animation: 'fadeIn 0.35s ease',
                    }}
                >
                    <div className="mx-auto w-full min-w-0 max-w-7xl">
                        <ActivePage />
                    </div>
                </main>
            </div>

            {/* Floating AI Chat */}
            <ChatWidget />
            <Toaster />
            <HotToaster
                position="top-center"
                toastOptions={{
                    duration: 4200,
                    style: {
                        background: '#0f172a',
                        color: '#e2e8f0',
                        border: '1px solid #334155',
                        fontSize: '13px',
                    },
                }}
            />
        </div>
    )
}