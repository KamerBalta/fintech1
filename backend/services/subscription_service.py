"""
Abonelik tespiti — bilinen marka desenleri + tekrarlayan tutar/tarih analizi.
"""
from __future__ import annotations

import re
import statistics
from collections import defaultdict
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.dates import month_key, parse_txn_date
from services.credit_service import INCOME_CATEGORIES
from services.transaction_dedupe import dedupe_mongo_transaction_docs

# Popüler dijital / abonelik hizmetleri (açıklama eşlemesi)
_SUB_BRANDS = re.compile(
    r"(netflix|spotify|youtube\s*premium|youtube\s*music|google\s*one|google\s*youtube|"
    r"amazon\s*prime|prime\s*video|apple\s*icloud|icloud|apple\s*one|apple\s*music|"
    r"disney\+?|hbo\s*max|exxen|gain|blutv|bein\s*connect|microsoft\s*365|office\s*365|"
    r"dropbox|adobe|nordvpn|expressvpn|playstation|xbox\s*game\s*pass|nintendo\s*online|"
    r"tinder|bumble|headspace|calm\s*app|duolingo|chatgpt|openai|midjourney|notion\s*ai|"
    r"turkcell\s*dijiturk|vodafone\s*pass|turk\s*telekom\s*tv)",
    re.IGNORECASE,
)


def _norm_merchant(desc: str) -> str:
    d = (desc or "").lower().strip()
    d = re.sub(r"\d{2}\.\d{2}\.\d{4}", "", d)
    d = re.sub(r"\d{4}-\d{2}-\d{2}", "", d)
    d = re.sub(r"\d+[,.]?\d*\s*(tl|try|₺)?", "", d, flags=re.I)
    d = re.sub(r"[^a-z0-9ğüşıöç]+", " ", d)
    d = " ".join(d.split())[:56]
    return d


async def refresh_subscription_flags(db: AsyncIOMotorDatabase, user_id: ObjectId) -> int:
    """
    İşlemleri tarar: marka eşleşmesi veya periyodik tekrar → kategori 'Abonelik', is_recurring=True.
    Güncellenen belge sayısını döndürür.
    """
    raw: list[dict[str, Any]] = []
    async for doc in db.transactions.find({"user_id": user_id}):
        raw.append(doc)
    docs = dedupe_mongo_transaction_docs(raw, prefer="newest")

    spend: list[dict[str, Any]] = []
    for d in docs:
        if (d.get("category") or "") in INCOME_CATEGORIES:
            continue
        spend.append(d)

    pattern_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for d in spend:
        desc = str(d.get("description") or "")
        if _SUB_BRANDS.search(desc):
            continue
        k = _norm_merchant(desc)
        if len(k) < 8:
            continue
        pattern_groups[k].append(d)

    pattern_keys: set[str] = set()
    for k, items in pattern_groups.items():
        if len(items) < 3:
            continue
        amounts = [float(x.get("amount", 0)) for x in items]
        mean_a = statistics.mean(amounts)
        if mean_a < 10:
            continue
        rel_spread = (statistics.pstdev(amounts) / mean_a) if len(amounts) > 1 else 0.0
        if rel_spread > 0.14:
            continue
        months: set[str] = set()
        doms: list[int] = []
        for x in items:
            dt = parse_txn_date(str(x.get("date", "")))
            if dt:
                months.add(month_key(dt))
                doms.append(dt.day)
        if len(months) < 2:
            continue
        if doms:
            dom_spread = statistics.pstdev(doms) if len(doms) > 1 else 0.0
            if dom_spread > 4.0:
                continue
        pattern_keys.add(k)

    updated = 0
    for d in spend:
        desc = str(d.get("description") or "")
        cat = d.get("category") or ""
        is_sub = False
        if _SUB_BRANDS.search(desc):
            is_sub = True
        else:
            k = _norm_merchant(desc)
            if k in pattern_keys:
                is_sub = True
        if not is_sub:
            continue
        new_cat = "Abonelik"
        if cat == new_cat and d.get("is_recurring"):
            continue
        await db.transactions.update_one(
            {"_id": d["_id"]},
            {"$set": {"category": new_cat, "is_recurring": True}},
        )
        updated += 1
    return updated


async def subscription_monthly_summary(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    bank_id: str | None = None,
) -> list[dict[str, Any]]:
    """Abonelik kategorisi + is_recurring için satır başına tahmini aylık yük."""
    from services.bank_slug import normalize_bank_id

    q: dict[str, Any] = {"user_id": user_id, "category": "Abonelik"}
    if bank_id:
        q["bank_id"] = normalize_bank_id(bank_id)
    cur = db.transactions.find(q).sort("date", -1).limit(4000)
    rows = [x async for x in cur]
    rows = dedupe_mongo_transaction_docs(rows, prefer="newest")

    by_label: dict[str, list[float]] = defaultdict(list)
    meta: dict[str, dict[str, Any]] = {}
    for r in rows:
        label = str(r.get("description") or "Abonelik")[:72].strip() or "Abonelik"
        by_label[label].append(float(r.get("amount", 0)))
        if label not in meta:
            meta[label] = {
                "label": label,
                "bank_id": r.get("bank_id"),
                "last_date": str(r.get("date", "")),
            }

    out: list[dict[str, Any]] = []
    for label, amts in by_label.items():
        med = float(statistics.median(amts))
        m = meta.get(label, {})
        out.append(
            {
                "label": label,
                "monthly_estimate_try": round(med, 2),
                "sample_count": len(amts),
                "bank_id": normalize_bank_id(str(m.get("bank_id"))) if m.get("bank_id") else None,
                "last_seen": m.get("last_date"),
            }
        )
    out.sort(key=lambda x: -x["monthly_estimate_try"])
    return out
