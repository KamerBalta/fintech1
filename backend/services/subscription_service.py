"""
Abonelik tespiti — hizmet/abonelik odaklı (finansal transfer ve borç hariç).
"""
from __future__ import annotations

import datetime as dt
import re
import statistics
from collections import defaultdict
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.dates import month_key, parse_txn_date
from services.credit_service import INCOME_CATEGORIES
from services.transaction_dedupe import dedupe_mongo_transaction_docs

SUBSCRIPTION_CATEGORY = "Abonelik"

# ─── Kesin hariç tutma (açıklama) ─────────────────────────────────────────────
_BLACKLIST_DESC = re.compile(
    r"kredi\s*kart[ıi]?\s*ödem|kart\s*ödem|borç\s*ödem|borçlan|"
    r"nakit\s*avans|taksitli\s*nakit|kredi\s*taksit|kredi\s*borç|"
    r"kart\s*borç|taksit\s*ödem|faiz\s*ödem|"
    r"virman|eft\b|havale|swift\b|"
    r"kendi\s*hesab|hesaplar\s*aras[ıi]|hesap\s*arası|"
    r"para\s*transfer|banka\s*transfer|"
    r"limit\s*ödem|ekstre\s*ödem|otomatik\s*ödem.*kart",
    re.IGNORECASE,
)

# Faturalar sekmesinde kalması gereken kamu/enerji (abonelik değil)
_UTILITY_FATURA = re.compile(
    r"elektrik|enerji|doğalgaz|dogalgaz|su\s*idare|iski|aski|igdaş|igdas|"
    r"enerjisa|aydem|toroslar|başkent\s*edaş",
    re.IGNORECASE,
)

# ─── Kategori: tekrarlansa bile abonelik sayılmaz ───────────────────────────
_BLOCKED_CATEGORY_TOKENS = (
    "transfer",
    "borç",
    "borc",
    "yatırım",
    "yatirim",
    "kredi",
    "finans",
    "bankacılık",
    "bankacilik",
    "nakit",
    "faiz",
    "çek",
    "cek",
    "senet",
)

# ─── Bilinen dijital / operatör servisleri ───────────────────────────────────
_WHITELIST_BRANDS = re.compile(
    r"(netflix|spotify|youtube\s*premium|youtube\s*music|google\s*one|"
    r"amazon\s*prime|prime\s*video|disney\+?|hbo\s*max|exxen|gain\b|blutv|mubi|"
    r"apple\s*icloud|icloud|apple\s*one|apple\s*music|"
    r"microsoft\s*365|office\s*365|adobe|linkedin\s*premium|"
    r"dropbox|nordvpn|expressvpn|playstation|xbox\s*game\s*pass|"
    r"turkcell|vodafone|digiturk|türk\s*telekom|turk\s*telekom|ttnet|"
    r"bein\s*connect|duolingo|chatgpt|openai|notion)",
    re.IGNORECASE,
)

# Hizmet karşılığı abonelik anahtar kelimeleri (fatura tek başına yetmez — utility hariç)
_SUBSCRIPTION_KEYWORDS = re.compile(
    r"\b(abonelik|subscription|üyelik|uyelik|premium\s*üyelik|dijital\s*paket)\b",
    re.IGNORECASE,
)

# Fatura + bilinen operatör/streaming bağlamı
_SUBSCRIPTION_FATURA_SERVICE = re.compile(
    r"(turkcell|vodafone|digiturk|netflix|spotify|apple|google\s*one|"
    r"microsoft|amazon\s*prime|disney|exxen|blutv|bein)",
    re.IGNORECASE,
)


def _text_blob(doc: dict[str, Any]) -> str:
    desc = str(doc.get("description") or "")
    raw = str(doc.get("raw_description") or "")
    return f"{desc} {raw}".strip()


def is_blacklisted_description(text: str) -> bool:
    return bool(_BLACKLIST_DESC.search(text or ""))


