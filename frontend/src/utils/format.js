// Para formatı  →  "1.234,56"
export const fmt = (n) =>
    new Intl.NumberFormat('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n)

// Kısa format  →  "1.2K"
export const fmtK = (n) => (n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0))

// Yüzde  →  "%21.3"
export const fmtPct = (n) => `%${Number(n).toFixed(1)}`

// Tarih  →  "18 Nis 2025"
export const fmtDate = (str) => {
    try {
        return new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(str))
    } catch {
        return str
    }
}

export const CAT_COLORS = {
    'Market & Gıda': '#00d68f',
    'Ulaşım': '#3b8bff',
    'Eğlence': '#9b6dff',
    'Faturalar': '#ffb429',
    'Alışveriş': '#ff6b9d',
    'Sağlık': '#00cfe8',
    'Abonelik': '#ff9f43',
    'Yemek': '#f97316',
    'Eğitim': '#6366f1',
    'Kredi': '#ff4d6a',
    'Diğer': '#4d6b85',
}

export const BILL_ICONS = {
    İletişim: '📡', Enerji: '⚡', Abonelik: '📺',
    Kredi: '💳', Su: '💧', Sigorta: '🛡', Fatura: '📄',
}