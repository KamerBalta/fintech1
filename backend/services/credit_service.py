"""
Kredi Skorlama & Kullanıcı İçgörüleri
"""
import random
import datetime
import numpy as np
from typing import Dict, Any, List


def get_score_label(score: int) -> str:
    if score >= 750: return "Mükemmel"
    if score >= 700: return "Çok İyi"
    if score >= 650: return "İyi"
    if score >= 600: return "Orta"
    return "Zayıf"


def calc_credit_score(user_data: Dict[str, Any]) -> int:
    base = 650
    base += (user_data.get("income_monthly", 8000) - 8000) * 0.002
    base -= user_data.get("missed_payments", 0) * 30
    base -= user_data.get("debt_ratio", 0.3) * 80
    base -= user_data.get("credit_util", 0.3) * 60
    base += user_data.get("account_age_yrs", 5) * 4
    return int(np.clip(base + random.gauss(0, 10), 300, 850))


def get_user_insights(user_id: int, db=None) -> Dict[str, Any]:
    rng   = random.Random(user_id)
    score = calc_credit_score({
        "income_monthly":  rng.uniform(6000, 18000),
        "missed_payments": rng.randint(0, 3),
        "debt_ratio":      rng.uniform(0.1, 0.5),
        "credit_util":     rng.uniform(0.1, 0.6),
        "account_age_yrs": rng.uniform(2, 15),
    })

    radar = {
        "Ödeme Düzeni":      rng.randint(60, 98),
        "Kredi Kullanımı":   rng.randint(50, 90),
        "Hesap Yaşı":        rng.randint(40, 85),
        "Hesap Çeşitliliği": rng.randint(55, 95),
        "Yeni Kredi":        rng.randint(60, 100),
    }

    today     = datetime.date.today()
    base_sp   = rng.uniform(4000, 10000)
    forecast  = []
    for i in range(6):
        m = today + datetime.timedelta(days=30 * i)
        forecast.append({
            "month":     m.strftime("%b %Y"),
            "predicted": round(base_sp * rng.uniform(0.88, 1.18)),
            "actual":    round(base_sp * rng.uniform(0.90, 1.10)) if i < 3 else None,
        })

    monthly_income   = round(rng.uniform(8000, 20000), 2)
    monthly_spending = round(rng.uniform(4000, 12000), 2)

    goal_advice = [
        "Aylık gelirinin %20'sini otomatik olarak bir birikim hesabına aktar.",
        "Yatırım fonlarını değerlendirerek enflasyona karşı korunmayı düşün.",
    ]

    return {
        "credit_score":     score,
        "score_label":      get_score_label(score),
        "total_assets":     round(rng.uniform(15000, 150000), 2),
        "monthly_income":   monthly_income,
        "monthly_spending": monthly_spending,
        "savings_rate":     round((monthly_income - monthly_spending) / monthly_income * 100, 1),
        "risk_status":      rng.choice(["Düşük", "Düşük", "Orta"]),
        "active_alerts":    rng.randint(0, 3),
        "radar_data":       radar,
        "spending_forecast":forecast,
        "goal_advice":      goal_advice,
    }