def category_blocks_subscription(category: str | None) -> bool:
    c = (category or "").strip().lower()
    if not c:
        return False
    if c in INCOME_CATEGORIES:
        return True
    return any(tok in c for tok in _BLOCKED_CATEGORY_TOKENS)


def is_whitelist_service(text: str) -> bool:
    if _UTILITY_FATURA.search(text) and not _WHITELIST_BRANDS.search(text):
        return False
    if _WHITELIST_BRANDS.search(text):
        return True
    if _SUBSCRIPTION_KEYWORDS.search(text):
        return True
    if re.search(r"\bfatura\b", text, re.I) and _SUBSCRIPTION_FATURA_SERVICE.search(text):
        return True
    return False


def _suggest_category_after_unmark(text: str, old_category: str) -> str:
    if is_blacklisted_description(text):
        low = text.lower()
        if any(
            x in low
            for x in (
                "virman",
                "eft",
                "havale",
                "transfer",
                "kendi hesab",
                "hesaplar aras",
            )
        ):
            return "Transfer"
        if any(
            x in low
            for x in (
                "kredi",
                "borç",
                "borc",
                "nakit avans",
                "taksit",
                "kart ödem",
                "kart odem",
            )
        ):
            return "Borç"
    if old_category and old_category != SUBSCRIPTION_CATEGORY:
        return old_category
    return "Diğer"


def merchant_key_from_label(label: str) -> str:
    return _norm_merchant(label) or "unknown"


def is_subscription(doc: dict[str, Any]) -> bool:
    """
    Yalnızca hizmet karşılığı, düzenli dijital/operatör abonelikleri.
    Finansal transfer, borç, yatırım ve kredi kalemleri hariç.
    """
    if doc.get("subscription_dismissed"):
        return False
    if (doc.get("category") or "") in INCOME_CATEGORIES:
        return False

    blob = _text_blob(doc)
    cat = str(doc.get("category") or "")

    if category_blocks_subscription(cat):
        return False
    if is_blacklisted_description(blob):
        return False
    if _UTILITY_FATURA.search(blob) and not _WHITELIST_BRANDS.search(blob):
        return False

    return is_whitelist_service(blob)


def _build_pattern_keys(spend: list[dict[str, Any]]) -> set[str]:
    """Periyodik tekrar — yalnızca whitelist sinyali olan gruplar."""
    pattern_groups: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for d in spend:
        blob = _text_blob(d)
        if not is_whitelist_service(blob):
            continue
        if is_blacklisted_description(blob) or category_blocks_subscription(d.get("category")):
            continue
        k = _norm_merchant(blob)
        if len(k) < 6:
            continue
        pattern_groups[k].append(d)

    keys: set[str] = set()
    for k, items in pattern_groups.items():
        if len(items) < 3:
            continue
        amounts = [float(x.get("amount", 0)) for x in items]
        mean_a = statistics.mean(amounts)
        if mean_a < 15:
            continue
        rel_spread = (statistics.pstdev(amounts) / mean_a) if len(amounts) > 1 else 0.0
        if rel_spread > 0.18:
            continue
        months: set[str] = set()
        for x in items:
            dt = parse_txn_date(str(x.get("date", "")))
            if dt:
                months.add(month_key(dt))
        if len(months) < 2:
            continue
        keys.add(k)
    return keys


def _norm_merchant(desc: str) -> str:
    d = (desc or "").lower().strip()
    d = re.sub(r"\d{2}\.\d{2}\.\d{4}", "", d)
    d = re.sub(r"\d{4}-\d{2}-\d{2}", "", d)
    d = re.sub(r"\d+[,.]?\d*\s*(tl|try|₺)?", "", d, flags=re.I)
    d = re.sub(r"[^a-z0-9ğüşıöç]+", " ", d)
    return " ".join(d.split())[:56]


def is_subscription_with_patterns(doc: dict[str, Any], pattern_keys: set[str]) -> bool:
    if is_subscription(doc):
        return True
    blob = _text_blob(doc)
    if not is_whitelist_service(blob):
        return False
    k = _norm_merchant(blob)
    return k in pattern_keys


