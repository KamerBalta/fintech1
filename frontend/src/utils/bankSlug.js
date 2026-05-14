const ALIASES = {
  'is-bank': 'isbank',
  'is-bankasi': 'isbank',
  'is_bankasi': 'isbank',
  'is_bank': 'isbank',
  isbankasi: 'isbank',
  isbank: 'isbank',
  'turkiye-is-bankasi': 'isbank',
  't-is-bankasi': 'isbank',
  'yapi-kredi': 'yapikredi',
  yapi_kredi: 'yapikredi',
  yapikredi: 'yapikredi',
  'ziraat-bankasi': 'ziraat',
  ziraatbankasi: 'ziraat',
  'tc-ziraat-bankasi': 'ziraat',
  'garanti-bbva': 'garanti',
  garantibbva: 'garanti',
  'ak-bank': 'akbank',
  'halk-bank': 'halkbank',
  halkbankasi: 'halkbank',
  diger: 'diger',
  legacy: 'legacy',
  all: 'all',
}

const REGISTRY = new Set([
  'ziraat',
  'isbank',
  'garanti',
  'akbank',
  'yapikredi',
  'halkbank',
  'diger',
  'legacy',
  'all',
])

export function slugifyBankLabel(text) {
  if (!text || !String(text).trim()) return 'manuel-banka'
  const map = {
    ş: 's',
    Ş: 's',
    ı: 'i',
    İ: 'i',
    ğ: 'g',
    Ğ: 'g',
    ü: 'u',
    Ü: 'u',
    ö: 'o',
    Ö: 'o',
    ç: 'c',
    Ç: 'c',
  }
  let s = String(text).trim()
  for (const [k, v] of Object.entries(map)) s = s.split(k).join(v)
  s = s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  if (!s) return 'manuel-banka'
  return s.length > 48 ? s.slice(0, 48).replace(/-$/, '') : s
}

export function normalizeBankId(raw) {
  if (raw == null || raw === '') return 'diger'
  const s0 = String(raw).trim()
  if (!s0) return 'diger'
  const low = s0.toLowerCase()
  if (ALIASES[low]) return ALIASES[low]
  const slug = slugifyBankLabel(s0)
  if (ALIASES[slug]) return ALIASES[slug]
  if (REGISTRY.has(slug)) return slug
  if (/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return slug
  return slugifyBankLabel(s0)
}

export function mergeBankPresetsWithProfiles(presets, profiles) {
  const map = {}
  for (const b of presets || []) {
    if (b?.id) map[b.id] = { ...b }
  }
  for (const p of profiles || []) {
    const bid = normalizeBankId(p?.bank_id)
    if (!bid || map[bid]) continue
    const label = (p.display_name || p.bank_display_name || bid).trim()
    map[bid] = { id: bid, name: label || bid, accent: '#64748b' }
  }
  return Object.values(map).sort((a, b) => String(a.name).localeCompare(String(b.name), 'tr'))
}
