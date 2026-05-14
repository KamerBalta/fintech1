"""
Kullanıcı içgörüleri — MongoDB toplamları, sağlık skoru ve otonom tavsiyeler.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

import numpy as np
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from services import advisory_service, health_service

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


def _month_key(d: dt.date) -> str:
    return d.strftime("%Y-%m")


async def get_user_insights(user_id: ObjectId, db: AsyncIOMotorDatabase) -> dict[str, Any]:
    today = dt.date.today()
    window_start = today - dt.timedelta(days=120)

    monthly: dict[str, dict[str, float]] = {}
    total_income = 0.0
    total_spend = 0.0
    cat_totals: dict[str, float] = {}

    async for doc in db.transactions.find({"user_id": user_id}):
        ds = str(doc.get("date", ""))
        d = _parse_date(ds)
        if d is None or d < window_start:
            continue
        mk = _month_key(d)
        if mk not in monthly:
            monthly[mk] = {"income": 0.0, "spending": 0.0}
        amt = float(doc.get("amount", 0))
        cat = doc.get("category") or "Diğer"
        cat_totals[cat] = cat_totals.get(cat, 0.0) + amt
        if cat in INCOME_CATEGORIES:
            monthly[mk]["income"] += amt
            total_income += amt
        else:
            monthly[mk]["spending"] += amt
            total_spend += amt

    sorted_months = sorted(monthly.keys())[-6:]
    forecast: list[dict[str, Any]] = []
    for mk in sorted_months:
        row = monthly[mk]
        forecast.append(
            {
                "month": mk,
                "predicted": round(row["spending"] * 1.03, 2),
                "actual": round(row["spending"], 2),
            }
        )

    n_months = max(1, len(sorted_months))
    monthly_income = round(total_income / n_months, 2) if total_income else 0.0
    monthly_spending = round(total_spend / n_months, 2) if total_spend else 0.0

    if monthly_income <= 0 and monthly_spending > 0:
        monthly_income = round(monthly_spending * 1.15, 2)

    savings_rate = 0.0
    if monthly_income > 0:
        savings_rate = round((monthly_income - monthly_spending) / monthly_income * 100, 2)

    score = 620
    score += int(np.clip(savings_rate * 2.5, -80, 120))
    spend_ratio = monthly_spending / max(monthly_income, 1)
    score += int(np.clip(15 - min(spend_ratio * 40, 40), -40, 40))
    anom = await db.transactions.count_documents({"user_id": user_id, "is_anomaly": True})
    score -= min(40, anom * 3)
    score = int(np.clip(score, 300, 850))

    def _label(s: int) -> str:
        if s >= 750:
            return "Mükemmel"
        if s >= 700:
            return "Çok İyi"
        if s >= 650:
            return "İyi"
        if s >= 600:
            return "Orta"
        return "Zayıf"

    risk = "Düşük"
    if monthly_spending > monthly_income * 0.95:
        risk = "Orta"
    if monthly_spending > monthly_income * 1.05:
        risk = "Yüksek"

    total_assets = round(monthly_income * 4 + max(0.0, savings_rate) * monthly_income * 0.5, 2)

    radar = {
        "Tasarruf Oranı": float(np.clip(55 + savings_rate * 1.2, 20, 98)),
        "Harcama Disiplini": float(np.clip(90 - spend_ratio * 35, 25, 95)),
        "Gelir Çeşitliliği": float(
            np.clip(50 + len([c for c in cat_totals if c in INCOME_CATEGORIES]) * 15, 35, 90)
        ),
        "Anomali Riski": float(np.clip(85 - anom * 5, 20, 90)),
        "Hedef Uyumu": float(
            np.clip(60 + min(3, await db.goals.count_documents({"user_id": user_id})) * 8, 40, 92)
        ),
    }

    health = await health_service.compute_financial_health(db, user_id, 30)
    advisory = await advisory_service.generate_advisory(db, user_id)

    goal_advice: list[str] = []
    goals = await db.goals.find({"user_id": user_id}).to_list(10)
    for g in goals[:2]:
        rem = float(g.get("target_amount", 0)) - float(g.get("saved_amount", 0))
        if rem > 0 and monthly_income > 0:
            months = rem / max(monthly_income * 0.15, 1)
            goal_advice.append(
                f"'{g.get('title')}' için kalan {rem:,.0f} TL; aylık %15 gelir ayırırsanız yaklaşık {months:.0f} ay."
            )

    return {
        "credit_score": score,
        "score_label": _label(score),
        "total_assets": total_assets,
        "monthly_income": monthly_income,
        "monthly_spending": monthly_spending,
        "savings_rate": savings_rate,
        "risk_status": risk,
        "active_alerts": int(await db.transactions.count_documents({"user_id": user_id, "is_fraud": True})),
        "radar_data": radar,
        "spending_forecast": forecast,
        "goal_advice": goal_advice[:8],
        "financial_health_score": health["financial_health_score"],
        "financial_health_label": health["health_label"],
        "advisory_tips": advisory,
    }