async def refresh_subscription_flags(db: AsyncIOMotorDatabase, user_id: ObjectId) -> int:
    """
    Tüm harcama işlemlerini yeniden sınıflandırır:
    - Yanlış Abonelik / is_recurring işaretlerini temizler
    - Yalnızca gerçek abonelikleri işaretler
    """
    raw: list[dict[str, Any]] = []
    async for doc in db.transactions.find({"user_id": user_id}):
        raw.append(doc)
    docs = dedupe_mongo_transaction_docs(raw, prefer="newest")

    spend: list[dict[str, Any]] = []
    for d in docs:
        if (d.get("category") or "") in INCOME_CATEGORIES:
            if d.get("is_recurring") or (d.get("category") or "") == SUBSCRIPTION_CATEGORY:
                await db.transactions.update_one(
                    {"_id": d["_id"]},
                    {"$set": {"is_recurring": False}},
                )
            continue
        spend.append(d)

    pattern_keys = _build_pattern_keys(spend)
    updated = 0

    for d in spend:
        blob = _text_blob(d)
        should = is_subscription_with_patterns(d, pattern_keys)
        cur_cat = str(d.get("category") or "Diğer")
        was_recurring = bool(d.get("is_recurring"))
        was_sub_cat = cur_cat == SUBSCRIPTION_CATEGORY

        if should:
            patch: dict[str, Any] = {"category": SUBSCRIPTION_CATEGORY, "is_recurring": True}
            if cur_cat != SUBSCRIPTION_CATEGORY or not was_recurring:
                await db.transactions.update_one({"_id": d["_id"]}, {"$set": patch})
                updated += 1
        else:
            new_cat = cur_cat
            if was_sub_cat:
                new_cat = _suggest_category_after_unmark(blob, cur_cat)
            if was_recurring or was_sub_cat or new_cat != cur_cat:
                patch: dict[str, Any] = {"is_recurring": False}
                if new_cat != cur_cat:
                    patch["category"] = new_cat
                await db.transactions.update_one({"_id": d["_id"]}, {"$set": patch})
                updated += 1

    return updated


def _detect_subscriptions_from_transactions(
    db_rows: list[dict[str, Any]],
) -> list[dict[str, Any]]:
    """İşlemlerden abonelik grupları (id yok)."""
    filtered = [r for r in db_rows if is_subscription(r)]
    by_label: dict[str, list[float]] = defaultdict(list)
    meta: dict[str, dict[str, Any]] = {}
    for r in filtered:
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
                "merchant_key": merchant_key_from_label(label),
                "label": label,
                "monthly_estimate_try": round(med, 2),
                "sample_count": len(amts),
                "bank_id": m.get("bank_id"),
                "last_seen": m.get("last_date"),
            }
        )
    out.sort(key=lambda x: -x["monthly_estimate_try"])
    return out


async def _load_transaction_subscriptions(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    bank_id: str | None,
) -> list[dict[str, Any]]:
    from services.bank_slug import normalize_bank_id

    q: dict[str, Any] = {
        "user_id": user_id,
        "category": SUBSCRIPTION_CATEGORY,
        "is_recurring": True,
        "subscription_dismissed": {"$ne": True},
    }
    if bank_id:
        q["bank_id"] = normalize_bank_id(bank_id)
    cur = db.transactions.find(q).sort("date", -1).limit(4000)
    rows = [x async for x in cur]
    return dedupe_mongo_transaction_docs(rows, prefer="newest")


