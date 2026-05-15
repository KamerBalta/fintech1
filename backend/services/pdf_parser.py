"""
Advanced PDF Parser
- pdfplumber ile tablo + düz metin okuma
- is_recurring tespiti (fatura/abonelik keyword'leri)
- Gelecek ay fatura yük tahmini
"""
import re
import pdfplumber
import datetime
import random
from io import BytesIO
from typing import List, Dict, Any, Tuple

# ─── Kategori & Tekrar Kuralları ──────────────────────────────────────────────
RULES: List[Tuple[str, str, bool]] = [
    # (keyword_pattern, category, is_recurring)
    # Faturalar
    (r"türk telekom|ttnet|turkcell|vodafone|türksat|internet|gsm",  "Faturalar",     True),
    (r"enerjisa|enerji|elektrik|aydem|başkent edaş|toroslar",       "Faturalar",     True),
    (r"igdaş|bağkur|doğalgaz|gazdaş|akenerji",                      "Faturalar",     True),
    (r"su .*(idaresi|genel)|iski|aski|meski|büyükşehir su",          "Faturalar",     True),
    (r"sigorta|emekli|bağ-kur|ssk|sgk",                             "Sigorta",       True),
    # Abonelikler
    (r"netflix|disney\+?|exxen|blutv|gain\b|mubi",                  "Abonelik",      True),
    (r"spotify|apple music|youtube premium|deezer",                  "Abonelik",      True),
    (r"amazon prime|microsoft 365|office 365|adobe|linkedin",        "Abonelik",      True),
    (r"udemy|coursera|duolingo|bein connect",                        "Abonelik",      True),
    # Kredi / Finansal — abonelik değil, tekrarlayan borç ödemesi
    (r"kredi\s*taksit|taksitli\s*nakit|nakit\s*avans|kart\s*borç|kart\s*borcu|"
     r"kredi\s*kart[ıi]?\s*ödem|borç\s*ödem|mortgage|konut\s*kredi",  "Borç",          False),
    (r"virman|eft\b|havale|kendi\s*hesab|hesaplar\s*aras",            "Transfer",      False),
    # Market
    (r"migros|carrefour|bim\b|a101|şok market|metro|macro",         "Market & Gıda", False),
    (r"getir|yemeksepeti|trendyol yemek|pizza|burger|restoran",      "Yemek",         False),
    # Ulaşım
    (r"uber|bolt\b|taksi|otopark|köprü|otoyol|hgs|ogs",             "Ulaşım",        False),
    (r"akbil|metro|metrobüs|marmaray|tramvay|istanbul kart",         "Ulaşım",        False),
    (r"shell|opet|bp\b|total\b|petrol|benzin|akaryakıt",            "Ulaşım",        False),
    # Alışveriş
    (r"trendyol|hepsiburada|amazon|n11|gittigidiyor|çiçeksepeti",   "Alışveriş",     False),
    (r"zara|h&m|lcw|koton|defacto|mavi|flo|bershka",               "Alışveriş",     False),
    # Sağlık
    (r"eczane|medikal|hastane|klinik|diş|optik|gözlük",             "Sağlık",        False),
    # Eğlence
    (r"sinema|biletix|konser|müze|spor|fitness|gym",                "Eğlence",       False),
]


def categorize_and_tag(description: str) -> Tuple[str, bool]:
    desc = description.lower()
    for pattern, category, recurring in RULES:
        if re.search(pattern, desc):
            return category, recurring
    return "Diğer", False


# ─── Tutar Ayrıştırma ─────────────────────────────────────────────────────────
AMOUNT_RE = re.compile(r"-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})")
DATE_RE   = re.compile(r"\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{2}[./-]\d{2})\b")


def parse_amount(raw: str) -> float | None:
    s = raw.replace(" ", "")
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


# ─── PDF Ayrıştırıcı ──────────────────────────────────────────────────────────
def extract_transactions(file_bytes: bytes) -> List[Dict[str, Any]]:
    results = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table[1:]:
                    cells = [str(c).strip() if c else "" for c in row]
                    if len(cells) < 3:
                        continue
                    date_col, desc_col, *rest = cells
                    dm = DATE_RE.search(date_col)
                    amounts = [parse_amount(r) for r in rest if AMOUNT_RE.search(r)]
                    amount = next((a for a in amounts if a is not None), None)
                    if desc_col and amount is not None:
                        cat, recurring = categorize_and_tag(desc_col)
                        results.append({
                            "date":        dm.group() if dm else date_col,
                            "description": desc_col,
                            "amount":      abs(amount),
                            "category":    cat,
                            "is_recurring":recurring,
                            "source":      "pdf",
                        })
            else:
                text = page.extract_text() or ""
                for line in text.splitlines():
                    dm = DATE_RE.search(line)
                    amounts = AMOUNT_RE.findall(line)
                    if dm and amounts:
                        desc = line[dm.end():].strip()
                        amount = parse_amount(amounts[-1])
                        if desc and amount is not None:
                            cat, recurring = categorize_and_tag(desc)
                            results.append({
                                "date":        dm.group(),
                                "description": desc,
                                "amount":      abs(amount),
                                "category":    cat,
                                "is_recurring":recurring,
                                "source":      "pdf",
                            })
    return results


