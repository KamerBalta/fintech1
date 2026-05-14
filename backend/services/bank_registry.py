"""
Kayıtlı bankalar — PDF metin eşlemesi, kurumsal renk ve API çıktıları.
"""
from __future__ import annotations

import re
from typing import Any

_BANKS: list[dict[str, Any]] = [
    {
        "id": "ziraat",
        "name": "Ziraat Bankası",
        "accent": "#e10514",
        "patterns": (
            r"t\.?\s*c\.?\s*ziraat\s+bankas",
            r"ziraat\s+bankas",
            r"türkiye\s+cumhuriyeti\s+ziraat\s+bankas",
        ),
    },
    {
        "id": "isbank",
        "name": "Türkiye İş Bankası",
        "accent": "#003399",
        "patterns": (
            r"türkiye\s+i[sş]\s+bankas",
            r"\bi[sş]\s+bankas[ıi]",
            r"is\s+bank",
        ),
    },
    {
        "id": "garanti",
        "name": "Garanti BBVA",
        "accent": "#00753a",
        "patterns": (
            r"garanti\s+bbva",
            r"garanti\s+bank",
            r"oyak\s+garanti",
        ),
    },
    {
        "id": "akbank",
        "name": "Akbank",
        "accent": "#e2001a",
        "patterns": (r"\bakbank\b",),
    },
    {
        "id": "yapikredi",
        "name": "Yapı Kredi",
        "accent": "#004a98",
        "patterns": (r"yap[ıi]\s*kredi", r"yapi\s*kredi"),
    },
    {
        "id": "halkbank",
        "name": "Halkbank",
        "accent": "#00753c",
        "patterns": (r"halkbank", r"t\.?\s*c\.?\s*halk\s+bankas"),
    },
]


def list_banks_public() -> list[dict[str, Any]]:
    """İstemci için id, name, accent (logo URL yok — istemci emoji/SVG kullanır)."""
    return [{"id": b["id"], "name": b["name"], "accent": b["accent"]} for b in _BANKS]


def detect_bank_from_text(sample: str) -> tuple[str, str]:
    """
    PDF veya ekstre metninin ilk bloklarında banka adı ara.
    Dönüş: (normalize bank_id slug, görünen_ad)
    """
    from services.bank_slug import normalize_bank_id

    blob = (sample or "")[:500].lower()
    blob = " ".join(blob.split())
    for b in _BANKS:
        for pat in b["patterns"]:
            if re.search(pat, blob, re.IGNORECASE):
                return normalize_bank_id(str(b["id"])), str(b["name"])
    return normalize_bank_id("diger"), "Diğer banka"


def bank_accent(bank_id: str) -> str:
    for b in _BANKS:
        if b["id"] == bank_id:
            return str(b["accent"])
    return "#2dd4a3"
