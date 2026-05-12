// src/services/mockData.js
// Backend bağlantısı yokken kullanılan demo verileri

export const MOCK_MARKET = [
    { symbol: 'USD/TRY', rate: 32.45, change_pct: 0.32 },
    { symbol: 'EUR/TRY', rate: 35.18, change_pct: -0.14 },
    { symbol: 'EUR/USD', rate: 1.085, change_pct: -0.22 },
    { symbol: 'XAU/USD', rate: 2048.30, change_pct: 0.51 },
    { symbol: 'XAU/TRY', rate: 66567, change_pct: 0.83 },
    { symbol: 'BTC/USD', rate: 67420, change_pct: 1.24 },
]

export const MOCK_INSIGHTS = {
    credit_score: 724, score_label: 'Çok İyi',
    total_assets: 87450, monthly_income: 14200,
    monthly_spending: 6830, savings_rate: 21.3,
    risk_status: 'Düşük', active_alerts: 1,
    radar_data: { 'Ödeme Düzeni': 89, 'Kredi Kullanımı': 76, 'Hesap Yaşı': 68, 'Hesap Çeşitliliği': 82, 'Yeni Kredi': 91 },
    spending_forecast: [
        { month: 'Mar', predicted: 6200, actual: 6480 },
        { month: 'Nis', predicted: 6500, actual: 6210 },
        { month: 'May', predicted: 6700, actual: 6830 },
        { month: 'Haz', predicted: 7100, actual: null },
        { month: 'Tem', predicted: 7400, actual: null },
        { month: 'Ağu', predicted: 7200, actual: null },
    ],
}

export const MOCK_HEALTH = {
    score: 74, level: 'Gelişmiş',
    breakdown: {
        savings: { points: 21, max: 25, value: '%21.3' },
        budget: { points: 19, max: 25, violations: 1 },
        fraud: { points: 20, max: 20, count: 0 },
        bills: { points: 15, max: 15, on_time: true },
        goals: { points: 12, max: 15 },
    },
    badges: [
        { id: 'fraud_shield', title: 'Güvenlik Kalkanı', emoji: '🔒', description: 'Sıfır fraud aktivitesi.', color: '#9b6dff' },
        { id: 'bill_master', title: 'Fatura Ustası', emoji: '✅', description: 'Tüm faturalar zamanında.', color: '#00cfe8' },
        { id: 'consistent_saver', title: 'Tutarlı Biriktiren', emoji: '📈', description: '3 ay %20+ tasarruf.', color: '#ffb429' },
        { id: 'first_goal', title: 'İlk Adım', emoji: '🌱', description: 'İlk hedef oluşturuldu.', color: '#00d68f' },
        { id: 'goal_achiever', title: 'Hedef Avcısı', emoji: '🎯', description: '%75+ ilerleme var.', color: '#ff6b9d' },
    ],
}

export const MOCK_LIMITS = {
    usage: {
        'Market & Gıda': { spent: 2840, limit: 3000, pct: 94.7, status: 'warning' },
        'Eğlence': { spent: 620, limit: 500, pct: 124, status: 'critical' },
        'Alışveriş': { spent: 1240, limit: 2000, pct: 62, status: 'ok' },
        'Yemek': { spent: 580, limit: 800, pct: 72.5, status: 'ok' },
        'Ulaşım': { spent: 1450, limit: 1500, pct: 96.7, status: 'warning' },
    },
    alerts: [
        { type: 'critical', category: 'Eğlence', message: '🚨 Eğlence limiti aşıldı! 620 ₺ / 500 ₺ (%124)', pct: 124 },
        { type: 'warning', category: 'Market & Gıda', message: '⚠️ Market & Gıda limitine yaklaşıyorsunuz. %94.7 kullanıldı.', pct: 94.7 },
        { type: 'warning', category: 'Ulaşım', message: '⚠️ Ulaşım limitine yaklaşıyorsunuz. %96.7 kullanıldı.', pct: 96.7 },
    ],
    violations: 1,
}

