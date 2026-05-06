import { useState, useEffect, useRef, useCallback } from "react";

// ─── MOCK API (Backend yokken çalışır) ────────────────────────────────────────
const API_BASE = "http://localhost:8000";

const MOCK_INSIGHTS = {
    credit_score: 724,
    score_label: "Çok İyi",
    total_assets: 87450.00,
    monthly_income: 14200.00,
    monthly_spending: 6830.00,
    savings_rate: 21.3,
    risk_status: "Düşük",
    active_alerts: 1,
    radar_data: {
        "Ödeme Düzeni": 89,
        "Kredi Kullanımı": 76,
        "Hesap Yaşı": 68,
        "Hesap Çeşitliliği": 82,
        "Yeni Kredi": 91,
    },
    spending_forecast: [
        { month: "Şub 2025", predicted: 6200, actual: 6480 },
        { month: "Mar 2025", predicted: 6500, actual: 6210 },
        { month: "Nis 2025", predicted: 6700, actual: 7100 },
        { month: "May 2025", predicted: 6830, actual: null },
        { month: "Haz 2025", predicted: 7200, actual: null },
        { month: "Tem 2025", predicted: 7500, actual: null },
    ],
};

const MOCK_TRANSACTIONS = [
    { date: "2025-04-18", description: "Migros Market", amount: 342.50, category: "Market & Gıda", risk_score: 8.2, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-17", description: "Uber Taksi", amount: 127.00, category: "Ulaşım", risk_score: 12.1, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-16", description: "Netflix Abonelik", amount: 139.90, category: "Eğlence", risk_score: 5.3, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-15", description: "Yabancı Ülke ATM", amount: 4850.00, category: "Diğer", risk_score: 91.4, is_fraud: true, risk_level: "Yüksek", xai_reasons: ["Yabancı işlem", "Yüksek işlem tutarı", "Gece saatlerinde işlem"] },
    { date: "2025-04-14", description: "Elektrik Faturası", amount: 680.00, category: "Faturalar", risk_score: 15.0, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-13", description: "Trendyol Alışveriş", amount: 1240.00, category: "Alışveriş", risk_score: 24.7, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-12", description: "Gece Yarısı Transferi", amount: 9999.00, category: "Diğer", risk_score: 87.3, is_fraud: true, risk_level: "Yüksek", xai_reasons: ["Gece saatlerinde işlem", "Yüksek işlem tutarı", "Çok kısa işlem aralığı"] },
    { date: "2025-04-11", description: "A101 Market", amount: 215.80, category: "Market & Gıda", risk_score: 6.1, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-10", description: "Doğalgaz Faturası", amount: 420.00, category: "Faturalar", risk_score: 9.8, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-09", description: "Bilinmeyen Merchant", amount: 5500.00, category: "Diğer", risk_score: 72.6, is_fraud: true, risk_level: "Yüksek", xai_reasons: ["Alışılmadık konum mesafesi", "Yeni kart", "Riskli kategori"] },
    { date: "2025-04-08", description: "Spotify Premium", amount: 54.99, category: "Eğlence", risk_score: 3.2, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
    { date: "2025-04-07", description: "Shell Benzin", amount: 890.00, category: "Ulaşım", risk_score: 18.4, is_fraud: false, risk_level: "Düşük", xai_reasons: [] },
];

const MOCK_CATEGORY_BREAKDOWN = {
    "Market & Gıda": 2840.50,
    "Ulaşım": 1450.00,
    "Eğlence": 620.00,
    "Faturalar": 1380.00,
    "Alışveriş": 1240.00,
    "Sağlık": 320.00,
    "Diğer": 580.00,
};

const MOCK_CHAT_RESPONSES = [
    "Harcama verilerinizi inceledim. Market & Gıda kategorisinde aylık ortalama 2.840 TL harcıyorsunuz. Haftalık alışveriş listesi hazırlayarak bu tutarı %15-20 azaltabilirsiniz.",
    "Kredi skorunuz 724 ile Çok İyi seviyede! Skoru 750+ seviyesine çıkarmak için kredi kartı kullanım oranınızı %25'in altında tutmanızı öneririm.",
    "3 şüpheli işlem tespit edildi. Özellikle yabancı ülke ATM çekimi ve gece transferleri dikkat çekici. Bankanızla iletişime geçmenizi tavsiye ederim.",
    "Tasarruf oranınız %21.3 ile sektör ortalamasının üzerinde. Birikiminizi yatırım fonlarına yönlendirerek enflasyona karşı korumalı getiri elde edebilirsiniz.",
    "Fatura harcamalarınızı analiz ettim. Farklı sağlayıcılarla kıyaslama yaparak yıllık 1.000-2.000 TL tasarruf sağlayabilirsiniz.",
];

// ─── Yardımcı fonksiyonlar ────────────────────────────────────────────────────
const fmt = (n) => new Intl.NumberFormat("tr-TR", { minimumFractionDigits: 2 }).format(n);
const fmtK = (n) => n >= 1000 ? `${(n / 1000).toFixed(1)}K` : n.toFixed(0);

const CAT_COLORS = {
    "Market & Gıda": "#10B981",
    "Ulaşım": "#3B82F6",
    "Eğlence": "#8B5CF6",
    "Faturalar": "#F59E0B",
    "Alışveriş": "#EC4899",
    "Sağlık": "#14B8A6",
    "Eğitim": "#6366F1",
    "Yatırım & Finans": "#22C55E",
    "Diğer": "#64748B",
};

// ─── Skeleton bileşeni ────────────────────────────────────────────────────────
const Skeleton = ({ w = "100%", h = 20, r = 6 }) => (
    <div style={{
        width: w, height: h, borderRadius: r,
        background: "linear-gradient(90deg,#1e2d4a 25%,#253559 50%,#1e2d4a 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
    }} />
);

// ─── Mini Bar Chart ───────────────────────────────────────────────────────────
const MiniBar = ({ data, color = "#10B981" }) => {
    const max = Math.max(...data);
    return (
        <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 40 }}>
            {data.map((v, i) => (
                <div key={i} style={{
                    flex: 1, height: `${(v / max) * 100}%`,
                    background: color, borderRadius: "2px 2px 0 0",
                    opacity: i === data.length - 1 ? 1 : 0.5,
                    transition: "height 0.5s ease",
                }} />
            ))}
        </div>
    );
};

