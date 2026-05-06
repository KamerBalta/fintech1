"""
Sentetik veri üretici ve ML model eğitici
Fraud Detection (Random Forest) + Credit Scoring modelleri
"""
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier, GradientBoostingClassifier
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
import joblib
import os

MODELS_DIR = os.path.join(os.path.dirname(__file__), "trained_models")
os.makedirs(MODELS_DIR, exist_ok=True)

np.random.seed(42)

# ─────────────────────────────────────────────
# 1. FRAUD DETECTION – Sentetik Veri
# ─────────────────────────────────────────────
def generate_fraud_data(n=5000):
    n_normal = int(n * 0.95)
    n_fraud  = n - n_normal

    normal = pd.DataFrame({
        "amount":         np.random.lognormal(4, 1, n_normal),
        "hour":           np.random.randint(7, 23, n_normal),
        "day_of_week":    np.random.randint(0, 7,  n_normal),
        "merchant_cat":   np.random.randint(1, 10, n_normal),
        "distance_km":    np.abs(np.random.normal(5, 10, n_normal)),
        "prev_txn_gap_h": np.abs(np.random.normal(12, 6, n_normal)),
        "card_age_days":  np.random.randint(30, 2000, n_normal),
        "is_foreign":     np.random.choice([0, 1], n_normal, p=[0.92, 0.08]),
        "label": 0
    })

    fraud = pd.DataFrame({
        "amount":         np.random.lognormal(6, 1.5, n_fraud),
        "hour":           np.random.choice([0,1,2,3,4,22,23], n_fraud),
        "day_of_week":    np.random.randint(0, 7, n_fraud),
        "merchant_cat":   np.random.randint(1, 10, n_fraud),
        "distance_km":    np.abs(np.random.normal(200, 100, n_fraud)),
        "prev_txn_gap_h": np.abs(np.random.normal(0.5, 0.3, n_fraud)),
        "card_age_days":  np.random.randint(1, 60, n_fraud),
        "is_foreign":     np.random.choice([0, 1], n_fraud, p=[0.3, 0.7]),
        "label": 1
    })

    df = pd.concat([normal, fraud]).sample(frac=1).reset_index(drop=True)
    return df

# ─────────────────────────────────────────────
# 2. CREDIT SCORING – Sentetik Veri
# ─────────────────────────────────────────────
def generate_credit_data(n=3000):
    df = pd.DataFrame({
        "age":              np.random.randint(18, 70, n),
        "income_monthly":   np.abs(np.random.normal(8000, 4000, n)),
        "debt_ratio":       np.clip(np.random.beta(2, 5, n), 0, 1),
        "num_accounts":     np.random.randint(1, 15, n),
        "missed_payments":  np.random.poisson(0.5, n),
        "credit_util":      np.clip(np.random.beta(2, 5, n), 0, 1),
        "account_age_yrs":  np.abs(np.random.normal(5, 4, n)),
        "loan_count":       np.random.poisson(1.5, n),
    })
    # Skor 300-850 arası
    score = (
        0.25 * (df["income_monthly"] / 20000 * 200)
        - 0.30 * df["debt_ratio"] * 150
        - 0.20 * df["missed_payments"] * 40
        - 0.15 * df["credit_util"] * 100
        + 0.10 * (df["account_age_yrs"] / 20 * 80)
    )
    df["credit_score"] = np.clip(score + 650 + np.random.normal(0, 20, n), 300, 850).astype(int)
    # İkili etiket: iyi / kötü kredi (>=650)
    df["label"] = (df["credit_score"] >= 650).astype(int)
    return df

# ─────────────────────────────────────────────
# 3. MODEL EĞİTİMİ
# ─────────────────────────────────────────────
FRAUD_FEATURES = ["amount","hour","day_of_week","merchant_cat",
                   "distance_km","prev_txn_gap_h","card_age_days","is_foreign"]

CREDIT_FEATURES = ["age","income_monthly","debt_ratio","num_accounts",
                    "missed_payments","credit_util","account_age_yrs","loan_count"]

def train_fraud_model():
    print("🔄 Fraud detection modeli eğitiliyor…")
    df = generate_fraud_data(5000)
    X, y = df[FRAUD_FEATURES], df["label"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, stratify=y)

    scaler = StandardScaler()
    Xtr_s = scaler.fit_transform(Xtr)
    Xte_s = scaler.transform(Xte)

    model = RandomForestClassifier(n_estimators=150, max_depth=10,
                                    class_weight="balanced", random_state=42)
    model.fit(Xtr_s, ytr)

    auc = roc_auc_score(yte, model.predict_proba(Xte_s)[:,1])
    print(f"✅ Fraud Model ROC-AUC: {auc:.3f}")
    print(classification_report(yte, model.predict(Xte_s)))

    joblib.dump(model,  os.path.join(MODELS_DIR, "fraud_model.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "fraud_scaler.pkl"))
    return model, scaler

def train_credit_model():
    print("🔄 Kredi skorlama modeli eğitiliyor…")
    df = generate_credit_data(3000)
    X, y = df[CREDIT_FEATURES], df["label"]
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2)

    scaler = StandardScaler()
    Xtr_s = scaler.fit_transform(Xtr)
    Xte_s = scaler.transform(Xte)

    model = GradientBoostingClassifier(n_estimators=100, max_depth=4, random_state=42)
    model.fit(Xtr_s, ytr)

    auc = roc_auc_score(yte, model.predict_proba(Xte_s)[:,1])
    print(f"✅ Credit Model ROC-AUC: {auc:.3f}")

    # Gerçek skor tahmini için regressor da saklayalım
    from sklearn.ensemble import GradientBoostingRegressor
    df_sub = df[CREDIT_FEATURES + ["credit_score"]]
    Xr, yr = df_sub[CREDIT_FEATURES], df_sub["credit_score"]
    Xrtr, Xrte, yrtr, yrte = train_test_split(Xr, yr, test_size=0.2)
    reg = GradientBoostingRegressor(n_estimators=100, max_depth=4, random_state=42)
    reg.fit(scaler.fit_transform(Xrtr), yrtr)

    joblib.dump(model,  os.path.join(MODELS_DIR, "credit_model.pkl"))
    joblib.dump(reg,    os.path.join(MODELS_DIR, "credit_regressor.pkl"))
    joblib.dump(scaler, os.path.join(MODELS_DIR, "credit_scaler.pkl"))
    return model, scaler

if __name__ == "__main__":
    train_fraud_model()
    train_credit_model()
    print("\n🎉 Tüm modeller başarıyla eğitildi ve kaydedildi!")