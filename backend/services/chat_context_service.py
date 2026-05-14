"""
AI Finansal Asistan için Motor (async MongoDB) üzerinden zengin bağlam üretimi.
İşlemler, limitler, hedefler, ekstreler ve harcama hızı — LLM sistem mesajına gömülür.
"""
from __future__ import annotations

import calendar
import datetime as dt
import json
import re
from typing import Any

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.utils.dates import month_key, parse_txn_date
from services import anomaly_service, credit_service, market_service
from services.bank_slug import normalize_bank_id
from services.transaction_dedupe import dedupe_mongo_transaction_docs

INCOME_CATEGORIES = credit_service.INCOME_CATEGORIES

_RECURRING_HINT = re.compile(
    r"abonelik|subscription|netflix|spotify|youtube|apple|google\s*one|fatura|dijital",
    re.I,
)


def _bank_ok(doc: dict, bank_id: str | None) -> bool:
    if not bank_id:
        return True
    return normalize_bank_id(str(doc.get("bank_id") or "legacy")) == normalize_bank_id(str(bank_id))


def _is_spending(doc: dict) -> bool:
    return (doc.get("category") or "") not in INCOME_CATEGORIES


def _looks_recurring(doc: dict) -> bool:
    if bool(doc.get("is_recurring")):
        return True
    cat = (doc.get("category") or "") + " " + (doc.get("description") or "")
    return bool(_RECURRING_HINT.search(cat))


def _goal_currency_hint(title: str, category: str) -> str | None:
    blob = f"{title} {category}".lower()
    if any(x in blob for x in ("usd", "dolar", "dollar", "$")):
        return "USD"
    if any(x in blob for x in ("eur", "euro", "€")):
        return "EUR"
    if any(x in blob for x in ("gbp", "sterlin", "£")):
        return "GBP"
    if any(x in blob for x in ("altın", "altin", "xau", "gram altın", "ons altın")):
        return "XAU"
    return None