// ─── Donut Chart (SVG) ───────────────────────────────────────────────────────
const DonutChart = ({ data, size = 200 }) => {
    const total = Object.values(data).reduce((a, b) => a + b, 0);
    const cx = size / 2, cy = size / 2, r = size * 0.38, inner = size * 0.24;
    let angle = -Math.PI / 2;
    const slices = Object.entries(data).map(([label, value]) => {
        const pct = value / total;
        const sweep = pct * 2 * Math.PI;
        const x1 = cx + r * Math.cos(angle), y1 = cy + r * Math.sin(angle);
        const x2 = cx + r * Math.cos(angle + sweep), y2 = cy + r * Math.sin(angle + sweep);
        const ix1 = cx + inner * Math.cos(angle), iy1 = cy + inner * Math.sin(angle);
        const ix2 = cx + inner * Math.cos(angle + sweep), iy2 = cy + inner * Math.sin(angle + sweep);
        const large = sweep > Math.PI ? 1 : 0;
        const path = `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2} L ${ix2} ${iy2} A ${inner} ${inner} 0 ${large} 0 ${ix1} ${iy1} Z`;
        const mid = angle + sweep / 2;
        angle += sweep;
        return { label, value, pct, path, color: CAT_COLORS[label] || "#64748B", mid };
    });

    return (
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {slices.map((s, i) => (
                <path key={i} d={s.path} fill={s.color} stroke="#0f1e36" strokeWidth={2}>
                    <title>{s.label}: {(s.pct * 100).toFixed(1)}%</title>
                </path>
            ))}
            <text x={cx} y={cy - 8} textAnchor="middle" fontSize="11" fill="#94a3b8">Toplam</text>
            <text x={cx} y={cy + 8} textAnchor="middle" fontSize="13" fontWeight="600" fill="#e2e8f0">{fmtK(total)} TL</text>
        </svg>
    );
};