# ─── Fatura Yük Tahmini ────────────────────────────────────────────────────────
def predict_bill_load(transactions: List[Dict]) -> float:
    """Tekrarlayan işlemlerin toplamı = gelecek ay tahmini fatura yükü."""
    return round(sum(t["amount"] for t in transactions if t.get("is_recurring")), 2)


# ─── AI İçgörüler ─────────────────────────────────────────────────────────────
def generate_insights(transactions: List[Dict], goals: List[Dict] | None = None) -> List[str]:
    insights = []
    from collections import defaultdict
    cat_totals: Dict[str, float] = defaultdict(float)
    for t in transactions:
        cat_totals[t["category"]] += t["amount"]

    total = sum(cat_totals.values()) or 1

    if cat_totals.get("Yemek", 0) / total > 0.18:
        saving = round(cat_totals["Yemek"] * 0.15)
        insights.append(f"Dışarıda yemek harcamalarınız toplam harcamanızın %{cat_totals['Yemek']/total*100:.0f}'ini oluşturuyor. "
                        f"%15 azaltırsan aylık ~{saving:,} TL tasarruf edersin.")

    if cat_totals.get("Alışveriş", 0) > 2000:
        insights.append(f"Bu dönem alışveriş harcamanız {cat_totals['Alışveriş']:,.0f} TL. "
                        "Trendyol/Hepsiburada'da fiyat alarmı kurarak daha uygun fırsatlar yakalayabilirsin.")

    recurring = [t for t in transactions if t.get("is_recurring")]
    if len(recurring) > 5:
        insights.append(f"{len(recurring)} aktif abonelik ve fatura tespit edildi. "
                        "Kullanmadığın abonelikleri iptal ederek tasarruf sağlayabilirsin.")

    if goals:
        for goal in goals[:2]:
            title = goal.get("title", "Hedef")
            tgt = float(goal.get("target_amount", 0) or 0)
            saved = float(goal.get("saved_amount", 0) or 0)
            remaining = tgt - saved
            spend_total = sum(cat_totals.values())
            hypothetical_monthly_save = max(spend_total, 0.0) * 0.20

            if remaining <= 0:
                insights.append(
                    f"'{title}' hedef tutarına zaten ulaştınız veya birikiminiz hedefi aştı; "
                    "tutarı güncellemek veya yeni bir hedef eklemek isteyebilirsiniz."
                )
            elif hypothetical_monthly_save <= 0:
                insights.append(
                    f"'{title}' hedefi için bu ekstrede yeterli harcama verisi yok; "
                    "tasarruf planı oluşturmak için gelir ve giderlerinizi birlikte değerlendirin."
                )
            else:
                months = remaining / hypothetical_monthly_save
                if months < 0 or months > 600 or not (months == months):  # NaN guard
                    insights.append(
                        f"'{title}' hedefine mevcut harcama hızınızla ulaşmanız mümkün değil; "
                        "tasarruf yapmanız gerekir."
                    )
                else:
                    insights.append(
                        f"'{title}' hedefine bu dönem harcamasına göre "
                        f"yaklaşık {months:.0f} ayda ulaşabilirsin (ekstreden türetilen %20 tasarruf senaryosu)."
                    )

    if not insights:
        insights.append("Harcama düzeniniz genel olarak dengeli görünüyor. "
                        "Düzenli bütçe takibi yapmaya devam edin!")
    return insights


# ─── Demo Veri Üretici ────────────────────────────────────────────────────────
DEMO_ITEMS = [
    ("Migros Market", "Market & Gıda", False, (80, 600)),
    ("Türk Telekom Fatura", "Faturalar", True, (150, 300)),
    ("Netflix Abonelik", "Abonelik", True, (100, 150)),
    ("Uber Taksi", "Ulaşım", False, (50, 400)),
    ("EnerjiSA Elektrik", "Faturalar", True, (200, 800)),
    ("Trendyol Alışveriş", "Alışveriş", False, (100, 2000)),
    ("Spotify Premium", "Abonelik", True, (50, 80)),
    ("Yemeksepeti Sipariş", "Yemek", False, (80, 350)),
    ("Shell Benzin", "Ulaşım", False, (300, 900)),
    ("IGDAŞ Doğalgaz", "Faturalar", True, (150, 600)),
    ("Eczane Medikal", "Sağlık", False, (30, 250)),
    ("A101 Market", "Market & Gıda", False, (50, 400)),
    ("Amazon Prime", "Abonelik", True, (70, 70)),
    ("Biletix Sinema", "Eğlence", False, (60, 200)),
    ("İstanbul Kart Yükleme", "Ulaşım", False, (50, 200)),
    ("Doktor Vizite", "Sağlık", False, (100, 500)),
    ("Çiçeksepeti", "Alışveriş", False, (80, 400)),
    ("Disney+ Abonelik", "Abonelik", True, (70, 100)),
]


def generate_demo_transactions(n: int = 30) -> List[Dict[str, Any]]:
    today = datetime.date.today()
    txns  = []
    for i in range(n):
        desc, cat, recurring, (lo, hi) = random.choice(DEMO_ITEMS)
        txns.append({
            "date":        str(today - datetime.timedelta(days=i)),
            "description": desc,
            "amount":      round(random.uniform(lo, hi), 2),
            "category":    cat,
            "is_recurring":recurring,
            "source":      "demo",
        })
    return txns