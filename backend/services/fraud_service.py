"""
Fraud Tespit Servisi – Random Forest + XAI açıklamaları
"""
import os
import numpy as np
import joblib
from typing import Dict, Any, List

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "models", "trained_models")

_fraud_model  = None
_fraud_scaler = None

def _load():
    global _fraud_model, _fraud_scaler
    if _fraud_model is None:
        mp = os.path.join(MODELS_DIR, "fraud_model.pkl")
        sp = os.path.join(MODELS_DIR, "fraud_scaler.pkl")
        if os.path.exists(mp) and os.path.exists(sp):
            _fraud_model  = joblib.load(mp)
            _fraud_scaler = joblib.load(sp)
        else:
            raise FileNotFoundError("Fraud modeli bulunamadı. `train_models.py` çalıştırın.")

FEATURE_NAMES = [
    "amount", "hour", "day_of_week", "merchant_cat",
    "distance_km", "prev_txn_gap_h", "card_age_days", "is_foreign"
]

FEATURE_EXPLANATIONS = {
    "amount":         ("Yüksek işlem tutarı",        "Normal işlem tutarı"),
    "hour":           ("Gece saatlerinde işlem",      "Normal çalışma saatlerinde"),
    "day_of_week":    ("Haftasonu işlemi",            "Hafta içi işlemi"),
    "merchant_cat":   ("Riskli kategori",             "Güvenli kategori"),
    "distance_km":    ("Alışılmadık konum mesafesi",  "Normal konum"),
    "prev_txn_gap_h": ("Çok kısa işlem aralığı",     "Normal işlem sıklığı"),
    "card_age_days":  ("Yeni kart",                   "Köklü kart"),
    "is_foreign":     ("Yabancı işlem",               "Yerli işlem"),
}

def _xai_reasons(feature_importances: np.ndarray,
                  scaled_input: np.ndarray,
                  risk_score: float) -> List[str]:
    """En etkili 3 faktörün insan-okunur açıklamasını döner."""
    top_idx = np.argsort(feature_importances)[::-1][:3]
    reasons = []
    for idx in top_idx:
        fname = FEATURE_NAMES[idx]
        val   = scaled_input[idx]
        pos_exp, neg_exp = FEATURE_EXPLANATIONS[fname]
        reasons.append(pos_exp if val > 0 else neg_exp)
    return reasons

def predict_fraud(transaction: Dict[str, Any]) -> Dict[str, Any]:
    _load()
    features = np.array([[
        transaction.get("amount",         0),
        transaction.get("hour",           12),
        transaction.get("day_of_week",    1),
        transaction.get("merchant_cat",   3),
        transaction.get("distance_km",    5),
        transaction.get("prev_txn_gap_h", 12),
        transaction.get("card_age_days",  365),
        transaction.get("is_foreign",     0),
    ]])

    scaled = _fraud_scaler.transform(features)
    prob   = _fraud_model.predict_proba(scaled)[0, 1]
    label  = int(prob >= 0.5)

    # Risk seviyesi
    if prob < 0.3:
        risk_level = "Düşük"
    elif prob < 0.6:
        risk_level = "Orta"
    else:
        risk_level = "Yüksek"

    reasons = _xai_reasons(
        _fraud_model.feature_importances_,
        scaled[0],
        prob
    )

    return {
        "risk_score":  round(float(prob) * 100, 1),
        "is_fraud":    bool(label),
        "risk_level":  risk_level,
        "xai_reasons": reasons,
        "confidence":  round(float(max(prob, 1 - prob)) * 100, 1),
    }

# ─── Demo toplu fraud tarama ─────────────────────────────────────────────────
import random

def scan_transactions_for_fraud(transactions: list) -> list:
    """Her işlem için fraud skoru ekler (demo: model yüklü değilse heuristic)."""
    enriched = []
    for txn in transactions:
        try:
            _load()
            result = predict_fraud({
                "amount":         txn.get("amount", 100),
                "hour":           random.randint(0, 23),
                "day_of_week":    random.randint(0, 6),
                "merchant_cat":   random.randint(1, 10),
                "distance_km":    abs(np.random.normal(10, 50)),
                "prev_txn_gap_h": abs(np.random.normal(12, 8)),
                "card_age_days":  random.randint(10, 1500),
                "is_foreign":     random.choice([0, 1]),
            })
        except FileNotFoundError:
            # Model yoksa basit heuristik
            score = min(100, txn.get("amount", 0) / 50)
            result = {
                "risk_score":  round(score, 1),
                "is_fraud":    score > 70,
                "risk_level":  "Yüksek" if score > 70 else "Düşük",
                "xai_reasons": ["Yüksek tutar"] if score > 70 else [],
                "confidence":  80.0,
            }
        enriched.append({**txn, **result})
    return enriched