// ─── Area Chart (Spending Forecast) ──────────────────────────────────────────
const AreaChart = ({ data, width = 580, height = 160 }) => {
    const pad = { top: 16, right: 16, bottom: 28, left: 50 };
    const W = width - pad.left - pad.right;
    const H = height - pad.top - pad.bottom;
    const vals = data.flatMap(d => [d.predicted, d.actual].filter(Boolean));
    const minV = Math.min(...vals) * 0.9;
    const maxV = Math.max(...vals) * 1.05;
    const scX = (i) => (i / (data.length - 1)) * W;
    const scY = (v) => H - ((v - minV) / (maxV - minV)) * H;

    const predPts = data.map((d, i) => `${scX(i)},${scY(d.predicted)}`).join(" ");
    const actPts = data.filter(d => d.actual != null).map((d, i) => `${scX(i)},${scY(d.actual)}`).join(" ");

    return (
        <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
            <defs>
                <linearGradient id="predGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10B981" stopOpacity="0.3" />
                    <stop offset="100%" stopColor="#10B981" stopOpacity="0" />
                </linearGradient>
                <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#3B82F6" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#3B82F6" stopOpacity="0" />
                </linearGradient>
            </defs>
            <g transform={`translate(${pad.left},${pad.top})`}>
                {[0, 0.25, 0.5, 0.75, 1].map(t => {
                    const v = minV + t * (maxV - minV);
                    return (
                        <g key={t}>
                            <line x1={0} x2={W} y1={scY(v)} y2={scY(v)} stroke="#1e3a5f" strokeWidth={0.5} />
                            <text x={-8} y={scY(v) + 4} textAnchor="end" fontSize="9" fill="#64748b">{fmtK(v)}</text>
                        </g>
                    );
                })}
                <polyline points={`${predPts} ${scX(data.length - 1)},${H} 0,${H}`}
                    fill="url(#predGrad)" stroke="none" />
                <polyline points={predPts} fill="none" stroke="#10B981" strokeWidth={2} strokeDasharray="4 3" />
                {actPts && (
                    <>
                        <polyline points={`${actPts} ${scX(data.filter(d => d.actual).length - 1)},${H} 0,${H}`}
                            fill="url(#actGrad)" stroke="none" />
                        <polyline points={actPts} fill="none" stroke="#3B82F6" strokeWidth={2} />
                    </>
                )}
                {data.map((d, i) => (
                    <text key={i} x={scX(i)} y={H + 14} textAnchor="middle" fontSize="9" fill="#64748b">{d.month}</text>
                ))}
            </g>
        </svg>
    );
};

// ─── Radar Chart ──────────────────────────────────────────────────────────────
const RadarChart = ({ data, size = 180 }) => {
    const labels = Object.keys(data);
    const values = Object.values(data);
    const n = labels.length;
    const cx = size / 2, cy = size / 2, maxR = size * 0.38;

    const toXY = (i, val) => {
        const angle = (i / n) * 2 * Math.PI - Math.PI / 2;
        return { x: cx + val * maxR * Math.cos(angle), y: cy + val * maxR * Math.sin(angle) };
    };

    const rings = [0.25, 0.5, 0.75, 1];
    const pts = values.map((v, i) => toXY(i, v / 100));
    const polyStr = pts.map(p => `${p.x},${p.y}`).join(" ");

    return (
        <svg width={size} height={size}>
            {rings.map(r => (
                <polygon key={r}
                    points={labels.map((_, i) => { const p = toXY(i, r); return `${p.x},${p.y}`; }).join(" ")}
                    fill="none" stroke="#1e3a5f" strokeWidth={0.5} />
            ))}
            {labels.map((_, i) => {
                const p = toXY(i, 1);
                return <line key={i} x1={cx} y1={cy} x2={p.x} y2={p.y} stroke="#1e3a5f" strokeWidth={0.5} />;
            })}
            <polygon points={polyStr} fill="rgba(16,185,129,0.2)" stroke="#10B981" strokeWidth={1.5} />
            {pts.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r={3} fill="#10B981" />
            ))}
            {labels.map((label, i) => {
                const p = toXY(i, 1.22);
                return (
                    <text key={i} x={p.x} y={p.y} textAnchor="middle" fontSize="8" fill="#94a3b8"
                        dominantBaseline="middle">{label}</text>
                );
            })}
        </svg>
    );
};

// ─── Credit Score Ring ────────────────────────────────────────────────────────
const ScoreRing = ({ score }) => {
    const min = 300, max = 850;
    const pct = (score - min) / (max - min);
    const r = 54, circ = 2 * Math.PI * r;
    const dash = pct * circ * 0.75;
    const color = score >= 750 ? "#10B981" : score >= 650 ? "#3B82F6" : score >= 600 ? "#F59E0B" : "#EF4444";

    return (
        <svg width={130} height={130} viewBox="0 0 130 130">
            <circle cx={65} cy={65} r={r} fill="none" stroke="#1e3a5f" strokeWidth={10}
                strokeDasharray={`${circ * 0.75} ${circ * 0.25}`}
                strokeDashoffset={circ * 0.125} strokeLinecap="round" />
            <circle cx={65} cy={65} r={r} fill="none" stroke={color} strokeWidth={10}
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={circ * 0.125} strokeLinecap="round"
                style={{ transition: "stroke-dasharray 1s ease" }} />
            <text x={65} y={60} textAnchor="middle" fontSize="22" fontWeight="700" fill={color}>{score}</text>
            <text x={65} y={76} textAnchor="middle" fontSize="10" fill="#94a3b8">/ 850</text>
        </svg>
    );
};

