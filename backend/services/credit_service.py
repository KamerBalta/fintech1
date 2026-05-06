"""
Kredi Skorlama Servisi + Kullanıcı Insights
"""
import os
import numpy as np
import joblib
import random
from typing import Dict, Any

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "trained_models")

_credit_reg    = None
_credit_scaler = None

def _load():
    global _credit_reg, _credit_scaler
    if _credit_reg is None:
        rp = os.path.join(MODELS_DIR, "credit_regressor.pkl")
        sp = os.path.join(MODELS_DIR, "credit_scaler.pkl")
        if os.path.exists(rp) and os.path.exists(sp):
            _credit_reg    = joblib.load(rp)
            _credit_scaler = joblib.load(sp)

CREDIT_FEATURES = ["age","income_monthly","debt_ratio","num_accounts",
                    "missed_payments","credit_util","account_age_yrs","loan_count"]

def predict_credit_score(user_data: Dict[str, Any]) -> int:
    try:
        _load()
        if _credit_reg is None:
            raise FileNotFoundError
        features = np.array([[
            user_data.get("age", 30),
            user_data.get("income_monthly", 8000),
            user_data.get("debt_ratio", 0.3),
            user_data.get("num_accounts", 3),
            user_data.get("missed_payments", 0),
            user_data.get("credit_util", 0.3),
            user_data.get("account_age_yrs", 5),
            user_data.get("loan_count", 1),
        ]])
        scaled = _credit_scaler.transform(features)
        score  = int(np.clip(_credit_reg.predict(scaled)[0], 300, 850))
    except FileNotFoundError:
        # Basit heuristik fallback
        base   = 600
        base  += (user_data.get("income_monthly", 8000) - 8000) / 100
        base  -= user_data.get("missed_payments", 0) * 30
        base  -= user_data.get("debt_ratio", 0.3) * 80
        score  = int(np.clip(base, 300, 850))
    return score

def get_score_label(score: int) -> str:
    if score >= 750: return "Mükemmel"
    if score >= 700: return "Çok İyi"
    if score >= 650: return "İyi"
    if score >= 600: return "Orta"
    return "Zayıf"

def get_user_insights(user_id: str = "demo") -> Dict[str, Any]:
    """Demo kullanıcı için zengin insight paketi döner."""
    rng = random.Random(user_id)

    credit_score = predict_credit_score({
        "age": 32,
        "income_monthly": rng.uniform(6000, 15000),
        "debt_ratio": rng.uniform(0.1, 0.5),
        "num_accounts": rng.randint(2, 8),
        "missed_payments": rng.randint(0, 3),
        "credit_util": rng.uniform(0.1, 0.6),
        "account_age_yrs": rng.uniform(2, 15),
        "loan_count": rng.randint(0, 4),
    })

    # Radar grafik: 0-100 ölçeği
    radar = {
        "Ödeme Düzeni":     rng.randint(60, 98),
        "Kredi Kullanımı":  rng.randint(50, 90),
        "Hesap Yaşı":       rng.randint(40, 85),
        "Hesap Çeşitliliği": rng.randint(55, 95),
        "Yeni Kredi":       rng.randint(60, 100),
    }

    # 6 aylık harcama tahmini
    spending_forecast = []
    import datetime
    base_spending = rng.uniform(3000, 8000)
    today = datetime.date.today()
    for i in range(6):
        month = today + datetime.timedelta(days=30 * i)
        spending_forecast.append({
            "month": month.strftime("%b %Y"),
            "predicted": round(base_spending * rng.uniform(0.85, 1.25)),
            "actual": round(base_spending * rng.uniform(0.9, 1.1)) if i < 3 else None,
        })

    return {
        "credit_score":       credit_score,
        "score_label":        get_score_label(credit_score),
        "total_assets":       round(rng.uniform(15000, 120000), 2),
        "monthly_income":     round(rng.uniform(6000, 18000), 2),
        "monthly_spending":   round(rng.uniform(3000, 9000), 2),
        "savings_rate":       round(rng.uniform(5, 35), 1),
        "radar_data":         radar,
        "spending_forecast":  spending_forecast,
        "risk_status":        rng.choice(["Düşük", "Orta", "Düşük"]),
        "active_alerts":      rng.randint(0, 3),
    }