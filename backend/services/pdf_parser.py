"""
PDF Parser – pdfplumber ile banka ekstresi ayrıştırma
"""
import re
import pdfplumber
from typing import List, Dict, Any
from io import BytesIO

# Harcama kategorisi: anahtar kelime → kategori
CATEGORY_RULES: Dict[str, List[str]] = {
    "Market & Gıda":    ["market","migros","a101","bim","carrefour","şok","food",
                          "restaurant","burger","pizza","cafe","kahve","yemek"],
    "Ulaşım":           ["akbil","metrobüs","metro","taksi","uber","bolt","petrol",
                          "benzin","shell","total","opet","otopark","araç"],
    "Eğlence":          ["netflix","spotify","youtube","cinema","sinema","oyun",
                          "game","biletix","konser","eğlence","bar","pub"],
    "Faturalar":        ["elektrik","su","doğalgaz","ttnet","turkcell","vodafone",
                          "internet","fatura","abonelik"],
    "Sağlık":           ["eczane","hastane","doktor","klinik","optik","pharmacy",
                          "medikal","sağlık"],
    "Alışveriş":        ["zara","h&m","lcw","koton","defacto","mavi","trendyol",
                          "hepsiburada","amazon","n11","gittigidiyor","sahibinden"],
    "Eğitim":           ["udemy","coursera","okul","kurs","kitap","d&r","kitapevi"],
    "Yatırım & Finans": ["borsa","kripto","bist","hisse","fon","sigorta","kredi"],
}

def categorize(description: str) -> str:
    desc_lower = description.lower()
    for category, keywords in CATEGORY_RULES.items():
        for kw in keywords:
            if kw in desc_lower:
                return category
    return "Diğer"

def parse_amount(raw: str) -> float | None:
    """'1.234,56' veya '1234.56' formatlarını float'a çevirir."""
    cleaned = re.sub(r"[^\d,\.]", "", raw)
    # Türk formatı: nokta binlik, virgül ondalık
    if "," in cleaned and "." in cleaned:
        if cleaned.rfind(",") > cleaned.rfind("."):
            cleaned = cleaned.replace(".", "").replace(",", ".")
        else:
            cleaned = cleaned.replace(",", "")
    elif "," in cleaned:
        cleaned = cleaned.replace(",", ".")
    try:
        return float(cleaned)
    except ValueError:
        return None

DATE_RE = re.compile(
    r"\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{2}[./-]\d{2})\b"
)
AMOUNT_RE = re.compile(
    r"(-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2}))"
)

def extract_from_pdf(file_bytes: bytes) -> List[Dict[str, Any]]:
    transactions = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table[1:]:          # ilk satır başlık
                    row = [str(c).strip() if c else "" for c in row]
                    # Yeterince hücreli satırı işle
                    if len(row) >= 3:
                        date_col, desc_col, *rest = row
                        date_match = DATE_RE.search(date_col)
                        amounts = [parse_amount(r) for r in rest if AMOUNT_RE.search(r)]
                        amount = next((a for a in amounts if a is not None), None)
                        if desc_col and amount is not None:
                            transactions.append({
                                "date":        date_match.group() if date_match else date_col,
                                "description": desc_col,
                                "amount":      amount,
                                "category":    categorize(desc_col),
                            })
            else:
                # Tablo yoksa düz metin dene
                text = page.extract_text() or ""
                for line in text.splitlines():
                    date_m = DATE_RE.search(line)
                    amount_m = AMOUNT_RE.findall(line)
                    if date_m and amount_m:
                        # Tarihten sonraki kısmı açıklama say
                        end = date_m.end()
                        desc = line[end:].strip()
                        # Son bulunan tutarı kullan
                        amount = parse_amount(amount_m[-1])
                        if desc and amount is not None:
                            transactions.append({
                                "date":        date_m.group(),
                                "description": desc,
                                "amount":      amount,
                                "category":    categorize(desc),
                            })
    return transactions

# ─── DEMO – PDF yokken kullanılan sentetik veri ───────────────────────────────
import random, datetime

DEMO_DESCRIPTIONS = [
    ("Migros Market", "Market & Gıda"),
    ("Uber Taksi", "Ulaşım"),
    ("Netflix Abonelik", "Eğlence"),
    ("Elektrik Faturası", "Faturalar"),
    ("Eczane Medikal", "Sağlık"),
    ("Trendyol Alışveriş", "Alışveriş"),
    ("Udemy Kurs", "Eğitim"),
    ("Borsa İstanbul", "Yatırım & Finans"),
    ("Pizza Hut", "Market & Gıda"),
    ("Akbil Metro", "Ulaşım"),
    ("Spotify Premium", "Eğlence"),
    ("Doğalgaz Faturası", "Faturalar"),
    ("Carrefour Market", "Market & Gıda"),
    ("Bolt Driver", "Ulaşım"),
    ("Biletix Sinema", "Eğlence"),
    ("A101 Market", "Market & Gıda"),
]

def generate_demo_transactions(n: int = 30) -> List[Dict[str, Any]]:
    today = datetime.date.today()
    txns = []
    for i in range(n):
        desc, cat = random.choice(DEMO_DESCRIPTIONS)
        txns.append({
            "date":        str(today - datetime.timedelta(days=i * 2)),
            "description": desc,
            "amount":      round(random.uniform(10, 2500), 2),
            "category":    cat,
        })
    return txns