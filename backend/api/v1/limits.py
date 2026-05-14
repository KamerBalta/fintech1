"""
Kategori limitleri — CRUD ve son 30 günlük harcama analizi (banka filtresi).
"""
from __future__ import annotations

import datetime as dt
from typing import Any

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from database import get_db
from schemas.schemas import LimitCreate, LimitOut, LimitUpdate
from services.security import MongoUser, get_current_user
from services.transaction_dedupe import dedupe_mongo_transaction_docs
from services.bank_slug import normalize_bank_id


def _limits_bank_filter(bank_id: str | None) -> str | None:
    """
    None / boş → filtre yok (tüm limitler).
    'all' → yalnızca bank_id=all kayıtları.
    Diğer → normalize edilmiş banka slug'ı.
    """
    if bank_id is None:
        return None
    s = str(bank_id).strip()
    if not s:
        return None
    if s.lower() == "all":
        return "all"
    return normalize_bank_id(s)

router = APIRouter(tags=["Limits"])

INCOME_CATEGORIES = {"Maaş", "Gelir", "Transfer Girişi"}


def _parse_date(s: str) -> dt.date | None:
    if not s:
        return None
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return dt.datetime.strptime(s.strip()[:10], fmt).date()
        except ValueError:
            continue
    return None


def _bank_match(doc: dict, bank_id: str | None) -> bool:
    if not bank_id:
        return True
    return normalize_bank_id(str(doc.get("bank_id") or "legacy")) == normalize_bank_id(str(bank_id))


async def _category_spent_30d(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    category: str,
    bank_id: str | None = None,
    window_days: int = 30,
) -> float:
    start = dt.date.today() - dt.timedelta(days=window_days)
    total = 0.0
    q: dict[str, Any] = {"user_id": user_id, "category": category}
    if bank_id:
        q["bank_id"] = bank_id
    rows = await db.transactions.find(q).to_list(2000)
    for t in dedupe_mongo_transaction_docs(rows, prefer="newest"):
        if not _bank_match(t, bank_id):
            continue
        if (t.get("category") or "") in INCOME_CATEGORIES:
            continue
        d = _parse_date(str(t.get("date", "")))
        if d is None or d < start:
            continue
        total += float(t.get("amount", 0))
    return round(total, 2)


def _usage_row(spent: float, cap: float) -> dict[str, Any]:
    if cap <= 0:
        pct = 0.0
        status = "ok"
    else:
        pct = round(spent / cap * 100, 2)
        if pct >= 100:
            status = "critical"
        elif pct >= 80:
            status = "warning"
        else:
            status = "ok"
    return {"spent": spent, "limit": cap, "pct": pct, "status": status}


@router.get("/", response_model=list[LimitOut])
async def list_limits(
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
    bank_id: str | None = Query(None, description="'all' veya banka id"),
):
    q: dict[str, Any] = {"user_id": user.id}
    lb = _limits_bank_filter(bank_id)
    if lb is not None:
        q["bank_id"] = lb
    cur = db.limits.find(q).sort("category", 1)
    out: list[LimitOut] = []
    async for doc in cur:
        out.append(
            LimitOut(
                id=str(doc["_id"]),
                category=doc["category"],
                monthly_cap=float(doc.get("monthly_cap", 0)),
                bank_id=str(doc.get("bank_id") or "all"),
            )
        )
    return out


@router.get("/analysis")
async def limits_analysis(
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
    window_days: int = 30,
    bank_id: str | None = Query(None, description="Tek banka için limit analizi"),
) -> dict[str, Any]:
    lb = _limits_bank_filter(bank_id)
    q: dict[str, Any] = {"user_id": user.id}
    if lb is not None:
        q["bank_id"] = lb
    limits = await db.limits.find(q).sort("category", 1).to_list(200)
    usage: dict[str, Any] = {}
    alerts: list[dict[str, Any]] = []
    violations = 0

    spend_bank = None if (lb is None or lb == "all") else lb

    for lim in limits:
        cat = lim.get("category") or ""
        cap = float(lim.get("monthly_cap", 0))
        spent = await _category_spent_30d(db, user.id, cat, spend_bank, window_days)
        row = _usage_row(spent, cap)
        usage[cat] = row
        if row["status"] == "critical":
            violations += 1
            alerts.append(
                {
                    "type": "critical",
                    "category": cat,
                    "message": f"🚨 {cat} limiti aşıldı! {spent:,.0f} ₺ / {cap:,.0f} ₺ (%{row['pct']:.1f})",
                    "pct": row["pct"],
                }
            )
        elif row["status"] == "warning":
            alerts.append(
                {
                    "type": "warning",
                    "category": cat,
                    "message": f"⚠️ {cat} limitine yaklaşıyorsunuz. %{row['pct']:.1f} kullanıldı.",
                    "pct": row["pct"],
                }
            )

    alerts.sort(key=lambda a: 0 if a["type"] == "critical" else 1)
    return {"usage": usage, "alerts": alerts, "violations": violations}


@router.post("/", response_model=LimitOut, status_code=201)
async def create_or_replace_limit(
    payload: LimitCreate,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    from datetime import datetime, timezone

    raw = (payload.bank_id or "all").strip() or "all"
    bid = "all" if raw.lower() == "all" else normalize_bank_id(raw)
    existing = await db.limits.find_one({"user_id": user.id, "category": payload.category, "bank_id": bid})
    now = datetime.now(timezone.utc)
    if existing:
        await db.limits.update_one(
            {"_id": existing["_id"]},
            {"$set": {"monthly_cap": float(payload.monthly_cap)}},
        )
        doc = await db.limits.find_one({"_id": existing["_id"]})
    else:
        ins = await db.limits.insert_one(
            {
                "user_id": user.id,
                "category": payload.category,
                "monthly_cap": float(payload.monthly_cap),
                "bank_id": bid,
                "created_at": now,
            }
        )
        doc = await db.limits.find_one({"_id": ins.inserted_id})
    return LimitOut(
        id=str(doc["_id"]),
        category=doc["category"],
        monthly_cap=float(doc["monthly_cap"]),
        bank_id=str(doc.get("bank_id") or "all"),
    )


@router.patch("/{limit_id}", response_model=LimitOut)
async def update_limit(
    limit_id: str,
    payload: LimitUpdate,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    try:
        oid = ObjectId(limit_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Limit bulunamadı")
    doc = await db.limits.find_one({"_id": oid, "user_id": user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Limit bulunamadı")
    patch = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if "monthly_cap" in patch:
        patch["monthly_cap"] = float(patch["monthly_cap"])
    if patch:
        await db.limits.update_one({"_id": oid}, {"$set": patch})
    doc = await db.limits.find_one({"_id": oid})
    return LimitOut(
        id=str(doc["_id"]),
        category=doc["category"],
        monthly_cap=float(doc["monthly_cap"]),
        bank_id=str(doc.get("bank_id") or "all"),
    )


@router.delete("/{limit_id}", status_code=204)
async def delete_limit(
    limit_id: str,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    try:
        oid = ObjectId(limit_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Limit bulunamadı")
    res = await db.limits.delete_one({"_id": oid, "user_id": user.id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Limit bulunamadı")
