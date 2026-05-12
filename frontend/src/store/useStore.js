import { create } from 'zustand'
import {
    MOCK_MARKET, MOCK_INSIGHTS, MOCK_HEALTH, MOCK_LIMITS,
    MOCK_ADVISORIES, MOCK_GOALS, MOCK_BILLS, MOCK_TRANSACTIONS,
    MOCK_CATEGORIES, MOCK_CHAT_REPLIES,
} from '@/services/mockData'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const useStore = create((set, get) => ({
    // ── Auth ──────────────────────────────────────────────────────────────────
    token: null,
    user: null,

    login: async ({ email, password, full_name, isRegister }) => {
        await sleep(700)
        const name = full_name || email.split('@')[0] || 'Kullanıcı'
        const fakeToken = 'demo-jwt-' + Date.now()
        localStorage.setItem('finara_token', fakeToken)
        set({ token: fakeToken, user: { full_name: name, email } })
        get().bootstrap()
    },

    logout: () => {
        localStorage.removeItem('finara_token')
        set({
            token: null, user: null, tab: 'dashboard',
            insights: null, health: null, limits: null, advisories: [],
            transactions: [], goals: [...MOCK_GOALS], bills: [...MOCK_BILLS],
            market: [], uploadStep: 0,
        })
    },

    // ── Navigation ────────────────────────────────────────────────────────────
    tab: 'dashboard',
    setTab: (t) => set({ tab: t }),

    // ── Market ────────────────────────────────────────────────────────────────
    market: [],

    // ── Insights ──────────────────────────────────────────────────────────────
    insights: null,
    insightsLoad: false,

    // ── Health ────────────────────────────────────────────────────────────────
    health: null,
    healthLoad: false,

    // ── Limits ────────────────────────────────────────────────────────────────
    limits: null,
    limitModal: false,
    limitForm: { category: 'Market & Gıda', amount: '' },

    setLimitForm: (f) => set((s) => ({ limitForm: { ...s.limitForm, ...f } })),
    openLimitModal: () => set({ limitModal: true }),
    closeLimitModal: () => set({ limitModal: false }),

    saveLimit: () => {
        const { limitForm, limits } = get()
        const { category, amount } = limitForm
        if (!category || !amount) return
        const amt = parseFloat(amount)
        const prev = limits?.usage?.[category] || { spent: 0 }
        const pct = (prev.spent / amt) * 100
        set((s) => ({
            limits: {
                ...s.limits,
                usage: {
                    ...s.limits?.usage,
                    [category]: {
                        ...prev, limit: amt, pct: Math.round(pct * 10) / 10,
                        status: pct >= 100 ? 'critical' : pct >= 80 ? 'warning' : 'ok',
                    },
                },
            },
            limitModal: false,
            limitForm: { category: 'Market & Gıda', amount: '' },
        }))
    },

    // ── Advisories ────────────────────────────────────────────────────────────
    advisories: [],

    // ── Goals ─────────────────────────────────────────────────────────────────
    goals: [...MOCK_GOALS],
    goalModal: false,
    goalForm: { title: '', emoji: '🎯', target_amount: '', saved_amount: '0', deadline: '', category: '' },

    setGoalForm: (f) => set((s) => ({ goalForm: { ...s.goalForm, ...f } })),
    openGoalModal: () => set({ goalModal: true }),
    closeGoalModal: () => set({ goalModal: false }),

    addGoal: () => {
        const { goalForm, goals } = get()
        const ta = parseFloat(goalForm.target_amount) || 0
        const sa = parseFloat(goalForm.saved_amount) || 0
        const pct = Math.min(100, Math.round((sa / ta) * 1000) / 10)
        let days = null
        if (goalForm.deadline) {
            days = Math.max(0, Math.round((new Date(goalForm.deadline) - new Date()) / 86400000))
        }
        set({
            goals: [...goals, {
                id: Date.now(), title: goalForm.title, emoji: goalForm.emoji || '🎯',
                target_amount: ta, saved_amount: sa, deadline: goalForm.deadline || null,
                category: goalForm.category || 'Genel', progress_pct: pct, days_remaining: days,
            }],
            goalModal: false,
            goalForm: { title: '', emoji: '🎯', target_amount: '', saved_amount: '0', deadline: '', category: '' },
        })
    },

    addToGoal: (id, amount) => {
        set((s) => ({
            goals: s.goals.map((g) => {
                if (g.id !== id) return g
                const ns = g.saved_amount + amount
                const pct = Math.min(100, Math.round((ns / g.target_amount) * 1000) / 10)
                return { ...g, saved_amount: ns, progress_pct: pct }
            }),
        }))
    },

    // ── Bills ─────────────────────────────────────────────────────────────────
    bills: [...MOCK_BILLS],
    billModal: false,
    billForm: { name: '', amount: '', due_day: '', category: 'Fatura' },

    setBillForm: (f) => set((s) => ({ billForm: { ...s.billForm, ...f } })),
    openBillModal: () => set({ billModal: true }),
    closeBillModal: () => set({ billModal: false }),

    addBill: () => {
        const { billForm, bills } = get()
        const dd = parseInt(billForm.due_day) || 15
        const today = new Date()
        let due = new Date(today.getFullYear(), today.getMonth(), dd)
        if (due < today) due = new Date(today.getFullYear(), today.getMonth() + 1, dd)
        const du = Math.round((due - today) / 86400000)
        set({
            bills: [...bills, {
                id: Date.now(), name: billForm.name, amount: parseFloat(billForm.amount) || 0,
                due_day: dd, category: billForm.category || 'Fatura', days_until: du,
            }].sort((a, b) => a.days_until - b.days_until),
            billModal: false,
            billForm: { name: '', amount: '', due_day: '', category: 'Fatura' },
        })
    },

    markBillPaid: (id) => {
        set((s) => ({
            bills: s.bills.map((b) => b.id === id ? { ...b, days_until: b.days_until + 30 } : b),
        }))
    },

    // ── PDF Upload ────────────────────────────────────────────────────────────
    uploadStep: 0,
    pdfName: null,
    pdfInsights: [],
    billForecast: 0,
    transactions: [...MOCK_TRANSACTIONS],
    categories: { ...MOCK_CATEGORIES },

    loadDemoData: async () => {
        set({ uploadStep: 1, pdfName: 'banka-ekstresi.pdf' })
        await sleep(900)
        set({ uploadStep: 2 })
        await sleep(1100)
        set({
            uploadStep: 3,
            transactions: MOCK_TRANSACTIONS,
            categories: MOCK_CATEGORIES,
            billForecast: 2140,
            pdfInsights: [
                'Faturalar kategorisinde 5 tekrarlayan işlem tespit edildi. Aylık yük: 2.140 ₺.',
                'Netflix + Spotify + Amazon = 334 ₺/ay. İhtiyaç değerlendirmesi öneririz.',
                'Trendyol\'da tek seferlik 1.240 ₺ harcama — bu ayın ortalamasının 2 katı.',
                '3 şüpheli işlem tespit edildi. Acil inceleme gerekiyor.',
            ],
        })
    },

    resetUpload: () => set({ uploadStep: 0, pdfName: null }),

    // ── Fraud filter ──────────────────────────────────────────────────────────
    fraudFilter: 'all',
    setFraudFilter: (f) => set({ fraudFilter: f }),

    // ── Chat ──────────────────────────────────────────────────────────────────
    chatOpen: false,
    chatMessages: [{ role: 'ai', text: 'Merhaba! Ben FINARA. Finansal sorularınızı yanıtlamaya hazırım. 💚' }],
    chatInput: '',
    chatLoading: false,

    toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
    setChatInput: (v) => set({ chatInput: v }),

    sendChat: async () => {
        const { chatInput, chatMessages } = get()
        const msg = chatInput.trim()
        if (!msg) return
        set({ chatMessages: [...chatMessages, { role: 'user', text: msg }], chatInput: '', chatLoading: true })
        await sleep(600 + Math.random() * 500)
        const reply = MOCK_CHAT_REPLIES[Math.floor(Math.random() * MOCK_CHAT_REPLIES.length)]
        set((s) => ({ chatMessages: [...s.chatMessages, { role: 'ai', text: reply }], chatLoading: false }))
    },

    // ── Bootstrap (after login) ───────────────────────────────────────────────
    bootstrap: async () => {
        await sleep(300)
        set({ market: MOCK_MARKET })
        await sleep(500)
        set({ insights: MOCK_INSIGHTS, insightsLoad: false })
        set({ health: MOCK_HEALTH, healthLoad: false })
        set({ limits: MOCK_LIMITS })
        set({ advisories: MOCK_ADVISORIES })
    },
}))

export default useStore