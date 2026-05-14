"""
Asenkron MongoDB (Motor) bağlantısı, koleksiyon erişimi ve initial_data.csv ile seeding.
"""
from __future__ import annotations

import csv
import datetime as dt
from pathlib import Path
from typing import Any, AsyncGenerator

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from config import get_settings

_client: AsyncIOMotorClient | None = None


def _csv_path() -> Path:
    return Path(__file__).resolve().parent / "initial_data.csv"


async def connect_db() -> None:
    global _client
    settings = get_settings()
    _client = AsyncIOMotorClient(settings.MONGO_URI)
    db = _client[settings.MONGO_DB_NAME]
    await _ensure_indexes(db)


async def close_db() -> None:
    global _client
    if _client is not None:
        _client.close()
        _client = None


def get_database() -> AsyncIOMotorDatabase:
    if _client is None:
        raise RuntimeError("MongoDB henüz bağlanmadı (lifespan içinde connect_db çağrılmalı).")
    settings = get_settings()
    return _client[settings.MONGO_DB_NAME]


async def get_db() -> AsyncGenerator[AsyncIOMotorDatabase, None]:
    yield get_database()


async def _ensure_indexes(db: AsyncIOMotorDatabase) -> None:
    await db.users.create_index("email", unique=True)
    await db.transactions.create_index([("user_id", 1), ("date", -1)])
    await db.goals.create_index("user_id")
    await db.bills.create_index("user_id")
    await db.limits.create_index([("user_id", 1), ("category", 1)], unique=True)


def _parse_float(val: str | None) -> float | None:
    if val is None or str(val).strip() == "":
        return None
    try:
        return float(str(val).replace(",", "."))
    except ValueError:
        return None


def _parse_bool(val: str | None) -> bool:
    if val is None or str(val).strip() == "":
        return False
    return str(val).strip().lower() in ("1", "true", "yes", "evet")


async def seed_initial_data_if_empty() -> None:
    """
    Koleksiyonlar boşsa initial_data.csv içeriğini users, transactions, goals ve limits'e aktarır.
    """
    db = get_database()
    user_count = await db.users.count_documents({})
    if user_count > 0:
        return

    csv_path = _csv_path()
    if not csv_path.is_file():
        return

    from services.security import hash_password

    email_to_oid: dict[str, ObjectId] = {}
    now = dt.datetime.now(dt.timezone.utc)

    with csv_path.open(encoding="utf-8-sig", newline="") as f:
        reader = csv.DictReader(f)
        rows = list(reader)

    for row in rows:
        rtype = (row.get("record_type") or "").strip().lower()
        email = (row.get("user_email") or "").strip()
        if not email:
            continue

        if rtype == "user":
            full_name = (row.get("full_name") or "").strip() or email.split("@")[0]
            password = (row.get("password") or "").strip() or "changeme"
            res = await db.users.insert_one(
                {
                    "email": email,
                    "full_name": full_name,
                    "hashed_pw": hash_password(password),
                    "created_at": now,
                }
            )
            email_to_oid[email] = res.inserted_id
        elif rtype == "transaction":
            if email not in email_to_oid:
                u = await db.users.find_one({"email": email})
                if not u:
                    continue
                email_to_oid[email] = u["_id"]
            uid = email_to_oid[email]
            amt = _parse_float(row.get("txn_amount"))
            if amt is None:
                continue
            await db.transactions.insert_one(
                {
                    "user_id": uid,
                    "date": (row.get("txn_date") or "").strip(),
                    "description": (row.get("txn_description") or "").strip(),
                    "amount": abs(amt),
                    "category": (row.get("txn_category") or "Diğer").strip(),
                    "is_recurring": _parse_bool(row.get("txn_is_recurring")),
                    "is_fraud": False,
                    "risk_score": 0.0,
                    "risk_level": "Düşük",
                    "xai_reasons": "[]",
                    "source": "seed",
                    "statement_file": None,
                    "is_anomaly": False,
                    "created_at": now,
                }
            )
        elif rtype == "goal":
            if email not in email_to_oid:
                u = await db.users.find_one({"email": email})
                if not u:
                    continue
                email_to_oid[email] = u["_id"]
            uid = email_to_oid[email]
            tgt = _parse_float(row.get("goal_target")) or 0.0
            if tgt <= 0:
                continue
            saved = _parse_float(row.get("goal_saved")) or 0.0
            await db.goals.insert_one(
                {
                    "user_id": uid,
                    "title": (row.get("goal_title") or "Hedef").strip(),
                    "emoji": (row.get("goal_emoji") or "🎯").strip(),
                    "target_amount": tgt,
                    "saved_amount": max(0.0, saved),
                    "deadline": (row.get("goal_deadline") or "").strip() or None,
                    "category": (row.get("goal_cat") or "Genel").strip(),
                    "created_at": now,
                }
            )
        elif rtype == "limit":
            if email not in email_to_oid:
                u = await db.users.find_one({"email": email})
                if not u:
                    continue
                email_to_oid[email] = u["_id"]
            uid = email_to_oid[email]
            cap = _parse_float(row.get("limit_cap"))
            cat = (row.get("limit_category") or "").strip()
            if cap is None or not cat:
                continue
            try:
                await db.limits.insert_one(
                    {
                        "user_id": uid,
                        "category": cat,
                        "monthly_cap": cap,
                        "created_at": now,
                    }
                )
            except Exception:
                pass


def oid(s: str) -> ObjectId:
    return ObjectId(s)


def user_doc_to_out(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "email": doc["email"],
        "full_name": doc["full_name"],
        "created_at": doc.get("created_at") or dt.datetime.now(dt.timezone.utc),
    }


def txn_doc_to_out(doc: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": str(doc["_id"]),
        "date": doc.get("date", ""),
        "description": doc.get("description", ""),
        "amount": float(doc.get("amount", 0)),
        "category": doc.get("category", "Diğer"),
        "is_recurring": bool(doc.get("is_recurring", False)),
        "is_fraud": bool(doc.get("is_fraud", False)),
        "risk_score": float(doc.get("risk_score", 0.0)),
        "risk_level": doc.get("risk_level", "Düşük"),
        "xai_reasons": doc.get("xai_reasons", "[]"),
        "source": doc.get("source", "manual"),
        "is_anomaly": bool(doc.get("is_anomaly", False)),
        "statement_file": doc.get("statement_file"),
    }