// ─── XAI Tooltip ─────────────────────────────────────────────────────────────
const XAIBadge = ({ reasons }) => {
    const [open, setOpen] = useState(false);
    if (!reasons || reasons.length === 0) return null;
    return (
        <div style={{ position: "relative", display: "inline-block" }}>
            <button onClick={() => setOpen(o => !o)} style={{
                background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.4)",
                borderRadius: 4, color: "#f87171", fontSize: 10, padding: "2px 7px", cursor: "pointer",
            }}>Neden?</button>
            {open && (
                <div style={{
                    position: "absolute", right: 0, top: 28, zIndex: 50,
                    background: "#0f1e36", border: "1px solid #1e3a5f",
                    borderRadius: 8, padding: "10px 12px", width: 200,
                    boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
                }}>
                    <div style={{ fontSize: 10, color: "#f87171", fontWeight: 600, marginBottom: 6 }}>AI Açıklaması</div>
                    {reasons.map((r, i) => (
                        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 4 }}>
                            <span style={{ color: "#ef4444", fontSize: 11 }}>⚠</span>
                            <span style={{ fontSize: 11, color: "#cbd5e1" }}>{r}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

// ─── Ana Uygulama ─────────────────────────────────────────────────────────────
export default function App() {
    const [tab, setTab] = useState("dashboard");
    const [insights, setInsights] = useState(null);
    const [transactions, setTransactions] = useState([]);
    const [categoryData, setCategoryData] = useState({});
    const [loadingInsights, setLoadingInsights] = useState(true);
    const [loadingTxn, setLoadingTxn] = useState(false);
    const [dragOver, setDragOver] = useState(false);
    const [pdfName, setPdfName] = useState(null);
    const [chatMessages, setChatMessages] = useState([
        { role: "assistant", text: "Merhaba! Ben FINARA, finansal yapay zeka asistanınızım. Harcamalarınız, kredi skorunuz veya fraud koruması hakkında sorularınızı yanıtlamaktan memnuniyet duyarım." }
    ]);
    const [chatInput, setChatInput] = useState("");
    const [chatLoading, setChatLoading] = useState(false);
    const [chatOpen, setChatOpen] = useState(false);
    const chatEndRef = useRef(null);
    const fileInputRef = useRef(null);

    useEffect(() => {
        // İçgörüleri yükle (mock)
        setTimeout(() => {
            setInsights(MOCK_INSIGHTS);
            setLoadingInsights(false);
        }, 1200);
        // Demo işlemleri yükle
        setTransactions(MOCK_TRANSACTIONS);
        setCategoryData(MOCK_CATEGORY_BREAKDOWN);
    }, []);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatMessages]);

    const handleFile = useCallback(async (file) => {
        if (!file) return;
        setPdfName(file.name);
        setLoadingTxn(true);
        // Gerçek API çağrısı
        try {
            const fd = new FormData();
            fd.append("file", file);
            const res = await fetch(`${API_BASE}/upload-statement`, { method: "POST", body: fd });
            const data = await res.json();
            setTransactions(data.transactions);
            setCategoryData(data.category_breakdown);
        } catch {
            // Mock veriye düş
            await new Promise(r => setTimeout(r, 1500));
            setTransactions(MOCK_TRANSACTIONS);
            setCategoryData(MOCK_CATEGORY_BREAKDOWN);
        }
        setLoadingTxn(false);
    }, []);

    const sendChat = useCallback(async () => {
        if (!chatInput.trim()) return;
        const userMsg = chatInput.trim();
        setChatInput("");
        setChatMessages(m => [...m, { role: "user", text: userMsg }]);
        setChatLoading(true);
        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg,
                    financial_context: insights || MOCK_INSIGHTS,
                    history: chatMessages.slice(-6).map(m => ({ role: m.role, content: m.text })),
                }),
            });
            const data = await res.json();
            setChatMessages(m => [...m, { role: "assistant", text: data.reply }]);
        } catch {
            await new Promise(r => setTimeout(r, 800));
            const reply = MOCK_CHAT_RESPONSES[Math.floor(Math.random() * MOCK_CHAT_RESPONSES.length)];
            setChatMessages(m => [...m, { role: "assistant", text: reply }]);
        }
        setChatLoading(false);
    }, [chatInput, chatMessages, insights]);

    const ins = insights || MOCK_INSIGHTS;
    const fraudCount = transactions.filter(t => t.is_fraud).length;

    // ─── STYLES ────────────────────────────────────────────────────────────────
    const styles = {
        app: {
            minHeight: "100vh", background: "#070f1e",
            fontFamily: "'DM Sans', system-ui, sans-serif",
            color: "#e2e8f0",
        },
        sidebar: {
            position: "fixed", left: 0, top: 0, bottom: 0, width: 64,
            background: "#0a1628", borderRight: "1px solid #1e3a5f",
            display: "flex", flexDirection: "column", alignItems: "center",
            padding: "20px 0", gap: 8, zIndex: 100,
        },
        logo: {
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg,#10B981,#3B82F6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 18, fontWeight: 800, color: "#fff", marginBottom: 16,
            flexShrink: 0,
        },
        navBtn: (active) => ({
            width: 44, height: 44, borderRadius: 10, border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "center",
            background: active ? "rgba(16,185,129,0.2)" : "transparent",
            color: active ? "#10B981" : "#64748b",
            fontSize: 18, transition: "all 0.2s",
        }),
        main: { marginLeft: 64, padding: "24px 32px", maxWidth: 1200 },
        header: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 28 },
        pageTitle: { fontSize: 22, fontWeight: 700, color: "#f1f5f9", margin: 0 },
        card: {
            background: "#0d1e36", border: "1px solid #1e3a5f",
            borderRadius: 14, padding: 20,
        },
        statCard: {
            background: "#0d1e36", border: "1px solid #1e3a5f",
            borderRadius: 14, padding: "18px 20px",
        },
        label: { fontSize: 11, color: "#64748b", fontWeight: 500, letterSpacing: "0.05em", textTransform: "uppercase" },
        value: { fontSize: 26, fontWeight: 700, color: "#f1f5f9", margin: "4px 0 0" },
        grid3: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 20 },
        grid2: { display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 16 },
        badge: (color) => ({
            display: "inline-block", padding: "2px 10px",
            borderRadius: 20, fontSize: 11, fontWeight: 600,
            background: color === "red" ? "rgba(239,68,68,0.15)" : color === "green" ? "rgba(16,185,129,0.15)" : "rgba(245,158,11,0.15)",
            color: color === "red" ? "#f87171" : color === "green" ? "#34d399" : "#fbbf24",
            border: `1px solid ${color === "red" ? "rgba(239,68,68,0.3)" : color === "green" ? "rgba(16,185,129,0.3)" : "rgba(245,158,11,0.3)"}`,
        }),
    };

    // ─── TABS ──────────────────────────────────────────────────────────────────
    const TABS = [
        { id: "dashboard", icon: "⬛", label: "Dashboard" },
        { id: "pdf", icon: "📄", label: "PDF Analiz" },
        { id: "fraud", icon: "🛡️", label: "Fraud" },
    ];

    return (
        <div style={styles.app}>
            <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes shimmer { to { background-position: -200% 0; } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:none; } }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0a1628; }
        ::-webkit-scrollbar-thumb { background: #1e3a5f; border-radius: 2px; }
        input:focus { outline: none; }
      `}</style>

            {/* Sidebar */}
            <nav style={styles.sidebar}>
                <div style={styles.logo}>F</div>
                {TABS.map(t => (
                    <button key={t.id} style={styles.navBtn(tab === t.id)}
                        onClick={() => setTab(t.id)} title={t.label}>
                        <span style={{ fontSize: 16 }}>{t.icon}</span>
                    </button>
                ))}
            </nav>

            {/* Main content */}
            <main style={styles.main}>
                {/* ══════ DASHBOARD ══════ */}
                {tab === "dashboard" && (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                        <div style={styles.header}>
                            <div>
                                <p style={{ ...styles.label, marginBottom: 4 }}>Hoş geldiniz</p>
                                <h1 style={styles.pageTitle}>Finansal Özet</h1>
                            </div>
                            {fraudCount > 0 && (
                                <div style={{
                                    background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)",
                                    borderRadius: 10, padding: "10px 16px", display: "flex", alignItems: "center", gap: 10,
                                }}>
                                    <span style={{ fontSize: 18 }}>⚠️</span>
                                    <div>
                                        <div style={{ fontSize: 12, fontWeight: 600, color: "#f87171" }}>{fraudCount} Şüpheli İşlem</div>
                                        <div style={{ fontSize: 11, color: "#94a3b8" }}>Hemen inceleyin</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Stat Cards */}
                        <div style={styles.grid3}>
                            {loadingInsights ? (
                                [0, 1, 2].map(i => (
                                    <div key={i} style={styles.statCard}>
                                        <Skeleton w="60%" h={12} /><div style={{ marginTop: 12 }} />
                                        <Skeleton w="80%" h={28} />
                                    </div>
                                ))
                            ) : (
                                <>
                                    <div style={styles.statCard}>
                                        <div style={styles.label}>Toplam Varlık</div>
                                        <div style={styles.value}>{fmt(ins.total_assets)} ₺</div>
                                        <MiniBar data={[62, 71, 68, 74, 80, 87]} color="#10B981" />
                                        <div style={{ fontSize: 11, color: "#34d399", marginTop: 4 }}>↑ %12.4 bu ay</div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div style={styles.label}>Aylık Harcama</div>
                                        <div style={styles.value}>{fmt(ins.monthly_spending)} ₺</div>
                                        <MiniBar data={[58, 62, 71, 64, 69, 68]} color="#3B82F6" />
                                        <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>Gelirin %{(ins.monthly_spending / ins.monthly_income * 100).toFixed(1)}'i</div>
                                    </div>
                                    <div style={styles.statCard}>
                                        <div style={styles.label}>Risk Durumu</div>
                                        <div style={{ ...styles.value, color: ins.risk_status === "Düşük" ? "#10B981" : "#F59E0B" }}>
                                            {ins.risk_status}
                                        </div>
                                        <div style={{ fontSize: 11, color: "#64748b", marginTop: 8 }}>
                                            {ins.active_alerts} aktif uyarı
                                        </div>
                                        <div style={{ display: "flex", gap: 4, marginTop: 6 }}>
                                            {[1, 2, 3, 4, 5].map(i => (
                                                <div key={i} style={{
                                                    flex: 1, height: 4, borderRadius: 2,
                                                    background: i <= (ins.risk_status === "Düşük" ? 1 : ins.risk_status === "Orta" ? 3 : 5)
                                                        ? (ins.risk_status === "Düşük" ? "#10B981" : ins.risk_status === "Orta" ? "#F59E0B" : "#EF4444")
                                                        : "#1e3a5f",
                                                }} />
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Charts Row */}
                        <div style={styles.grid2}>
                            {/* Area Chart */}
                            <div style={styles.card}>
                                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
                                    <div>
                                        <div style={styles.label}>Harcama Trendi</div>
                                        <div style={{ fontSize: 14, color: "#94a3b8", marginTop: 2 }}>6 aylık tahmin</div>
                                    </div>
                                    <div style={{ display: "flex", gap: 12, fontSize: 10, color: "#94a3b8" }}>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={{ display: "inline-block", width: 16, height: 2, background: "#3B82F6" }} /> Gerçek
                                        </span>
                                        <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                            <span style={{ display: "inline-block", width: 16, height: 2, background: "#10B981", borderTop: "2px dashed #10B981" }} /> Tahmin
                                        </span>
                                    </div>
                                </div>
                                {loadingInsights ? <Skeleton h={160} /> : <AreaChart data={ins.spending_forecast} />}
                            </div>

                            {/* Kredi + Radar */}
                            <div style={styles.card}>
                                <div style={styles.label}>Finansal Skor Raporu</div>
                                {loadingInsights ? (
                                    <Skeleton h={180} />
                                ) : (
                                    <div style={{ display: "flex", alignItems: "center", gap: 24, marginTop: 16 }}>
                                        <div style={{ textAlign: "center" }}>
                                            <ScoreRing score={ins.credit_score} />
                                            <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 4 }}>{ins.score_label}</div>
                                        </div>
                                        <div style={{ flex: 1 }}>
                                            <div style={{ fontSize: 12, color: "#64748b", marginBottom: 10 }}>Kredi Faktörleri</div>
                                            <RadarChart data={ins.radar_data} size={160} />
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}

                {/* ══════ PDF ANALİZ ══════ */}
                {tab === "pdf" && (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                        <div style={styles.header}>
                            <h1 style={styles.pageTitle}>PDF Banka Ekstresi Analizi</h1>
                        </div>

                        {/* Drag & Drop */}
                        <div
                            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                            onDragLeave={() => setDragOver(false)}
                            onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
                            onClick={() => fileInputRef.current?.click()}
                            style={{
                                border: `2px dashed ${dragOver ? "#10B981" : "#1e3a5f"}`,
                                borderRadius: 16, padding: "48px 32px", textAlign: "center",
                                background: dragOver ? "rgba(16,185,129,0.05)" : "#0d1e36",
                                cursor: "pointer", transition: "all 0.2s", marginBottom: 24,
                            }}
                        >
                            <input ref={fileInputRef} type="file" accept=".pdf"
                                style={{ display: "none" }} onChange={e => handleFile(e.target.files[0])} />
                            <div style={{ fontSize: 40, marginBottom: 12 }}>📤</div>
                            <div style={{ fontSize: 15, fontWeight: 600, color: "#f1f5f9" }}>
                                {pdfName || "PDF dosyanızı sürükleyin veya tıklayın"}
                            </div>
                            <div style={{ fontSize: 12, color: "#64748b", marginTop: 6 }}>
                                Banka ekstresi PDF dosyaları desteklenir
                            </div>
                        </div>

                        {/* Sonuçlar */}
                        {loadingTxn ? (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                <div style={styles.card}><Skeleton h={200} /></div>
                                <div style={styles.card}><Skeleton h={200} /></div>
                            </div>
                        ) : Object.keys(categoryData).length > 0 && (
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                                {/* Donut */}
                                <div style={styles.card}>
                                    <div style={styles.label}>Kategori Dağılımı</div>
                                    <div style={{ display: "flex", alignItems: "center", gap: 20, marginTop: 16 }}>
                                        <DonutChart data={categoryData} size={200} />
                                        <div style={{ flex: 1 }}>
                                            {Object.entries(categoryData).map(([cat, amt]) => (
                                                <div key={cat} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                                                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                        <div style={{ width: 8, height: 8, borderRadius: 2, background: CAT_COLORS[cat] || "#64748B", flexShrink: 0 }} />
                                                        <span style={{ fontSize: 11, color: "#94a3b8" }}>{cat}</span>
                                                    </div>
                                                    <span style={{ fontSize: 11, fontWeight: 600, color: "#e2e8f0" }}>{fmt(amt)} ₺</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* İşlem listesi */}
                                <div style={{ ...styles.card, overflowY: "auto", maxHeight: 400 }}>
                                    <div style={styles.label}>İşlemler</div>
                                    <div style={{ marginTop: 12 }}>
                                        {transactions.slice(0, 12).map((t, i) => (
                                            <div key={i} style={{
                                                display: "flex", justifyContent: "space-between", alignItems: "center",
                                                padding: "8px 0", borderBottom: "1px solid #1e3a5f",
                                            }}>
                                                <div>
                                                    <div style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 500 }}>{t.description}</div>
                                                    <div style={{ fontSize: 10, color: "#64748b" }}>{t.date} · {t.category}</div>
                                                </div>
                                                <div style={{ textAlign: "right" }}>
                                                    <div style={{ fontSize: 12, fontWeight: 600, color: "#f1f5f9" }}>{fmt(t.amount)} ₺</div>
                                                    {t.is_fraud && <span style={{ fontSize: 9, color: "#f87171" }}>⚠ Şüpheli</span>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* ══════ FRAUD İZLEME ══════ */}
                {tab === "fraud" && (
                    <div style={{ animation: "fadeIn 0.3s ease" }}>
                        <div style={styles.header}>
                            <h1 style={styles.pageTitle}>Fraud İzleme Merkezi</h1>
                            <div style={{ display: "flex", gap: 12 }}>
                                <div style={styles.statCard}>
                                    <div style={{ fontSize: 10, color: "#64748b" }}>Şüpheli</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#f87171" }}>{fraudCount}</div>
                                </div>
                                <div style={styles.statCard}>
                                    <div style={{ fontSize: 10, color: "#64748b" }}>Temiz</div>
                                    <div style={{ fontSize: 20, fontWeight: 700, color: "#34d399" }}>{transactions.length - fraudCount}</div>
                                </div>
                            </div>
                        </div>

                        <div style={styles.card}>
                            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                                <thead>
                                    <tr style={{ borderBottom: "1px solid #1e3a5f" }}>
                                        {["Tarih", "Açıklama", "Kategori", "Tutar", "Risk Skoru", "Durum", "Açıklama"].map(h => (
                                            <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: "#64748b", fontWeight: 500, fontSize: 11 }}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {transactions.map((t, i) => (
                                        <tr key={i} style={{
                                            borderBottom: "1px solid #1e3a5f",
                                            background: t.is_fraud ? "rgba(239,68,68,0.06)" : "transparent",
                                            transition: "background 0.15s",
                                        }}>
                                            <td style={{ padding: "10px 12px", color: "#94a3b8" }}>{t.date}</td>
                                            <td style={{ padding: "10px 12px", color: "#e2e8f0", fontWeight: t.is_fraud ? 600 : 400 }}>
                                                {t.is_fraud && <span style={{ color: "#f87171", marginRight: 4 }}>⚠</span>}
                                                {t.description}
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: CAT_COLORS[t.category] || "#64748b" }} />
                                                    <span style={{ color: "#94a3b8" }}>{t.category}</span>
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 12px", color: t.is_fraud ? "#f87171" : "#e2e8f0", fontWeight: 500 }}>
                                                {fmt(t.amount)} ₺
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                                    <div style={{
                                                        width: 48, height: 5, borderRadius: 3,
                                                        background: "#1e3a5f", overflow: "hidden",
                                                    }}>
                                                        <div style={{
                                                            width: `${t.risk_score}%`, height: "100%",
                                                            background: t.risk_score > 70 ? "#ef4444" : t.risk_score > 40 ? "#f59e0b" : "#10B981",
                                                            borderRadius: 3,
                                                        }} />
                                                    </div>
                                                    <span style={{ color: t.risk_score > 70 ? "#f87171" : "#94a3b8" }}>{t.risk_score}%</span>
                                                </div>
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <span style={styles.badge(t.is_fraud ? "red" : "green")}>
                                                    {t.is_fraud ? "Şüpheli" : "Güvenli"}
                                                </span>
                                            </td>
                                            <td style={{ padding: "10px 12px" }}>
                                                <XAIBadge reasons={t.xai_reasons} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </main>

            {/* ══════ CHAT WIDGET ══════ */}
            <div style={{ position: "fixed", right: 24, bottom: 24, zIndex: 200 }}>
                {chatOpen && (
                    <div style={{
                        width: 340, height: 480, background: "#0d1e36",
                        border: "1px solid #1e3a5f", borderRadius: 16,
                        display: "flex", flexDirection: "column",
                        boxShadow: "0 20px 60px rgba(0,0,0,0.7)",
                        animation: "fadeIn 0.25s ease",
                        marginBottom: 12,
                    }}>
                        {/* Header */}
                        <div style={{
                            padding: "14px 16px", borderBottom: "1px solid #1e3a5f",
                            display: "flex", alignItems: "center", gap: 10,
                        }}>
                            <div style={{
                                width: 34, height: 34, borderRadius: 10,
                                background: "linear-gradient(135deg,#10B981,#3B82F6)",
                                display: "flex", alignItems: "center", justifyContent: "center",
                                fontSize: 15,
                            }}>🤖</div>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: 13, color: "#f1f5f9" }}>FINARA Asistan</div>
                                <div style={{ fontSize: 10, color: "#34d399", display: "flex", alignItems: "center", gap: 4 }}>
                                    <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: "pulse 2s infinite" }} />
                                    Çevrimiçi
                                </div>
                            </div>
                        </div>

                        {/* Messages */}
                        <div style={{ flex: 1, overflowY: "auto", padding: "12px 14px", display: "flex", flexDirection: "column", gap: 10 }}>
                            {chatMessages.map((m, i) => (
                                <div key={i} style={{
                                    alignSelf: m.role === "user" ? "flex-end" : "flex-start",
                                    maxWidth: "85%",
                                }}>
                                    <div style={{
                                        background: m.role === "user" ? "linear-gradient(135deg,#10B981,#059669)" : "#132038",
                                        color: "#f1f5f9", borderRadius: m.role === "user" ? "12px 12px 2px 12px" : "12px 12px 12px 2px",
                                        padding: "8px 12px", fontSize: 12, lineHeight: 1.5,
                                        border: m.role === "assistant" ? "1px solid #1e3a5f" : "none",
                                    }}>{m.text}</div>
                                </div>
                            ))}
                            {chatLoading && (
                                <div style={{ alignSelf: "flex-start" }}>
                                    <div style={{ background: "#132038", border: "1px solid #1e3a5f", borderRadius: "12px 12px 12px 2px", padding: "10px 14px", display: "flex", gap: 4 }}>
                                        {[0, 1, 2].map(i => (
                                            <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: "#10B981", animation: `pulse 1.2s ${i * 0.2}s infinite` }} />
                                        ))}
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>

                        {/* Input */}
                        <div style={{ padding: "10px 12px", borderTop: "1px solid #1e3a5f", display: "flex", gap: 8 }}>
                            <input
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && sendChat()}
                                placeholder="Sorunuzu yazın…"
                                style={{
                                    flex: 1, background: "#0a1628", border: "1px solid #1e3a5f",
                                    borderRadius: 8, padding: "8px 12px", color: "#e2e8f0", fontSize: 12,
                                }}
                            />
                            <button onClick={sendChat} disabled={chatLoading} style={{
                                width: 34, height: 34, borderRadius: 8, border: "none",
                                background: "linear-gradient(135deg,#10B981,#059669)",
                                color: "#fff", cursor: "pointer", fontSize: 14,
                                display: "flex", alignItems: "center", justifyContent: "center",
                                flexShrink: 0,
                            }}>➤</button>
                        </div>
                    </div>
                )}

                {/* Toggle button */}
                <button
                    onClick={() => setChatOpen(o => !o)}
                    style={{
                        width: 56, height: 56, borderRadius: "50%", border: "none",
                        background: "linear-gradient(135deg,#10B981,#3B82F6)",
                        color: "#fff", fontSize: 22, cursor: "pointer",
                        boxShadow: "0 4px 20px rgba(16,185,129,0.4)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        transition: "transform 0.2s",
                        float: "right",
                    }}
                    title="FINARA Asistan"
                >
                    {chatOpen ? "✕" : "💬"}
                </button>
            </div>
        </div>
    );
}