export const MOCK_ADVISORIES = [
    {
        type: 'opportunity', icon: '💰', priority: 1, title: 'Döviz Alım Fırsatı',
        message: 'USD/TRY şu an 30 günlük ortalamanın %2.1 altında. Laptop hedefindeki ürün için uygun alım zamanı olabilir.',
        action_label: 'Hedefi İncele', action_type: 'view_goal'
    },
    {
        type: 'alert', icon: '🚨', priority: 0, title: 'Kritik Harcama Uyarısı',
        message: 'Eğlence kategorisinde belirlediğiniz limiti aştınız. Hedeflerinize ulaşmak için harcamalarınızı gözden geçirin.',
        action_label: 'Limitleri Gör', action_type: 'view_limits'
    },
    {
        type: 'investment', icon: '🥇', priority: 2, title: 'Altın ile Enflasyon Koruması',
        message: 'Tasarruf oranınız %21 – mükemmel! Birikimlerinizin bir bölümünü altına yönlendirerek enflasyona karşı koruyabilirsiniz.',
        action_label: 'Daha Fazla Bilgi', action_type: 'info'
    },
    {
        type: 'goal', icon: '🎯', priority: 1, title: 'Japonya Tatili Yaklaşıyor',
        message: '117 gün kaldı. Hedefe ulaşmak için aylık 14.500 ₺ ek tasarruf gerekiyor.',
        action_label: 'Hedefi Güncelle', action_type: 'update_goal'
    },
    {
        type: 'tip', icon: '💳', priority: 3, title: 'Kredi Skorunu Koruma',
        message: 'Skorunuz 724. 750+ için kart limitinizin %25 altında kullanım sağlayın.',
        action_label: 'Detayları Gör', action_type: 'view_credit'
    },
]

export const MOCK_GOALS = [
    { id: 1, title: 'Ev Almak', emoji: '🏠', target_amount: 500000, saved_amount: 87000, deadline: '2027-12-31', category: 'Gayrimenkul', progress_pct: 17.4, days_remaining: 972 },
    { id: 2, title: 'Japonya Tatili', emoji: '✈️', target_amount: 45000, saved_amount: 28000, deadline: '2025-09-01', category: 'Tatil', progress_pct: 62.2, days_remaining: 117 },
    { id: 3, title: 'Acil Fon', emoji: '🛡️', target_amount: 60000, saved_amount: 41000, deadline: null, category: 'Güvenlik', progress_pct: 68.3, days_remaining: null },
    { id: 4, title: 'Laptop Yükseltme', emoji: '💻', target_amount: 35000, saved_amount: 12000, deadline: '2025-07-01', category: 'Teknoloji', progress_pct: 34.3, days_remaining: 54 },
]

export const MOCK_BILLS = [
    { id: 1, name: 'Türk Telekom', amount: 249, due_day: 5, category: 'İletişim', days_until: 3 },
    { id: 2, name: 'EnerjiSA Elektrik', amount: 680, due_day: 12, category: 'Enerji', days_until: 10 },
    { id: 3, name: 'Netflix', amount: 139.9, due_day: 18, category: 'Abonelik', days_until: 16 },
    { id: 4, name: 'Kredi Kartı', amount: 2400, due_day: 22, category: 'Kredi', days_until: 20 },
    { id: 5, name: 'IGDAŞ', amount: 420, due_day: 28, category: 'Enerji', days_until: 26 },
]

