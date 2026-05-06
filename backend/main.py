"""
AI Destekli Finansal Analiz ve Fraud Tespit Sistemi
FastAPI Backend – Ana Uygulama
"""
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import traceback

from services.pdf_parser     import extract_from_pdf, generate_demo_transactions, categorize
from services.fraud_service  import predict_fraud, scan_transactions_for_fraud
from services.credit_service import get_user_insights
from services.chatbot_service import chat_with_assistant

app = FastAPI(
    title="FINARA – AI Financial Analysis API",
    description="Fraud tespit, kredi skorlama ve finansal asistan",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─────────────────────────────────────────────────────────────────────────────
# Sağlık kontrolü
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "service": "FINARA API v1.0"}

# ─────────────────────────────────────────────────────────────────────────────
# POST /upload-statement
# ─────────────────────────────────────────────────────────────────────────────
@app.post("/upload-statement")
async def upload_statement(file: Optional[UploadFile] = File(None)):
    """
    PDF banka ekstresini yükle → işlemleri çıkar → kategorize et → fraud tara.
    PDF yoksa demo verisi kullan.
    """
    try:
        if file and file.filename.endswith(".pdf"):
            content      = await file.read()
            transactions = extract_from_pdf(content)
            if not transactions:
                transactions = generate_demo_transactions(25)
        else:
            transactions = generate_demo_transactions(25)

        # Fraud taraması
        enriched = scan_transactions_for_fraud(transactions)

        # Kategori özeti
        from collections import defaultdict
        cat_totals: Dict[str, float] = defaultdict(float)
        for t in enriched:
            cat_totals[t["category"]] += t["amount"]

        return {
            "success":           True,
            "transaction_count": len(enriched),
            "transactions":      enriched,
            "category_breakdown": dict(cat_totals),
            "total_spending":    round(sum(cat_totals.values()), 2),
            "fraud_count":       sum(1 for t in enriched if t.get("is_fraud")),
        }
    except Exception as e:
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# POST /predict-fraud
# ─────────────────────────────────────────────────────────────────────────────
class TransactionInput(BaseModel):
    amount:         float
    hour:           int   = 12
    day_of_week:    int   = 1
    merchant_cat:   int   = 3
    distance_km:    float = 5.0
    prev_txn_gap_h: float = 12.0
    card_age_days:  int   = 365
    is_foreign:     int   = 0

@app.post("/predict-fraud")
async def fraud_prediction(txn: TransactionInput):
    """Tek işlem için fraud risk skoru ve XAI açıklaması döner."""
    try:
        result = predict_fraud(txn.model_dump())
        return {"success": True, **result}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# GET /user-insights
# ─────────────────────────────────────────────────────────────────────────────
@app.get("/user-insights")
async def user_insights(user_id: str = "demo"):
    """Kredi skoru, radar verisi ve harcama tahminlerini döner."""
    try:
        data = get_user_insights(user_id)
        return {"success": True, **data}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
# POST /chat
# ─────────────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message:            str
    financial_context:  Dict[str, Any] = {}
    history:            List[Dict[str, str]] = []

@app.post("/chat")
async def chat(req: ChatRequest):
    """Finansal asistana soru sor."""
    try:
        reply = await chat_with_assistant(
            req.message,
            req.financial_context,
            req.history,
        )
        return {"success": True, "reply": reply}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ─────────────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)