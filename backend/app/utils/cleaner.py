"""
Ham ekstre metinlerini (ör. MIGROS-TIRE-IZMIR) standart tüccar adına ve kategoriye dönüştürür.
fuzzywuzzy ile bilinen isimlere yakın eşleştirme yapılır; ardından kural tabanlı kategori atanır.
"""
from __future__ import annotations

import re
from typing import Tuple

from fuzzywuzzy import process

# Kanonik isim -> eşleştirilecek ham anahtar kelimeler / kısaltmalar
MERCHANT_ALIASES: dict[str, tuple[str, ...]] = {
    "Migros": ("migros", "MGM", "MIGROS"),
    "BİM": ("bim", "BIM A", "BİM"),
    "A101": ("a101", "A-101"),
    "CarrefourSA": ("carrefour", "CARREFOUR", "SA IZMIR"),
    "Shell": ("shell", "SHELL"),
    "Netflix": ("netflix", "NFLX"),
    "Spotify": ("spotify", "SPOTIFY"),
    "Disney+": ("disney", "DISNEY"),
    "Türk Telekom": ("turk telekom", "TURK TELEKOM", "TTNET"),
    "Enerjisa": ("enerjisa", "ENERJI", "elektrik"),
    "Trendyol": ("trendyol", "TY.COM"),
    "Yemeksepeti": ("yemeksepeti", "YEMEKSEPET"),
    "Getir": ("getir", "GETIR"),
    "Uber": ("uber", "UBER TRIP"),
    "Maaş": ("maas", "MAAS", "salary", "PAYROLL", "ACME"),
}

# (regex_pattern, category, is_recurring)
_CATEGORY_RULES: list[tuple[str, str, bool]] = [
    (r"türk telekom|ttnet|turkcell|vodafone|türksat|internet|gsm", "Faturalar", True),
    (r"enerjisa|enerji|elektrik|aydem|edaş", "Faturalar", True),
    (r"igdaş|doğalgaz|gaz", "Faturalar", True),
    (r"su .*(idaresi|genel)|iski|aski", "Faturalar", True),
    (r"sigorta|sgk|bağ-kur", "Sigorta", True),
    (r"netflix|disney\+?|exxen|blutv|gain\b", "Abonelik", True),
    (r"spotify|apple music|youtube premium|deezer", "Abonelik", True),
    (r"amazon prime|microsoft 365|adobe", "Abonelik", True),
    (r"kredi taksit|kart borcu|mortgage", "Kredi", True),
    (r"migros|carrefour|bim\b|a101|şok market|metro", "Market & Gıda", False),
    (r"getir|yemeksepeti|trendyol yemek|pizza|burger", "Yemek", False),
    (r"uber|bolt\b|taksi|otopark|hgs|ogs|shell|opet|bp\b|total\b|benzin", "Ulaşım", False),
    (r"akbil|metro|metrobüs|marmaray|istanbul kart", "Ulaşım", False),
    (r"trendyol|hepsiburada|amazon|n11", "Alışveriş", False),
    (r"zara|h&m|lcw|koton|defacto|mavi", "Alışveriş", False),
    (r"eczane|hastane|klinik|sağlık", "Sağlık", False),
    (r"sinema|biletix|konser|fitness", "Eğlence", False),
    (r"maas|maaş|salary|payroll|bordro|net ücret|ücret yatırıldı", "Maaş", False),
]


def _flatten_alias_choices() -> list[str]:
    choices: list[str] = []
    for keys in MERCHANT_ALIASES.values():
        choices.extend(keys)
    return choices


_CHOICES = _flatten_alias_choices()
_CANON_BY_SUBSTRING = {sub.upper(): canon for canon, subs in MERCHANT_ALIASES.items() for sub in subs}


def normalize_merchant(raw_description: str, min_score: int = 72) -> str:
    """
    Ham açıklamayı bilinen tüccar adına yaklaştırır (örn. 'MIGROS-TIRE-IZMIR' -> 'Migros').
    """
    if not raw_description or not raw_description.strip():
        return "Bilinmeyen"
    upper = raw_description.upper()
    for needle, canon in _CANON_BY_SUBSTRING.items():
        if needle.upper() in upper:
            return canon
    match = process.extractOne(raw_description, _CHOICES, score_cutoff=min_score)
    if match:
        best_sub = match[0]
        for canon, subs in MERCHANT_ALIASES.items():
            if best_sub in subs:
                return canon
    cleaned = re.sub(r"[\d\*#\-_/.,]+", " ", raw_description)
    cleaned = re.sub(r"\s+", " ", cleaned).strip()
    return cleaned[:1].upper() + cleaned[1:80] if cleaned else "Diğer"


def categorize_from_text(description: str, normalized_name: str) -> tuple[str, bool]:
    """Açıklama ve normalize isim üzerinden kategori + tekrarlayan gider bilgisi."""
    blob = f"{description} {normalized_name}".lower()
    for pattern, category, recurring in _CATEGORY_RULES:
        if re.search(pattern, blob, re.IGNORECASE):
            return category, recurring
    return "Diğer", False


def clean_statement_row(date: str, raw_description: str, amount: float) -> dict:
    """
    PDF satırı için tek giriş noktası: normalize + kategori.
    """
    name = normalize_merchant(raw_description)
    category, is_recurring = categorize_from_text(raw_description, name)
    return {
        "date": date,
        "description": name,
        "raw_description": raw_description.strip(),
        "amount": abs(float(amount)),
        "category": category,
        "is_recurring": is_recurring,
        "source": "pdf",
    }