export const MOCK_TRANSACTIONS = [
    { id: 1, date: '2025-04-18', description: 'Migros Market', amount: 342.5, category: 'Market & Gıda', is_recurring: false, is_fraud: false, risk_score: 8.2, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 2, date: '2025-04-17', description: 'Türk Telekom Fatura', amount: 249, category: 'Faturalar', is_recurring: true, is_fraud: false, risk_score: 5.1, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 3, date: '2025-04-16', description: 'Netflix Abonelik', amount: 139.9, category: 'Abonelik', is_recurring: true, is_fraud: false, risk_score: 3.2, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 4, date: '2025-04-15', description: 'Yabancı Ülke ATM', amount: 4850, category: 'Diğer', is_recurring: false, is_fraud: true, risk_score: 91.4, risk_level: 'Yüksek', xai_reasons: '["Yabancı ülke","Yüksek tutar","Gece işlemi"]' },
    { id: 5, date: '2025-04-14', description: 'Trendyol Alışveriş', amount: 1240, category: 'Alışveriş', is_recurring: false, is_fraud: false, risk_score: 22.7, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 6, date: '2025-04-13', description: 'Gece Yarısı Transfer', amount: 9999, category: 'Diğer', is_recurring: false, is_fraud: true, risk_score: 88.6, risk_level: 'Yüksek', xai_reasons: '["Gece işlemi","Yüksek tutar","Hızlı ardışık"]' },
    { id: 7, date: '2025-04-12', description: 'Shell Benzin', amount: 890, category: 'Ulaşım', is_recurring: false, is_fraud: false, risk_score: 14.3, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 8, date: '2025-04-11', description: 'Bilinmeyen Merchant', amount: 5500, category: 'Diğer', is_recurring: false, is_fraud: true, risk_score: 75.2, risk_level: 'Yüksek', xai_reasons: '["Uzak konum","Yeni kart","Riskli kategori"]' },
    { id: 9, date: '2025-04-10', description: 'Spotify Premium', amount: 54.99, category: 'Abonelik', is_recurring: true, is_fraud: false, risk_score: 2.1, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 10, date: '2025-04-09', description: 'Uber Taksi', amount: 127, category: 'Ulaşım', is_recurring: false, is_fraud: false, risk_score: 11.8, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 11, date: '2025-04-08', description: 'EnerjiSA Elektrik', amount: 680, category: 'Faturalar', is_recurring: true, is_fraud: false, risk_score: 4.0, risk_level: 'Düşük', xai_reasons: '[]' },
    { id: 12, date: '2025-04-07', description: 'Carrefour Market', amount: 520, category: 'Market & Gıda', is_recurring: false, is_fraud: false, risk_score: 7.5, risk_level: 'Düşük', xai_reasons: '[]' },
]

export const MOCK_CATEGORIES = {
    'Market & Gıda': 2840, 'Ulaşım': 1450, 'Eğlence': 620,
    'Faturalar': 1380, 'Alışveriş': 1240, 'Sağlık': 320, 'Diğer': 580,
}

export const MOCK_CHAT_REPLIES = [
    'Harcama analizinize göre Eğlence kategorisinde limitinizi aştınız. Bu ayın geri kalanında harcamayı sınırlamanızı öneririm.',
    'Kredi skorunuz 724 — Türkiye ortalamasının üzerinde! Kart limitinizi %25 altında tutarak 750+ seviyeye ulaşabilirsiniz.',
    'Japonya Tatili hedefinize %62 ulaştınız. USD şu an düşük — bu dönemde tur rezervasyonu fırsatçı bir yaklaşım olabilir.',
    'Aylık fatura yükünüz ~3.944 ₺. Türk Telekom tarifenizi güncelleyerek aylık 100-150 ₺ tasarruf mümkün.',
    'Tasarruf oranınız %21.3 ile ortalamanın 2 katı. Bu tempoyla Acil Fon hedefinize ~4 ayda ulaşırsınız.',
]
export const BILL_ICONS = {
    'İletişim': '📡',
    'Enerji': '⚡',
    'Abonelik': '🔁',
    'Kredi': '💳',
    'Faturalar': '🧾',
    'Market & Gıda': '🛒',
    'Ulaşım': '🚗',
    'Alışveriş': '🛍️',
    'Sağlık': '🏥',
    'Diğer': '📦',
}