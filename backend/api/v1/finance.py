import json
from typing import Optional
from fastapi import APIRouter, Depends, UploadFile, File, HTTPException
from sqlalchemy.orm import Session

from services.session import get_db
from models.user import User
from models.transaction import Transaction
from schemas.schemas import (
    PDFAnalysisOut, TransactionOut, TransactionCreate,
    InsightsOut, ChatRequest, ChatOut, MarketDataOut,
)
from services.security import get_current_user
from services import (
    pdf_parser as pdf_service,
    fraud_service,
    credit_service,
    chatbot_service as chat_service,
    market_service,
)

router = APIRouter(tags=["Finance"])


# ─── Market Data ──────────────────────────────────────────────────────────────
@router.get("/market-data", response_model=MarketDataOut)
async def get_market_data():
    return await market_service.get_market_data()


# ─── PDF Upload ───────────────────────────────────────────────────────────────
@router.post("/upload-statement", response_model=PDFAnalysisOut)
async def upload_statement(
    file: Optional[UploadFile] = File(None),
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    if file and file.filename.endswith(".pdf"):
        content = await file.read()
        transactions = pdf_service.extract_transactions(content)
        if not transactions:
            transactions = pdf_service.generate_demo_transactions(25)
    else:
        transactions = pdf_service.generate_demo_transactions(25)

    enriched = fraud_service.enrich_with_fraud(transactions)

    # DB'ye kaydet
    saved = []
    for t in enriched:
        txn = Transaction(
            user_id=user.id,
            date=t["date"], description=t["description"],
            amount=t["amount"], category=t["category"],
            is_recurring=t.get("is_recurring", False),
            is_fraud=t.get("is_fraud", False),
            risk_score=t.get("risk_score", 0.0),
            risk_level=t.get("risk_level", "Düşük"),
            xai_reasons=t.get("xai_reasons", "[]"),
            source=t.get("source", "pdf"),
        )
        db.add(txn)
        db.flush()
        saved.append(txn)
    db.commit()

    cat_totals: dict = {}
    for t in enriched:
        cat_totals[t["category"]] = round(cat_totals.get(t["category"], 0) + t["amount"], 2)

    # Hedefleri AI içgörüler için al
    from models.goal import Goal
    goals = [{"title": g.title, "target_amount": g.target_amount, "saved_amount": g.saved_amount}
             for g in db.query(Goal).filter(Goal.user_id == user.id).all()]

    bill_forecast = pdf_service.predict_bill_load(enriched)
    ai_insights   = pdf_service.generate_insights(enriched, goals)

    return PDFAnalysisOut(
        success=True,
        transaction_count=len(saved),
        transactions=[TransactionOut.model_validate(s) for s in saved],
        category_breakdown=cat_totals,
        total_spending=round(sum(cat_totals.values()), 2),
        fraud_count=sum(1 for t in enriched if t.get("is_fraud")),
        recurring_count=sum(1 for t in enriched if t.get("is_recurring")),
        bill_forecast=bill_forecast,
        ai_insights=ai_insights,
    )


# ─── Transactions List ────────────────────────────────────────────────────────
@router.get("/transactions", response_model=list[TransactionOut])
def get_transactions(
    limit: int = 50,
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    txns = (db.query(Transaction)
              .filter(Transaction.user_id == user.id)
              .order_by(Transaction.id.desc())
              .limit(limit)
              .all())
    return txns


# ─── Fraud Predict ───────────────────────────────────────────────────────────
@router.post("/predict-fraud")
def predict_fraud_endpoint(payload: dict, user: User = Depends(get_current_user)):
    result = fraud_service.predict_fraud(payload)
    return {"success": True, **result}


# ─── User Insights ────────────────────────────────────────────────────────────
@router.get("/user-insights", response_model=InsightsOut)
def user_insights(
    db:   Session = Depends(get_db),
    user: User    = Depends(get_current_user),
):
    return credit_service.get_user_insights(user.id, db)


# ─── Chat ─────────────────────────────────────────────────────────────────────
@router.post("/chat", response_model=ChatOut)
async def chat(
    payload: ChatRequest,
    user:    User = Depends(get_current_user),
):
    reply = await chat_service.chat_with_assistant(
        payload.message,
        payload.financial_context,
        payload.history,
    )
    return ChatOut(success=True, reply=reply)