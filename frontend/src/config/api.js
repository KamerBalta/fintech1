// ─── API Configuration ─────────────────────────────────────────────────────
// Tüm endpoint URL'leri tek yerden yönetilir.
// Ortam değişkenini (.env) veya fallback'i kullan.
const BASE = import.meta.env?.VITE_API_URL ?? 'http://localhost:8000'

export const API = {
  BASE,
  // Auth
  REGISTER:    `${BASE}/api/v1/auth/register`,
  LOGIN:       `${BASE}/api/v1/auth/login`,
  ME:          `${BASE}/api/v1/auth/me`,
  // Finance
  MARKET:      `${BASE}/api/v1/market-data`,
  UPLOAD:      `${BASE}/api/v1/upload-statement`,
  TRANSACTIONS:`${BASE}/api/v1/transactions`,
  FRAUD:       `${BASE}/api/v1/predict-fraud`,
  INSIGHTS:    `${BASE}/api/v1/user-insights`,
  CHAT:        `${BASE}/api/v1/chat`,
  // Goals & Bills
  GOALS:       `${BASE}/api/v1/goals`,
  BILLS:       `${BASE}/api/v1/bills`,
  // Analytics (new v3)
  HEALTH:      `${BASE}/api/v1/health-score`,
  ADVISORY:    `${BASE}/api/v1/advisories`,
  LIMITS:      `${BASE}/api/v1/limit-analysis`,
  SET_LIMIT:   (cat) => `${BASE}/api/v1/limits/${encodeURIComponent(cat)}`,
  // Export
  EXPORT_XL:   `${BASE}/api/v1/export/excel`,
  EXPORT_PDF:  `${BASE}/api/v1/export/pdf`,
}

export default API
