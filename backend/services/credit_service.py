"""
Kullanıcı içgörüleri — MongoDB toplamları, sağlık skoru ve otonom tavsiyeler.
"""
from __future__ import annotations

import datetime as dt
from typing import Any

import numpy as np
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.dates import month_key, parse_txn_date, turkish_month_label
from services import advisory_service, health_service

INCOME_CATEGORIES = {"Maaş", "Gelir", "Transfer Girişi"}

AVG_DAYS_PER_MONTH = 30.4375
HISTORY_DAYS = 1100


async def get_user_insights(user_id: ObjectId, db: AsyncIOMotorDatabase) -> dict[str, Any]:
    today = dt.date.today()
    cutoff = today - dt.timedelta(days=HISTORY_DAYS)

    user_doc = await db.users.find_one({"_id": user_id}) or {}
    focus_month: str | None = None
    analytics_period_label = ""
    if user_doc:
        focus_month = user_doc.get("analytics_focus_month")
        fu = user_doc.get("analytics_focus_updated_at")
        if focus_month and fu:
            if isinstance(fu, dt.datetime):
                fu_d = fu.astimezone(dt.timezone.utc).date() if fu.tzinfo else fu.date()
            else:
                fu_d = today
            if (today - fu_d).days > 150:
                focus_month = None
        if focus_month:
            analytics_period_label = f"{turkish_month_label(focus_month)} ekstresi"

    pairs: list[tuple[dict, dt.date]] = []
    async for doc in db.transactions.find({"user_id": user_id}):
        d = parse_txn_date(str(doc.get("date", "")))
        if d is None or d < cutoff:
            continue
        pairs.append((doc, d))

    monthly: dict[str, dict[str, float]] = {}
    cat_totals: dict[str, float] = {}

    for doc, d in pairs:
        mk = month_key(d)
        if mk not in monthly:
            monthly[mk] = {"income": 0.0, "spending": 0.0}
        amt = float(doc.get("amount", 0))
        cat = doc.get("category") or "Diğer"
        cat_totals[cat] = cat_totals.get(cat, 0.0) + amt
        if cat in INCOME_CATEGORIES:
            monthly[mk]["income"] += amt
        else:
            monthly[mk]["spending"] += amt

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

    kpi_pairs: list[tuple[dict, dt.date]] = []
    if focus_month:
        kpi_pairs = [(doc, d) for doc, d in pairs if month_key(d) == focus_month]
        if not kpi_pairs:
            focus_month = None
            analytics_period_label = ""
        else:
            analytics_period_label = f"{turkish_month_label(focus_month)} ekstresi"

    if focus_month:
        tin = sum(
            float(doc["amount"])
            for doc, _ in kpi_pairs
            if (doc.get("category") or "") in INCOME_CATEGORIES
        )
        tsp = sum(
            float(doc["amount"])
            for doc, _ in kpi_pairs
            if (doc.get("category") or "") not in INCOME_CATEGORIES
        )
        monthly_income = round(tin, 2)
        monthly_spending = round(tsp, 2)
    else:
        tin = sum(
            float(doc["amount"])
            for doc, d in pairs
            if (doc.get("category") or "") in INCOME_CATEGORIES
        )
        tsp = sum(
            float(doc["amount"])
            for doc, d in pairs
            if (doc.get("category") or "") not in INCOME_CATEGORIES
        )
        spend_ds = [d for doc, d in pairs if (doc.get("category") or "") not in INCOME_CATEGORIES]
        income_ds = [d for doc, d in pairs if (doc.get("category") or "") in INCOME_CATEGORIES]
        all_ds = sorted(set(spend_ds + income_ds))
        if not all_ds:
            monthly_income = 0.0
            monthly_spending = 0.0
        else:
            span_days = max(1, (all_ds[-1] - all_ds[0]).days + 1)
            eff_months = max(span_days / AVG_DAYS_PER_MONTH, 1.0)
            monthly_income = round(tin / eff_months, 2) if tin else 0.0
            monthly_spending = round(tsp / eff_months, 2) if tsp else 0.0

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

    total_assets_computed = round(monthly_income * 4 + max(0.0, savings_rate) * monthly_income * 0.5, 2)

    manual_raw = user_doc.get("manual_total_assets") if user_doc else None
    manual_total: float | None
    if manual_raw is None:
        manual_total = None
    else:
        try:
            manual_total = float(manual_raw)
        except (TypeError, ValueError):
            manual_total = None
    if manual_total is not None and manual_total < 0:
        manual_total = None
    if manual_total is not None:
        total_assets = round(manual_total, 2)
    else:
        total_assets = total_assets_computed

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
        "total_assets_computed": total_assets_computed,
        "manual_total_assets": manual_total,
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
        "analytics_focus_month": focus_month,
        "analytics_period_label": analytics_period_label,
    }
