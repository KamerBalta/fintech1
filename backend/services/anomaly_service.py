"""
İşlem tutarları için Z-Score tabanlı anomali tespiti (scikit-learn StandardScaler).
"""
from __future__ import annotations

from typing import Any

import numpy as np
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase
from sklearn.preprocessing import StandardScaler

INCOME_LIKE = {"Maaş", "Gelir", "Transfer Girişi"}


async def flag_anomalies_for_user(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    z_threshold: float = 2.5,
) -> int:
    """
    Kullanıcının gelir dışı işlemlerinde tutar Z-skoru |z| > eşik olanları Anomali işaretler.
    Güncellenen belge sayısını döndürür.
    """
    cursor = db.transactions.find({"user_id": user_id})
    docs: list[dict[str, Any]] = []
    async for doc in cursor:
        cat = doc.get("category") or ""
        if cat in INCOME_LIKE:
            continue
        docs.append(doc)

    if len(docs) < 3:
        for d in docs:
            await db.transactions.update_one({"_id": d["_id"]}, {"$set": {"is_anomaly": False}})
        return 0

    amounts = np.array([float(d.get("amount", 0)) for d in docs], dtype=float).reshape(-1, 1)
    scaler = StandardScaler()
    z = scaler.fit_transform(amounts).flatten()

    updated = 0
    for d, zi in zip(docs, z, strict=True):
        is_anom = bool(abs(float(zi)) > z_threshold)
        await db.transactions.update_one({"_id": d["_id"]}, {"$set": {"is_anomaly": is_anom}})
        if is_anom:
            updated += 1
    return updated


async def list_anomalies(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    limit: int = 50,
) -> list[dict[str, Any]]:
    cur = (
        db.transactions.find({"user_id": user_id, "is_anomaly": True})
        .sort("date", -1)
        .limit(limit)
    )
    return [t async for t in cur]
