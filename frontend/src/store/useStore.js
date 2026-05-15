import { create } from 'zustand'
import toast from 'react-hot-toast'
import API from '@/config/api'
import { fetchJson } from '@/services/finaraFetch'
import { mapInsightsToHealth, mapAdvisoryTips } from '@/services/insightMappers'
import { mergeBankPresetsWithProfiles, normalizeBankId } from '@/utils/bankSlug'

const emptyLimits = { usage: {}, alerts: [], violations: 0 }

function categoriesFromTransactions(tx) {
  const out = {}
  for (const t of tx || []) {
    const c = t.category || 'Diğer'
    const a = Number(t.amount) || 0
    out[c] = Math.round(((out[c] || 0) + a) * 100) / 100
  }
  return out
}

const useStore = create((set, get) => ({
  token: typeof localStorage !== 'undefined' ? localStorage.getItem('finara_token') : null,
  user: null,

  toasts: [],
  notify: (message, variant = 'success') => {
    const id = `${Date.now()}-${Math.random()}`
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }))
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
    }, 4200)
  },
  removeToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  login: async ({ email, password, full_name, isRegister }) => {
    const url = isRegister ? API.REGISTER : API.LOGIN
    const body = isRegister
      ? { email, password, full_name: full_name || email.split('@')[0] }
      : { email, password }
    const data = await fetchJson(url, { method: 'POST', body })
    localStorage.setItem('finara_token', data.access_token)
    set({ token: data.access_token, user: data.user })
    await get().bootstrap()
    get().notify(isRegister ? 'Hesap oluşturuldu.' : 'Giriş başarılı.', 'success')
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
      selectedBankId: null,
      bankDrawerOpen: false,
      bankPresets: [],
      subscriptions: [],
      subscriptionMonthlyTotal: 0,
      uploadStep: 0,
      pdfName: null,
      uploadError: null,
      categories: {},
      lastPdfUploadStats: null,
      pdfInsights: [],
      billForecast: 0,
    })
    if (typeof document !== 'undefined') {
      document.documentElement.style.removeProperty('--bank-accent')
      document.documentElement.style.removeProperty('--bank-accent-soft')
      document.body.classList.remove('bank-theme-active')
    }
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

  selectedBankId: null,
  bankDrawerOpen: false,
  bankPresets: [],
  setBankDrawerOpen: (open) => set({ bankDrawerOpen: open }),
  setSelectedBank: (id) => {
    const presets = get().bankPresets || []
    const nid = id == null || id === '' ? null : normalizeBankId(id)
    if (typeof document !== 'undefined') {
      const root = document.documentElement
      if (!nid) {
        root.style.removeProperty('--bank-accent')
        root.style.removeProperty('--bank-accent-soft')
        document.body.classList.remove('bank-theme-active')
      } else {
        const b = presets.find((x) => x.id === nid)
        const accent = b?.accent || '#2dd4a3'
        root.style.setProperty('--bank-accent', accent)
        root.style.setProperty('--bank-accent-soft', `${accent}40`)
        document.body.classList.add('bank-theme-active')
      }
    }
    set({ selectedBankId: nid, bankDrawerOpen: false })
    void get().bootstrap()
  },

  patchBankProfiles: async (profiles) => {
    const u = await fetchJson(API.PATCH_BANK_PROFILES, {
      method: 'PATCH',
      body: { bank_profiles: profiles },
    })
    set({ user: u })
    void get().bootstrap()
    get().notify('Banka ayarları güncellendi.', 'success')
  },

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
    const raw = String(limitForm.amount ?? '').trim().replace(/\s/g, '').replace(',', '.')
    const amt = parseFloat(raw)
    if (!limitForm.category || !Number.isFinite(amt) || amt <= 0) {
      get().notify('Geçerli bir kategori ve pozitif limit tutarı girin.', 'error')
      return
    }
    try {
      await fetchJson(API.LIMITS, {
        method: 'POST',
        body: {
          category: limitForm.category,
          monthly_cap: amt,
          bank_id: get().selectedBankId || 'all',
        },
      })
      const bid = get().selectedBankId
      const laUrl = bid ? `${API.LIMIT_ANALYSIS}?bank_id=${encodeURIComponent(bid)}` : API.LIMIT_ANALYSIS
      const analysis = await fetchJson(laUrl)
      set({
        limits: analysis,
        limitModal: false,
        limitForm: { category: limitForm.category, amount: '' },
      })
      get().notify('Limit kaydedildi.', 'success')
    } catch (e) {
      get().notify(e.message || 'Limit kaydedilemedi.', 'error')
    }
  },

  saveManualTotalAssets: async (inputValue, { clear } = { clear: false }) => {
    try {
      let manual = null
      if (!clear) {
        const raw = String(inputValue ?? '').trim().replace(/\s/g, '').replace(',', '.')
        if (raw === '') {
          get().notify('Tutar boş bırakılamaz. Otomatiğe dönmek için sıfırla kullanın.', 'error')
          return
        }
        manual = parseFloat(raw)
        if (!Number.isFinite(manual) || manual < 0) {
          get().notify('Geçerli bir varlık tutarı girin (≥ 0).', 'error')
          return
        }
      }
      const insights = await fetchJson(API.MANUAL_TOTAL_ASSETS, {
        method: 'PATCH',
        body: { manual_total_assets: clear ? null : manual },
      })
      set({
        insights,
        advisories: mapAdvisoryTips(insights),
        health: mapInsightsToHealth(insights),
      })
      get().notify(clear ? 'Otomatik varlık hesabına dönüldü.' : 'Toplam varlık kaydedildi.', 'success')
    } catch (e) {
      get().notify(e.message || 'Varlık güncellenemedi.', 'error')
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
    const ta = parseFloat(String(goalForm.target_amount ?? '').replace(',', '.')) || 0
    if (!goalForm.title?.trim() || ta <= 0) {
      get().notify('Başlık ve pozitif hedef tutarı zorunludur.', 'error')
      return
    }
    const sa = parseFloat(String(goalForm.saved_amount ?? '0').replace(',', '.')) || 0
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
      get().notify('Hedef oluşturuldu.', 'success')
    } catch (e) {
      get().notify(e.message || 'Hedef kaydedilemedi.', 'error')
    }
  },

  deleteGoal: async (id) => {
    try {
      await fetchJson(API.goalById(id), { method: 'DELETE' })
      set((s) => ({ goals: s.goals.filter((x) => String(x.id) !== String(id)) }))
      get().notify('Hedef silindi.', 'success')
    } catch (e) {
      get().notify(e.message || 'Hedef silinemedi.', 'error')
    }
  },

  addToGoal: async (id, amount) => {
    const g = get().goals.find((x) => String(x.id) === String(id))
    if (!g || amount <= 0) {
      get().notify('Geçerli bir tutar girin.', 'error')
      return
    }
    const ns = g.saved_amount + amount
    try {
      const updated = await fetchJson(API.goalById(id), {
        method: 'PATCH',
        body: { saved_amount: ns },
      })
      set((s) => ({
        goals: s.goals.map((x) => (String(x.id) === String(id) ? updated : x)),
      }))
      get().notify('Birikim güncellendi.', 'success')
    } catch (e) {
      get().notify(e.message || 'Güncelleme başarısız.', 'error')
    }
  },

  bills: [],
  subscriptions: [],
  subscriptionMonthlyTotal: 0,
  billModal: false,
  billForm: { name: '', amount: '', due_day: '', category: 'Fatura' },
  setBillForm: (f) => set((s) => ({ billForm: { ...s.billForm, ...f } })),
  openBillModal: () => set({ billModal: true }),
  closeBillModal: () => set({ billModal: false }),

  addBill: async () => {
    const { billForm } = get()
    const dd = parseInt(billForm.due_day, 10) || 15
    const amt = parseFloat(billForm.amount) || 0
    if (!billForm.name?.trim() || amt <= 0) {
      get().notify('Fatura adı ve pozitif tutar zorunludur.', 'error')
      return
    }
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
      get().notify('Fatura eklendi.', 'success')
    } catch (e) {
      get().notify(e.message || 'Fatura eklenemedi.', 'error')
    }
  },

  markBillPaid: async (id) => {
    try {
      const b = await fetchJson(API.billPaid(id), { method: 'PATCH' })
      set((s) => ({
        bills: s.bills.map((x) => (String(x.id) === String(id) ? b : x)),
      }))
      get().notify('Ödeme kaydedildi.', 'success')
    } catch (e) {
      get().notify(e.message || 'İşlem başarısız.', 'error')
    }
  },

  fetchSubscriptions: async () => {
    const bid = get().selectedBankId
    const url = bid ? `${API.SUBSCRIPTIONS}?bank_id=${encodeURIComponent(bid)}` : API.SUBSCRIPTIONS
    const subs = await fetchJson(url)
    set({
      subscriptions: Array.isArray(subs?.items) ? subs.items : [],
      subscriptionMonthlyTotal: Number(subs?.monthly_total_try) || 0,
    })
    return subs
  },

  removeSubscription: async (id) => {
    await fetchJson(API.subscriptionById(id), { method: 'DELETE' })
    set((s) => {
      const next = s.subscriptions.filter((x) => String(x.id) !== String(id))
      return {
        subscriptions: next,
        subscriptionMonthlyTotal: next.reduce((a, x) => a + (Number(x.monthly_estimate_try) || 0), 0),
      }
    })
    get().notify('Abonelik başarıyla kaldırıldı.', 'success')
  },

  uploadStep: 0,
  pdfName: null,
  pdfInsights: [],
  billForecast: 0,
  uploadError: null,
  transactions: [],
  categories: {},
  lastPdfUploadStats: null,

  uploadBankPdf: async (file, opts = {}) => {
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
    const url = opts.forceOverwrite ? `${API.UPLOAD}?force_overwrite=true` : API.UPLOAD
    const res = await fetch(url, {
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
    if (res.status === 409) {
      const d = data.detail
      const human =
        typeof d === 'object' && d && typeof d.message === 'string'
          ? d.message
          : 'Bu ekstre içeriği daha önce yüklendi.'
      get().notify(human, 'warning')
      set({ uploadStep: 0, pdfName: file.name, uploadError: null })
      const ok =
        typeof window !== 'undefined' &&
        window.confirm('Bu ekstre zaten yüklü. Üzerine yazmak istiyor musunuz?')
      if (ok) {
        return get().uploadBankPdf(file, { forceOverwrite: true })
      }
      set({ pdfName: null })
      throw new Error('Yükleme iptal edildi.')
    }
    if (!res.ok) {
      const d = data.detail
      const msg =
        typeof d === 'string'
          ? d
          : typeof d === 'object' && d && typeof d.message === 'string'
            ? d.message
            : 'PDF işlenemedi'
      set({ uploadStep: 0, pdfName: null, uploadError: msg })
      throw new Error(msg)
    }
    const tx = data.transactions || []
    set({
      uploadStep: 4,
      pdfInsights: data.ai_insights || [],
      billForecast: data.bill_forecast || 0,
      uploadError: null,
      lastPdfUploadStats: {
        inserted: data.transaction_count ?? 0,
        skipped: data.skipped_duplicates ?? 0,
      },
    })
    try {
      await get().bootstrap()
    } catch (e) {
      get().notify(e.message || 'Özet yenilenemedi; Dashboard kısmen güncel olabilir.', 'error')
      const cur = get().transactions || []
      const byId = new Map(cur.map((x) => [String(x.id), x]))
      for (const t of tx) {
        byId.set(String(t.id), t)
      }
      const merged = [...byId.values()].sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      set({
        transactions: merged,
        categories: categoriesFromTransactions(merged),
      })
    }
    const inserted = data.transaction_count ?? 0
    const sk = data.skipped_duplicates ?? 0
    const bname = data.bank_display_name || data.bank_id || 'Banka'
    toast.success(`${bname} ekstresi başarıyla işlendi.`)
    get().notify(
      sk > 0
        ? `PDF tamamlandı: ${inserted} yeni işlem, ${sk} mükerrer atlandı. Dashboard güncellendi.`
        : `PDF tamamlandı: ${inserted} işlem kaydedildi. Dashboard güncellendi.`,
      'success',
    )
  },

  resetUpload: () =>
    set({
      uploadStep: 0,
      pdfName: null,
      uploadError: null,
      lastPdfUploadStats: null,
      pdfInsights: [],
      billForecast: 0,
    }),

  fraudFilter: 'all',
  setFraudFilter: (f) => set({ fraudFilter: f }),

  chatOpen: false,
  chatMessages: [
    {
      role: 'ai',
      text: 'Merhaba, ben FINARA AI Finansal Asistanın. PDF ekstrelerinden gelen işlemlerine, limitlerine ve hedeflerine göre sorularını yanıtlayabilirim. Nasıl yardımcı olayım?',
    },
  ],
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
      const bid = get().selectedBankId
      const data = await fetchJson(API.CHAT, {
        method: 'POST',
        body: {
          message: msg,
          financial_context: ctx,
          bank_id: bid && bid !== 'all' ? bid : undefined,
          history: chatMessages.slice(-12).map((m) => ({
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
      let presetsRaw = []
      try {
        presetsRaw = await fetchJson(API.BANKS)
      } catch {
        presetsRaw = []
      }
      const base = Array.isArray(presetsRaw) ? presetsRaw : []
      const mergedPresets = mergeBankPresetsWithProfiles(base, get().user?.bank_profiles)
      set({ bankPresets: mergedPresets })
      const bid = get().selectedBankId
      const insUrl = bid ? `${API.INSIGHTS}?bank_id=${encodeURIComponent(bid)}` : API.INSIGHTS
      const laUrl = bid ? `${API.LIMIT_ANALYSIS}?bank_id=${encodeURIComponent(bid)}` : API.LIMIT_ANALYSIS
      const txUrl = bid ? `${API.TRANSACTIONS}?limit=1200&bank_id=${encodeURIComponent(bid)}` : `${API.TRANSACTIONS}?limit=1200`
      const subsUrl = bid ? `${API.SUBSCRIPTIONS}?bank_id=${encodeURIComponent(bid)}` : API.SUBSCRIPTIONS
      const [market, insights, limitsSummary, goals, bills, tx, subs] = await Promise.all([
        fetchJson(API.MARKET),
        fetchJson(insUrl),
        fetchJson(laUrl).catch(() => emptyLimits),
        fetchJson(API.GOALS).catch(() => []),
        fetchJson(API.BILLS).catch(() => []),
        fetchJson(txUrl).catch(() => []),
        fetchJson(subsUrl).catch(() => ({ items: [], monthly_total_try: 0 })),
      ])
      set({
        market: market.rates || [],
        insights,
        limits: limitsSummary,
        goals: Array.isArray(goals) ? goals : [],
        bills: Array.isArray(bills) ? bills : [],
        transactions: Array.isArray(tx) ? tx : [],
        categories: categoriesFromTransactions(Array.isArray(tx) ? tx : []),
        advisories: mapAdvisoryTips(insights),
        health: mapInsightsToHealth(insights),
        subscriptions: Array.isArray(subs?.items) ? subs.items : [],
        subscriptionMonthlyTotal: Number(subs?.monthly_total_try) || 0,
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
