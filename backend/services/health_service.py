"""
Son 30 günlük veritabanı verisine göre dinamik finansal sağlık skoru (0–100).
"""
from __future__ import annotations

import datetime as dt

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

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


async def compute_financial_health(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    window_days: int = 30,
) -> dict[str, Any]:
    """
    Gelir ve gider dengesine göre skor üretir.
    """
    today = dt.date.today()
    start = today - dt.timedelta(days=window_days)

    income = 0.0
    spending = 0.0
    cursor = db.transactions.find({"user_id": user_id})
    async for doc in cursor:
        d = _parse_date(str(doc.get("date", "")))
        if d is None or d < start:
            continue
        amt = float(doc.get("amount", 0))
        cat = doc.get("category") or ""
        if cat in INCOME_CATEGORIES:
            income += amt
        else:
            spending += amt

    if income <= 0 and spending > 0:
        income = spending * 1.12

    surplus = income - spending
    if income > 0:
        savings_ratio = surplus / income
    else:
        savings_ratio = -1.0 if spending > 0 else 0.0

    # 0–100 skor: tasarruf oranı ve harcama baskısı
    score = 50.0
    score += max(-30, min(40, savings_ratio * 80))
    if spending > income * 1.05:
        score -= 15
    score = max(0, min(100, round(score, 1)))

    label = "Güçlü"
    if score < 45:
        label = "Riskli"
    elif score < 65:
        label = "Geliştirilmeli"
    elif score < 80:
        label = "İyi"

    return {
        "financial_health_score": score,
        "health_label": label,
        "window_days": window_days,
        "period_income": round(income, 2),
        "period_spending": round(spending, 2),
        "surplus": round(surplus, 2),
        "savings_ratio_pct": round(savings_ratio * 100, 2) if income > 0 else None,
    }
