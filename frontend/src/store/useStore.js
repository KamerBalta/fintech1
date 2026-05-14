import { create } from 'zustand'
import API from '@/config/api'
import { fetchJson } from '@/services/finaraFetch'
import { mapInsightsToHealth, mapAdvisoryTips } from '@/services/insightMappers'

const emptyLimits = { usage: {}, alerts: [], violations: 0 }

const useStore = create((set, get) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('finara_token') : null,
  user: null,

  login: async ({ email, password, full_name, isRegister }) => {
    const url = isRegister ? API.REGISTER : API.LOGIN
    const body = isRegister
      ? { email, password, full_name: full_name || email.split('@')[0] }
      : { email, password }
    const data = await fetchJson(url, { method: 'POST', body })
    localStorage.setItem('finara_token', data.access_token)
    set({ token: data.access_token, user: data.user })
    await get().bootstrap()
  },

  logout: () => {
    localStorage.removeItem('finara_token')
    set({
      token: null,
      user: null,
      tab: 'dashboard',
      insights: null,
      health: null,
      limits: null,
      advisories: [],
      transactions: [],
      goals: [],
      bills: [],
      market: [],
      uploadStep: 0,
      pdfName: null,
      uploadError: null,
      categories: {},
    })
  },

  hydrateSession: async () => {
    const { token } = get()
    if (!token) return
    try {
      if (!get().user) {
        const me = await fetchJson(API.ME)
        set({ user: me })
      }
      await get().bootstrap()
    } catch {
      get().logout()
    }
  },

  tab: 'dashboard',
  setTab: (t) => set({ tab: t }),

  market: [],
  setMarket: (rows) => set({ market: rows }),

  insights: null,
  insightsLoad: false,

  health: null,
  healthLoad: false,

  limits: null,
  limitModal: false,
  limitForm: { category: 'Market & Gıda', amount: '' },
  setLimitForm: (f) => set((s) => ({ limitForm: { ...s.limitForm, ...f } })),
  openLimitModal: () => set({ limitModal: true }),
  closeLimitModal: () => set({ limitModal: false }),

  saveLimit: async () => {
    const { limitForm } = get()
    const amt = parseFloat(limitForm.amount)
    if (!limitForm.category || !amt || amt <= 0) return
    try {
      await fetchJson(API.LIMITS, {
        method: 'POST',
        body: { category: limitForm.category, monthly_cap: amt },
      })
      const analysis = await fetchJson(API.LIMIT_ANALYSIS)
      set({
        limits: analysis,
        limitModal: false,
        limitForm: { category: 'Market & Gıda', amount: '' },
      })
    } catch (e) {
      window.alert(e.message)
    }
  },

  advisories: [],

  goals: [],
  goalModal: false,
  goalForm: { title: '', emoji: '🎯', target_amount: '', saved_amount: '0', deadline: '', category: '' },
  setGoalForm: (f) => set((s) => ({ goalForm: { ...s.goalForm, ...f } })),
  openGoalModal: () => set({ goalModal: true }),
  closeGoalModal: () => set({ goalModal: false }),

  addGoal: async () => {
    const { goalForm } = get()
    const ta = parseFloat(goalForm.target_amount) || 0
    if (!goalForm.title?.trim() || ta <= 0) return
    const sa = parseFloat(goalForm.saved_amount) || 0
    try {
      const g = await fetchJson(API.GOALS, {
        method: 'POST',
        body: {
          title: goalForm.title.trim(),
          emoji: goalForm.emoji || '🎯',
          target_amount: ta,
          saved_amount: sa,
          deadline: goalForm.deadline || null,
          category: goalForm.category || 'Genel',
        },
      })
      set((s) => ({
        goals: [g, ...s.goals],
        goalModal: false,
        goalForm: { title: '', emoji: '🎯', target_amount: '', saved_amount: '0', deadline: '', category: '' },
      }))
    } catch (e) {
      window.alert(e.message)
    }
  },

  addToGoal: async (id, amount) => {
    const g = get().goals.find((x) => String(x.id) === String(id))
    if (!g || amount <= 0) return
    const ns = g.saved_amount + amount
    try {
      const updated = await fetchJson(API.goalById(id), {
        method: 'PATCH',
        body: { saved_amount: ns },
      })
      set((s) => ({
        goals: s.goals.map((x) => (String(x.id) === String(id) ? updated : x)),
      }))
    } catch (e) {
      window.alert(e.message)
    }
  },

  bills: [],
  billModal: false,
  billForm: { name: '', amount: '', due_day: '', category: 'Fatura' },
  setBillForm: (f) => set((s) => ({ billForm: { ...s.billForm, ...f } })),
  openBillModal: () => set({ billModal: true }),
  closeBillModal: () => set({ billModal: false }),

  addBill: async () => {
    const { billForm } = get()
    const dd = parseInt(billForm.due_day, 10) || 15
    const amt = parseFloat(billForm.amount) || 0
    if (!billForm.name?.trim() || amt <= 0) return
    try {
      const b = await fetchJson(API.BILLS, {
        method: 'POST',
        body: {
          name: billForm.name.trim(),
          amount: amt,
          due_day: dd,
          category: billForm.category || 'Fatura',
        },
      })
      set((s) => ({
        bills: [...s.bills, b].sort((a, b) => (a.days_until ?? 99) - (b.days_until ?? 99)),
        billModal: false,
        billForm: { name: '', amount: '', due_day: '', category: 'Fatura' },
      }))
    } catch (e) {
      window.alert(e.message)
    }
  },

  markBillPaid: async (id) => {
    try {
      const b = await fetchJson(API.billPaid(id), { method: 'PATCH' })
      set((s) => ({
        bills: s.bills.map((x) => (String(x.id) === String(id) ? b : x)),
      }))
    } catch (e) {
      window.alert(e.message)
    }
  },

  uploadStep: 0,
  pdfName: null,
  pdfInsights: [],
  billForecast: 0,
  uploadError: null,
  transactions: [],
  categories: {},

  uploadBankPdf: async (file) => {
    if (!file?.name?.toLowerCase().endsWith('.pdf')) {
      throw new Error('Lütfen PDF dosyası seçin.')
    }
    const token = get().token
    if (!token) throw new Error('Oturum bulunamadı')
    set({ uploadError: null, uploadStep: 1, pdfName: file.name })
    await new Promise((r) => setTimeout(r, 300))
    set({ uploadStep: 2 })
    const form = new FormData()
    form.append('file', file)
    const res = await fetch(API.UPLOAD, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: form,
    })
    const raw = await res.text()
    let data = {}
    try {
      data = raw ? JSON.parse(raw) : {}
    } catch {
      data = { detail: raw }
    }
    if (!res.ok) {
      const msg = typeof data.detail === 'string' ? data.detail : 'PDF işlenemedi'
      set({ uploadStep: 0, pdfName: null, uploadError: msg })
      throw new Error(msg)
    }
    const tx = data.transactions || []
    const cats = data.category_breakdown || {}
    set({
      uploadStep: 3,
      pdfInsights: data.ai_insights || [],
      billForecast: data.bill_forecast || 0,
      uploadError: null,
      transactions: tx.length ? tx : get().transactions,
      categories: Object.keys(cats).length ? cats : get().categories,
    })
    try {
      await get().bootstrap()
    } catch {
      /* bootstrap hatası yükleme sonucunu silmez */
    }
  },

  resetUpload: () =>
    set({ uploadStep: 0, pdfName: null, uploadError: null }),

  fraudFilter: 'all',
  setFraudFilter: (f) => set({ fraudFilter: f }),

  chatOpen: false,
  chatMessages: [{ role: 'ai', text: 'Merhaba! Ben FINARA. Finansal sorularınızı yanıtlamaya hazırım. 💚' }],
  chatInput: '',
  chatLoading: false,
  toggleChat: () => set((s) => ({ chatOpen: !s.chatOpen })),
  setChatInput: (v) => set({ chatInput: v }),

  sendChat: async () => {
    const { chatInput, chatMessages, insights } = get()
    const msg = chatInput.trim()
    if (!msg) return
    set({
      chatMessages: [...chatMessages, { role: 'user', text: msg }],
      chatInput: '',
      chatLoading: true,
    })
    try {
      const ctx = insights
        ? {
            credit_score: insights.credit_score,
            total_assets: insights.total_assets,
            monthly_spending: insights.monthly_spending,
            savings_rate: insights.savings_rate,
            risk_status: insights.risk_status,
          }
        : {}
      const data = await fetchJson(API.CHAT, {
        method: 'POST',
        body: {
          message: msg,
          financial_context: ctx,
          history: chatMessages.slice(-6).map((m) => ({
            role: m.role === 'user' ? 'user' : 'assistant',
            content: m.text,
          })),
        },
      })
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: 'ai', text: data.reply || 'Yanıt alınamadı.' }],
        chatLoading: false,
      }))
    } catch (e) {
      set((s) => ({
        chatMessages: [...s.chatMessages, { role: 'ai', text: `Hata: ${e.message}` }],
        chatLoading: false,
      }))
    }
  },

  bootstrap: async () => {
    const token = get().token
    if (!token) return
    set({ insightsLoad: true, healthLoad: true })
    try {
      const [market, insights, limitsSummary, goals, bills, tx] = await Promise.all([
        fetchJson(API.MARKET),
        fetchJson(API.INSIGHTS),
        fetchJson(API.LIMIT_ANALYSIS).catch(() => emptyLimits),
        fetchJson(API.GOALS).catch(() => []),
        fetchJson(API.BILLS).catch(() => []),
        fetchJson(API.TRANSACTIONS).catch(() => []),
      ])
      set({
        market: market.rates || [],
        insights,
        limits: limitsSummary,
        goals: Array.isArray(goals) ? goals : [],
        bills: Array.isArray(bills) ? bills : [],
        transactions: Array.isArray(tx) ? tx : [],
        advisories: mapAdvisoryTips(insights),
        health: mapInsightsToHealth(insights),
        insightsLoad: false,
        healthLoad: false,
      })
    } catch (e) {
      set({ insightsLoad: false, healthLoad: false })
      throw e
    }
  },
}))

export default useStore
