// ─── API Configuration ─────────────────────────────────────────────────────
const BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:8000'

export const API = {
  BASE,
  REGISTER: `${BASE}/api/v1/auth/register`,
  LOGIN: `${BASE}/api/v1/auth/login`,
  ME: `${BASE}/api/v1/auth/me`,
  PATCH_BANK_PROFILES: `${BASE}/api/v1/auth/me/bank-profiles`,
  MARKET: `${BASE}/api/v1/finance/market-data`,
  BANKS: `${BASE}/api/v1/finance/banks`,
  SUBSCRIPTIONS: `${BASE}/api/v1/finance/subscriptions`,
  UPLOAD: `${BASE}/api/v1/upload-statement`,
  TRANSACTIONS: `${BASE}/api/v1/finance/transactions`,
  FRAUD: `${BASE}/api/v1/finance/predict-fraud`,
  INSIGHTS: `${BASE}/api/v1/finance/user-insights`,
  MANUAL_TOTAL_ASSETS: `${BASE}/api/v1/finance/manual-total-assets`,
  CHAT: `${BASE}/api/v1/finance/chat`,
  GOALS: `${BASE}/api/v1/goals/`,
  BILLS: `${BASE}/api/v1/bills/`,
  LIMITS: `${BASE}/api/v1/limits/`,
  LIMIT_ANALYSIS: `${BASE}/api/v1/limits/analysis`,
  goalById: (id) => `${BASE}/api/v1/goals/${id}`,
  billPaid: (id) => `${BASE}/api/v1/bills/${id}/paid`,
  limitById: (id) => `${BASE}/api/v1/limits/${id}`,
  EXPORT_XL: `${BASE}/api/v1/export/excel`,
  EXPORT_PDF: `${BASE}/api/v1/export/pdf`,
}

export default API