async def sync_subscription_entries(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    bank_id: str | None = None,
) -> None:
    """Tespit edilen abonelikleri subscriptions koleksiyonuna yazar; silinmiş olanları yeniden açmaz."""
    from services.bank_slug import normalize_bank_id

    rows = await _load_transaction_subscriptions(db, user_id, bank_id)
    detected = _detect_subscriptions_from_transactions(rows)
    now = dt.datetime.now(dt.timezone.utc)
    seen_keys: set[str] = set()

    for row in detected:
        mk = row["merchant_key"]
        seen_keys.add(mk)
        filt: dict[str, Any] = {"user_id": user_id, "merchant_key": mk}
        if bank_id:
            filt["bank_id"] = normalize_bank_id(bank_id)
        else:
            filt["bank_id"] = normalize_bank_id(str(row.get("bank_id") or "all"))

        existing = await db.subscriptions.find_one(filt)
        if existing and existing.get("is_active") is False:
            continue

        doc = {
            "user_id": user_id,
            "merchant_key": mk,
            "label": row["label"],
            "monthly_estimate_try": row["monthly_estimate_try"],
            "sample_count": row["sample_count"],
            "bank_id": filt["bank_id"],
            "last_seen": row.get("last_seen"),
            "is_active": True,
            "updated_at": now,
        }
        if existing:
            await db.subscriptions.update_one({"_id": existing["_id"]}, {"$set": doc})
        else:
            doc["created_at"] = now
            await db.subscriptions.insert_one(doc)


async def list_active_subscriptions(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    bank_id: str | None = None,
) -> list[dict[str, Any]]:
    from services.bank_slug import normalize_bank_id

    await sync_subscription_entries(db, user_id, bank_id)
    q: dict[str, Any] = {"user_id": user_id, "is_active": True}
    if bank_id:
        q["bank_id"] = normalize_bank_id(bank_id)
    cur = db.subscriptions.find(q).sort("monthly_estimate_try", -1)
    out: list[dict[str, Any]] = []
    async for doc in cur:
        row = dict(doc)
        if not is_whitelist_service(row.get("label", "")) and not is_whitelist_service(
            _text_blob({"description": row.get("label", "")})
        ):
            continue
        if is_blacklisted_description(str(row.get("label", ""))):
            continue
        out.append(
            {
                "id": str(doc["_id"]),
                "label": doc.get("label", ""),
                "monthly_estimate_try": float(doc.get("monthly_estimate_try", 0)),
                "sample_count": int(doc.get("sample_count", 0)),
                "bank_id": doc.get("bank_id"),
                "last_seen": doc.get("last_seen"),
                "is_active": True,
            }
        )
    return out


async def deactivate_subscription(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    subscription_id: ObjectId,
) -> bool:
    doc = await db.subscriptions.find_one({"_id": subscription_id, "user_id": user_id})
    if not doc:
        return False

    now = dt.datetime.now(dt.timezone.utc)
    await db.subscriptions.update_one(
        {"_id": subscription_id},
        {"$set": {"is_active": False, "updated_at": now}},
    )

    mk = doc.get("merchant_key") or merchant_key_from_label(str(doc.get("label", "")))
    label = str(doc.get("label", ""))

    async for txn in db.transactions.find({"user_id": user_id, "category": SUBSCRIPTION_CATEGORY}):
        blob = _text_blob(txn)
        if merchant_key_from_label(str(txn.get("description", ""))) == mk or (
            label and label.lower() in blob.lower()
        ):
            new_cat = _suggest_category_after_unmark(blob, str(txn.get("category") or ""))
            await db.transactions.update_one(
                {"_id": txn["_id"]},
                {
                    "$set": {
                        "is_recurring": False,
                        "subscription_dismissed": True,
                        "category": new_cat,
                    }
                },
            )
    return True


async def get_dismissed_subscription_labels(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
) -> list[dict[str, str]]:
    cur = db.subscriptions.find({"user_id": user_id, "is_active": False})
    out: list[dict[str, str]] = []
    async for d in cur:
        out.append(
            {
                "label": str(d.get("label", "")),
                "merchant_key": str(d.get("merchant_key", "")),
            }
        )
    return out


async def subscription_monthly_summary(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    bank_id: str | None = None,
) -> list[dict[str, Any]]:
    """Aktif abonelik kayıtları (subscriptions koleksiyonu)."""
    return await list_active_subscriptions(db, user_id, bank_id)
