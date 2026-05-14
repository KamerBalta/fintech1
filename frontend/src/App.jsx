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
                backgroundColor: '#0f172a',
                color: '#ffffff',
            }}
        >
            {/* Sidebar */}
            <Sidebar />

            {/* Main Content */}
            <div
                style={{
                    marginLeft: 64,
                    flex: 1,
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
                    style={{
                        flex: 1,
                        padding: '22px 28px',
                        animation: 'fadeIn 0.25s ease',
                    }}
                >
                    <ActivePage />
                </main>
            </div>

            {/* Floating AI Chat */}
            <ChatWidget />
        </div>
    )
}