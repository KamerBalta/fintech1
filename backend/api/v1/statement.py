"""
PDF ekstre yükleme — parse, mükerrer kontrolü, MongoDB'ye birleştirilmiş kayıt ve analiz özeti.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from pathlib import Path

from bson import ObjectId
from pymongo.errors import DuplicateKeyError
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile

from app.utils.dates import parse_txn_date, turkish_month_label
from config import get_settings
from database import get_db, txn_doc_to_out
from schemas.schemas import PDFAnalysisOut, TransactionOut
from services import fraud_service
from services import anomaly_service
from services.pdf_processor import parse_bank_statement_pdf
from services.pdf_parser import generate_insights, predict_bill_load
from services.security import get_current_user
from services.transaction_dedupe import (
    dedupe_parsed_batch,
    infer_statement_focus_month,
    make_transaction_dedupe_key,
)

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

    parsed, batch_dup_skips = dedupe_parsed_batch(parsed)

    upload_root = Path(settings.UPLOAD_DIR)
    user_dir = upload_root / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    fname = f"{uuid.uuid4().hex}.pdf"
    disk_path = user_dir / fname
    disk_path.write_bytes(raw)
    rel_path = str(disk_path.relative_to(upload_root))

    enriched = fraud_service.enrich_with_fraud(parsed)
    saved_ids: list[ObjectId] = []
    db_dup_skips = 0
    now = datetime.now(timezone.utc)

    for t in enriched:
        raw_desc = str(t.get("raw_description") or t.get("description") or "")
        desc = str(t.get("description") or raw_desc)
        dedupe_key = make_transaction_dedupe_key(
            str(t.get("date", "")),
            float(t.get("amount", 0)),
            desc,
            t.get("raw_description"),
        )
        if dedupe_key:
            exists = await db.transactions.find_one({"user_id": user.id, "dedupe_key": dedupe_key})
            if exists:
                db_dup_skips += 1
                continue

        doc: dict = {
            "user_id": user.id,
            "date": t["date"],
            "description": desc,
            "raw_description": raw_desc[:500] if raw_desc else None,
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
        if dedupe_key:
            doc["dedupe_key"] = dedupe_key
        try:
            ins = await db.transactions.insert_one(doc)
            saved_ids.append(ins.inserted_id)
        except DuplicateKeyError:
            db_dup_skips += 1
            continue

    await anomaly_service.flag_anomalies_for_user(db, user.id)

    # Son yüklenen ekstre dönemi → dashboard odak ayı (tek aylık ekstre algısı)
    stmt_dates: list = []
    for row in enriched:
        d = parse_txn_date(str(row.get("date", "")))
        if d:
            stmt_dates.append(d)
    focus_month, span_days = infer_statement_focus_month(stmt_dates)
    user_update: dict = {
        "analytics_focus_updated_at": now,
        "analytics_statement_span_days": span_days,
    }
    if focus_month:
        user_update["analytics_focus_month"] = focus_month
    else:
        user_update["analytics_focus_month"] = None
    await db.users.update_one({"_id": user.id}, {"$set": user_update})

    saved_docs = await db.transactions.find({"_id": {"$in": saved_ids}}).to_list(len(saved_ids))
    id_order = {sid: i for i, sid in enumerate(saved_ids)}
    saved_docs.sort(key=lambda d: id_order.get(d["_id"], 0))

    cat_totals: dict[str, float] = {}
    for s in saved_docs:
        c = s.get("category", "Diğer")
        cat_totals[c] = round(cat_totals.get(c, 0) + float(s.get("amount", 0)), 2)

    goals = await db.goals.find({"user_id": user.id}).to_list(50)
    goals_payload = [
        {"title": g["title"], "target_amount": g["target_amount"], "saved_amount": g["saved_amount"]}
        for g in goals
    ]

    bill_forecast = predict_bill_load(enriched)
    ai_insights = generate_insights(enriched, goals_payload)

    skipped_total = batch_dup_skips + db_dup_skips

    return PDFAnalysisOut(
        success=True,
        transaction_count=len(saved_docs),
        skipped_duplicates=skipped_total,
        transactions=[TransactionOut.model_validate(txn_doc_to_out(s)) for s in saved_docs],
        category_breakdown=cat_totals,
        total_spending=round(sum(cat_totals.values()), 2),
        fraud_count=sum(1 for s in saved_docs if s.get("is_fraud")),
        recurring_count=sum(1 for s in saved_docs if s.get("is_recurring")),
        bill_forecast=bill_forecast,
        ai_insights=ai_insights,
        statement_path=rel_path,
    )