async def build_financial_assistant_context(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
    bank_id: str | None = None,
) -> dict[str, Any]:
    """Kullanıcıya özel sayısal özet + proaktif uyarılar."""
    if bank_id:
        bank_id = normalize_bank_id(bank_id)

    await anomaly_service.flag_anomalies_for_user(db, user_id)

    raw_docs: list[dict[str, Any]] = []
    async for doc in db.transactions.find({"user_id": user_id}):
        raw_docs.append(doc)
    docs = dedupe_mongo_transaction_docs(raw_docs, prefer="newest")
    if bank_id:
        docs = [d for d in docs if _bank_ok(d, bank_id)]

    today = dt.date.today()
    mk_now = month_key(today)
    first_this = today.replace(day=1)
    if first_this.month == 1:
        first_prev = first_this.replace(year=first_this.year - 1, month=12)
    else:
        first_prev = first_this.replace(month=first_this.month - 1)
    mk_prev = month_key(first_prev)
    dim = calendar.monthrange(today.year, today.month)[1]
    day_i = max(1, today.day)

    pairs: list[tuple[dict[str, Any], dt.date]] = []
    for doc in docs:
        d = parse_txn_date(str(doc.get("date", "")))
        if d is None:
            continue
        pairs.append((doc, d))

    def spend_in_month(mk: str) -> tuple[float, dict[str, float], list[tuple[float, str, str, str]]]:
        by_cat: dict[str, float] = {}
        total = 0.0
        txns: list[tuple[float, str, str, str]] = []
        for doc, d in pairs:
            if month_key(d) != mk or not _is_spending(doc):
                continue
            amt = float(doc.get("amount", 0))
            cat = doc.get("category") or "Diğer"
            by_cat[cat] = by_cat.get(cat, 0.0) + amt
            total += amt
            txns.append((amt, str(doc.get("description", ""))[:80], cat, d.isoformat()))
        txns.sort(key=lambda x: x[0], reverse=True)
        return total, by_cat, txns

    tot_m, by_m, tx_m = spend_in_month(mk_now)
    tot_p, by_p, _ = spend_in_month(mk_prev)

    top5 = [{"amount": round(a, 2), "description": d, "category": c, "date": di} for a, d, c, di in tx_m[:5]]
    highest = tx_m[0] if tx_m else None

    mom_pct: dict[str, float] = {}
    for cat, v in by_m.items():
        prev = by_p.get(cat, 0.0)
        if prev > 1:
            mom_pct[cat] = round((v - prev) / prev * 100, 1)
        elif v > 0 and prev <= 0:
            mom_pct[cat] = 100.0

    # Ay içi (takvim ayı) — bugüne kadar
    mtd_by_cat: dict[str, float] = {}
    mtd_total = 0.0
    for doc, d in pairs:
        if d.year != today.year or d.month != today.month or not _is_spending(doc):
            continue
        amt = float(doc.get("amount", 0))
        cat = doc.get("category") or "Diğer"
        mtd_by_cat[cat] = mtd_by_cat.get(cat, 0.0) + amt
        mtd_total += amt

    projected_month = round(mtd_total / day_i * dim, 2) if mtd_total > 0 else 0.0

    # Son 7 gün / önceki 7 gün — tekrarlayan harcama
    def window_sum(days_end: int, days_start: int) -> float:
        end = today - dt.timedelta(days=days_end)
        start = today - dt.timedelta(days=days_start)
        s = 0.0
        for doc, d in pairs:
            if not _is_spending(doc) or not _looks_recurring(doc):
                continue
            if start <= d <= end:
                s += float(doc.get("amount", 0))
        return round(s, 2)

    rec_last7 = window_sum(0, 6)
    rec_prev7 = window_sum(7, 13)
    rec_pct = 0.0
    if rec_prev7 > 1:
        rec_pct = round((rec_last7 - rec_prev7) / rec_prev7 * 100, 1)

    # Haftalık özet (son 7 gün) tüm harcama
    wk_by_cat: dict[str, float] = {}
    wk_total = 0.0
    start_w = today - dt.timedelta(days=6)
    for doc, d in pairs:
        if d < start_w or d > today or not _is_spending(doc):
            continue
        amt = float(doc.get("amount", 0))
        c = doc.get("category") or "Diğer"
        wk_by_cat[c] = wk_by_cat.get(c, 0.0) + amt
        wk_total += amt

    # Limitler (takvim ayı MTD / tahmin)
    lim_q: dict[str, Any] = {"user_id": user_id}
    if bank_id:
        lim_q["bank_id"] = bank_id
    limits = await db.limits.find(lim_q).sort("category", 1).to_list(200)
    limits_rows: list[dict[str, Any]] = []
    for lim in limits:
        cat = lim.get("category") or ""
        cap = float(lim.get("monthly_cap", 0))
        spent = mtd_by_cat.get(cat, 0.0)
        prj = round(spent / day_i * dim, 2) if spent > 0 else 0.0
        pct = round(spent / cap * 100, 1) if cap > 0 else 0.0
        st = "ok"
        if cap > 0 and spent >= cap:
            st = "critical"
        elif cap > 0 and pct >= 80:
            st = "warning"
        limits_rows.append(
            {
                "category": cat,
                "monthly_cap": cap,
                "spent_mtd": round(spent, 2),
                "pct_of_cap_mtd": pct,
                "projected_month_spend": prj,
                "projected_over_cap": bool(cap > 0 and prj > cap * 1.02),
                "status": st,
            }
        )

    insights = await credit_service.get_user_insights(user_id, db, bank_id=bank_id)
    mi = float(insights.get("monthly_income") or 0)
    ms = float(insights.get("monthly_spending") or 0)
    surplus = max(0.0, mi - ms)

    proactive: list[str] = []
    if mi > 0 and projected_month > mi * 0.98 and projected_month > mtd_total:
        proactive.append(
            f"Bu ayın {day_i}. günündesin; şu ana kadar harcama {mtd_total:,.0f} TL. "
            f"Bu hızla ay sonu tahmini ~{projected_month:,.0f} TL; tahmini aylık gelirine çok yaklaşıyor veya üzerinde."
        )
    for row in limits_rows:
        if row["projected_over_cap"] and row["monthly_cap"] > 0:
            proactive.append(
                f"'{row['category']}' kategorisinde ay sonu tahmini ~{row['projected_month_spend']:,.0f} TL "
                f"(limit {row['monthly_cap']:,.0f} TL). Bu hızla limit yetmeyebilir."
            )
    if rec_prev7 > 5 and rec_pct >= 15:
        proactive.append(
            f"Tekrarlayan / abonelik benzeri harcamalar bu son 7 günde önceki 7 güne göre yaklaşık %{rec_pct} değişti "
            f"({rec_prev7:,.0f} TL → {rec_last7:,.0f} TL)."
        )

    stmts = (
        await db.statement_uploads.find({"user_id": user_id})
        .sort("created_at", -1)
        .limit(5)
        .to_list(5)
    )
    recent_statements = []
    for s in stmts:
        ca = s.get("created_at")
        if hasattr(ca, "isoformat"):
            ca_s = ca.isoformat()[:19]
        else:
            ca_s = str(ca)[:19]
        recent_statements.append(
            {
                "filename": s.get("original_filename") or "?",
                "bank_id": s.get("bank_id"),
                "uploaded_at": ca_s,
                "transactions": s.get("transaction_count"),
            }
        )

    goals_raw = await db.goals.find({"user_id": user_id}).sort("created_at", -1).to_list(20)
    goals_out: list[dict[str, Any]] = []
    for g in goals_raw:
        tgt = float(g.get("target_amount", 0))
        sav = float(g.get("saved_amount", 0))
        rem = max(0.0, tgt - sav)
        hint = _goal_currency_hint(str(g.get("title", "")), str(g.get("category", "")))
        months_surplus = rem / surplus if surplus > 1 else None
        months_15 = rem / max(mi * 0.15, 1.0) if mi > 0 else None
        goals_out.append(
            {
                "title": g.get("title"),
                "emoji": g.get("emoji"),
                "target_amount": round(tgt, 2),
                "saved_amount": round(sav, 2),
                "remaining": round(rem, 2),
                "deadline": g.get("deadline"),
                "category": g.get("category"),
                "currency_hint": hint,
                "months_at_current_surplus": round(months_surplus, 1) if months_surplus else None,
                "months_at_15pct_income": round(months_15, 1) if months_15 else None,
            }
        )

    anomalies = await anomaly_service.list_anomalies(db, user_id, limit=8)
    anomaly_brief = [
        {
            "date": str(x.get("date", "")),
            "amount": round(float(x.get("amount", 0)), 2),
            "category": x.get("category"),
            "description": str(x.get("description", ""))[:60],
        }
        for x in anomalies[:6]
    ]

    market_block: dict[str, Any] | None = None
    try:
        md = await market_service.get_market_data()
        market_block = {"rates": md.get("rates", []), "cached": md.get("cached")}
    except Exception:
        market_block = None

    return {
        "as_of": today.isoformat(),
        "calendar_month_label": mk_now,
        "bank_filter": bank_id,
        "insights": {
            "credit_score": insights.get("credit_score"),
            "score_label": insights.get("score_label"),
            "total_assets": insights.get("total_assets"),
            "monthly_income": insights.get("monthly_income"),
            "monthly_spending": insights.get("monthly_spending"),
            "savings_rate": insights.get("savings_rate"),
            "risk_status": insights.get("risk_status"),
            "analytics_period_label": insights.get("analytics_period_label"),
            "goal_advice": insights.get("goal_advice", [])[:5],
            "advisory_tips": (insights.get("advisory_tips") or [])[:6],
        },
        "spending_calendar_month_to_date": {
            "total": round(mtd_total, 2),
            "by_category": {
                k: round(v, 2)
                for k, v in sorted(mtd_by_cat.items(), key=lambda x: -x[1])[:30]
            },
            "day_of_month": day_i,
            "days_in_month": dim,
            "projected_month_total_linear": projected_month,
        },
        "spending_full_prior_month": {
            "month_key": mk_prev,
            "total": round(tot_p, 2),
            "by_category_top": dict(sorted(by_p.items(), key=lambda x: -x[1])[:12]),
        },
        "mom_category_change_pct": dict(sorted(mom_pct.items(), key=lambda x: -abs(x[1]))[:10]),
        "highest_spend_transaction_this_month": (
            {
                "amount": round(highest[0], 2),
                "description": highest[1],
                "category": highest[2],
                "date": highest[3],
            }
            if highest
            else None
        ),
        "top_transactions_this_month": top5,
        "limits_mtd": limits_rows,
        "last_7d_spending": {
            "total": round(wk_total, 2),
            "by_category": {
                k: round(v, 2)
                for k, v in sorted(wk_by_cat.items(), key=lambda x: -x[1])[:20]
            },
        },
        "recurring_like_spend_try": {"last_7d": rec_last7, "prev_7d": rec_prev7, "pct_change_vs_prev": rec_pct},
        "recent_pdf_statements": recent_statements,
        "goals": goals_out,
        "flagged_anomalies_sample": anomaly_brief,
        "proactive_alerts": proactive,
        "live_market": market_block,
    }


def context_to_prompt_block(ctx: dict[str, Any]) -> str:
    """LLM için tek metin bloğu (Türkçe etiketler)."""
    try:
        blob = json.dumps(ctx, ensure_ascii=False, indent=2)
    except Exception:
        blob = str(ctx)
    return (
        "Aşağıdaki JSON kullanıcının gerçek MongoDB verilerinden üretilmiş finansal bağlamdır. "
        "Sorulara yanıt verirken bu sayıları esas al; uydurma.\n\n"
        f"{blob}"
    )
