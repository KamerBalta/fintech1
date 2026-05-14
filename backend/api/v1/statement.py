"""
PDF ekstre yükleme — parse, temizleme, MongoDB'ye kayıt ve analiz özeti.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from config import get_settings
from database import get_db, txn_doc_to_out
from schemas.schemas import PDFAnalysisOut, TransactionOut
from services import fraud_service
from services import anomaly_service
from services.pdf_processor import parse_bank_statement_pdf
from services.pdf_parser import generate_insights, predict_bill_load
from services.security import get_current_user

router = APIRouter(tags=["Statement"])


@router.post("/upload-statement", response_model=PDFAnalysisOut)
async def upload_statement(
    file: UploadFile = File(...),
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    settings = get_settings()
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Yalnızca PDF dosyası kabul edilir.")

    raw = await file.read()
    if not raw:
        raise HTTPException(status_code=400, detail="Boş dosya.")

    parsed = parse_bank_statement_pdf(raw)
    if not parsed:
        raise HTTPException(
            status_code=422,
            detail="PDF içinden işlem satırı çıkarılamadı; tablo veya tarih/tutar formatını kontrol edin.",
        )

    upload_root = Path(settings.UPLOAD_DIR)
    user_dir = upload_root / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.pdf"
    disk_path = user_dir / fname
    disk_path.write_bytes(raw)
    rel_path = str(disk_path.relative_to(upload_root))

    enriched = fraud_service.enrich_with_fraud(parsed)
    saved_ids: list[ObjectId] = []

    now = datetime.now(timezone.utc)
    for t in enriched:
        doc = {
            "user_id": user.id,
            "date": t["date"],
            "description": t.get("description", t.get("raw_description", "")),
            "amount": float(t.get("amount", 0)),
            "category": t.get("category", "Diğer"),
            "is_recurring": bool(t.get("is_recurring", False)),
            "is_fraud": bool(t.get("is_fraud", False)),
            "risk_score": float(t.get("risk_score", 0.0)),
            "risk_level": t.get("risk_level", "Düşük"),
            "xai_reasons": t.get("xai_reasons", "[]"),
            "source": "pdf",
            "statement_file": rel_path,
            "is_anomaly": False,
            "created_at": now,
        }
        ins = await db.transactions.insert_one(doc)
        saved_ids.append(ins.inserted_id)

    await anomaly_service.flag_anomalies_for_user(db, user.id)

    saved_docs = await db.transactions.find({"_id": {"$in": saved_ids}}).to_list(len(saved_ids))
    id_order = {sid: i for i, sid in enumerate(saved_ids)}
    saved_docs.sort(key=lambda d: id_order.get(d["_id"], 0))

    cat_totals: dict[str, float] = {}
    for t in enriched:
        c = t.get("category", "Diğer")
        cat_totals[c] = round(cat_totals.get(c, 0) + float(t.get("amount", 0)), 2)

    goals = await db.goals.find({"user_id": user.id}).to_list(50)
    goals_payload = [
        {"title": g["title"], "target_amount": g["target_amount"], "saved_amount": g["saved_amount"]}
        for g in goals
    ]

    bill_forecast = predict_bill_load(enriched)
    ai_insights = generate_insights(enriched, goals_payload)

    return PDFAnalysisOut(
        success=True,
        transaction_count=len(saved_docs),
        transactions=[TransactionOut.model_validate(txn_doc_to_out(s)) for s in saved_docs],
        category_breakdown=cat_totals,
        total_spending=round(sum(cat_totals.values()), 2),
        fraud_count=sum(1 for t in enriched if t.get("is_fraud")),
        recurring_count=sum(1 for t in enriched if t.get("is_recurring")),
        bill_forecast=bill_forecast,
        ai_insights=ai_insights,
        statement_path=rel_path,
    )
