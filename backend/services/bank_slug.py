"""
Banka kimliği slug standardizasyonu — FE/BE ve PDF/manuel kaynaklardaki tutarsızlıkları giderir.
Küçük harf, ASCII, boşluk ve özel karakterler tireye dönüştürülür.
"""
from __future__ import annotations

import re
import unicodedata

from services.bank_registry import list_banks_public

_SLUG_CLEAN = re.compile(r"[^a-z0-9]+")

# Yaygın yanlış/legacy yazımlar → kayıtlı registry id
_BANK_ID_ALIASES: dict[str, str] = {
    "is-bank": "isbank",
    "is-bankasi": "isbank",
    "is_bankasi": "isbank",
    "is_bank": "isbank",
    "isbankasi": "isbank",
    "turkiye-is-bankasi": "isbank",
    "t-is-bankasi": "isbank",
    "isbank": "isbank",
    "yapi-kredi": "yapikredi",
    "yapi_kredi": "yapikredi",
    "yapikredi": "yapikredi",
    "ziraat-bankasi": "ziraat",
    "ziraatbankasi": "ziraat",
    "tc-ziraat-bankasi": "ziraat",
    "garanti-bbva": "garanti",
    "garantibbva": "garanti",
    "ak-bank": "akbank",
    "halk-bank": "halkbank",
    "halkbankasi": "halkbank",
    "diger": "diger",
    "legacy": "legacy",
    "all": "all",
}

_REGISTRY_IDS: frozenset[str] | None = None


def _registry_ids() -> frozenset[str]:
    global _REGISTRY_IDS
    if _REGISTRY_IDS is None:
        _REGISTRY_IDS = frozenset(b["id"] for b in list_banks_public()) | frozenset({"diger", "legacy", "all"})
    return _REGISTRY_IDS


def slugify_bank_label(text: str) -> str:
    """Görünen isim veya serbest metinden banka slug'ı üretir."""
    if not text or not str(text).strip():
        return "manuel-banka"
    s = unicodedata.normalize("NFKD", str(text).strip())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.lower()
    s = _SLUG_CLEAN.sub("-", s)
    s = re.sub(r"-+", "-", s).strip("-")
    if not s:
        return "manuel-banka"
    if len(s) > 48:
        s = s[:48].rstrip("-")
    return s


def normalize_bank_id(raw: str | None) -> str:
    """
    bank_id'yi tek biçime getirir. Registry'de bilinen id'ler korunur;
    diğerleri slugify + alias eşlemesi ile düzeltilir.
    """
    if raw is None:
        return "diger"
    s0 = str(raw).strip()
    if not s0:
        return "diger"
    low = s0.lower()
    if low in _BANK_ID_ALIASES:
        return _BANK_ID_ALIASES[low]
    slug = slugify_bank_label(s0)
    if slug in _BANK_ID_ALIASES:
        return _BANK_ID_ALIASES[slug]
    if slug in _registry_ids():
        return slug
    # Zaten kısa slug (ör. manuel-teb)
    if re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug):
        return slug
    return slugify_bank_label(s0)


def merge_bank_presets_with_profiles(
    presets: list[dict],
    profiles: list[dict],
) -> list[dict]:
    """Registry + kullanıcı profillerindeki ek bankalar (id, name, accent)."""
    out: dict[str, dict] = {b["id"]: dict(b) for b in presets}
    for p in profiles or []:
        if not isinstance(p, dict):
            continue
        bid = normalize_bank_id(p.get("bank_id"))
        if bid in out:
            continue
        label = (p.get("display_name") or p.get("bank_display_name") or bid).strip()
        out[bid] = {"id": bid, "name": label or bid, "accent": "#64748b"}
    return sorted(out.values(), key=lambda x: x["name"].lower())
