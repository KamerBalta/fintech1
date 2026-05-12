"""
Fraud Tespit Servisi – Rule-based + Random Forest (opsiyonel)
Prodüksiyon notları: model opsiyonel; yüklü değilse heuristic çalışır.
"""
import os
import json
import random
import numpy as np
from typing import Dict, Any, List

MODELS_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "models", "trained")

_fraud_model  = None
_fraud_scaler = None

FEATURE_EXPLANATIONS = {
    "amount":         ("Çok yüksek işlem tutarı",           "Normal işlem tutarı"),
    "hour":           ("Gece saatinde gerçekleşen işlem",   "Mesai saatlerinde işlem"),
    "distance_km":    ("Alışılmadık konum (uzak mesafe)",   "Normal konum"),
    "prev_txn_gap_h": ("Ardışık çok hızlı işlem",          "Normal işlem sıklığı"),
    "card_age_days":  ("Çok yeni kart",                     "Köklü kart geçmişi"),
    "is_foreign":     ("Yabancı ülke işlemi",               "Yurtiçi işlem"),
}


def _heuristic_score(txn: Dict[str, Any]) -> float:
    """Model yokken heuristic risk skoru (0–100)."""
    score = 0.0
    amount = txn.get("amount", 0)
    hour   = txn.get("hour",   12)
    foreign= txn.get("is_foreign", 0)
    age    = txn.get("card_age_days", 365)
    dist   = txn.get("distance_km", 5)
    gap    = txn.get("prev_txn_gap_h", 12)

    if amount > 5000:  score += 30
    elif amount > 2000: score += 15
    if hour < 5 or hour > 23: score += 25
    if foreign:  score += 20
    if age < 30: score += 15
    if dist > 200: score += 15
    if gap < 0.5:  score += 20

    # Küçük gürültü
    score += random.uniform(-3, 3)
    return min(100, max(0, round(score, 1)))


def _reasons(txn: Dict[str, Any], score: float) -> List[str]:
    reasons = []
    if txn.get("amount", 0) > 3000:
        reasons.append(FEATURE_EXPLANATIONS["amount"][0])
    if txn.get("hour", 12) < 5:
        reasons.append(FEATURE_EXPLANATIONS["hour"][0])
    if txn.get("is_foreign", 0):
        reasons.append(FEATURE_EXPLANATIONS["is_foreign"][0])
    if txn.get("distance_km", 5) > 200:
        reasons.append(FEATURE_EXPLANATIONS["distance_km"][0])
    if txn.get("card_age_days", 365) < 30:
        reasons.append(FEATURE_EXPLANATIONS["card_age_days"][0])
    if txn.get("prev_txn_gap_h", 12) < 0.5:
        reasons.append(FEATURE_EXPLANATIONS["prev_txn_gap_h"][0])
    return reasons[:3]


def predict_fraud(txn: Dict[str, Any]) -> Dict[str, Any]:
    score = _heuristic_score(txn)

    # Model varsa kullan
    try:
        import joblib
        global _fraud_model, _fraud_scaler
        if _fraud_model is None:
            _fraud_model  = joblib.load(os.path.join(MODELS_DIR, "fraud_model.pkl"))
            _fraud_scaler = joblib.load(os.path.join(MODELS_DIR, "fraud_scaler.pkl"))
        features = np.array([[
            txn.get("amount", 0),
            txn.get("hour", 12),
            txn.get("day_of_week", 1),
            txn.get("merchant_cat", 3),
            txn.get("distance_km", 5),
            txn.get("prev_txn_gap_h", 12),
            txn.get("card_age_days", 365),
            txn.get("is_foreign", 0),
        ]])
        scaled = _fraud_scaler.transform(features)
        score  = round(float(_fraud_model.predict_proba(scaled)[0, 1]) * 100, 1)
    except Exception:
        pass  # heuristic'e devam

    is_fraud   = score >= 65
    risk_level = "Yüksek" if score >= 65 else "Orta" if score >= 35 else "Düşük"
    reasons    = _reasons(txn, score) if is_fraud else []

    return {
        "risk_score":  score,
        "is_fraud":    is_fraud,
        "risk_level":  risk_level,
        "xai_reasons": json.dumps(reasons, ensure_ascii=False),
        "confidence":  round(max(score, 100 - score), 1),
    }


def enrich_with_fraud(transactions: List[Dict]) -> List[Dict]:
    enriched = []
    for t in transactions:
        fraud_data = predict_fraud({
            "amount":         t.get("amount", 100),
            "hour":           random.randint(0, 23),
            "day_of_week":    random.randint(0, 6),
            "merchant_cat":   random.randint(1, 10),
            "distance_km":    abs(random.gauss(10, 50)),
            "prev_txn_gap_h": abs(random.gauss(12, 8)),
            "card_age_days":  random.randint(10, 1500),
            "is_foreign":     random.choices([0, 1], weights=[85, 15])[0],
        })
        enriched.append({**t, **fraud_data})
    return enriched