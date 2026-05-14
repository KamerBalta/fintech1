"""
Rapor dışa aktarma — ReportLab (PDF) ve Pandas/OpenPyXL (Excel).
"""
from __future__ import annotations

import io
from datetime import datetime, timezone

import pandas as pd
from bson import ObjectId
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet

from database import get_db, txn_doc_to_out
from services.security import get_current_user

router = APIRouter(prefix="/export", tags=["Export"])


async def _load_user_transactions(db, user_id: ObjectId, limit: int = 2000):
    cur = db.transactions.find({"user_id": user_id}).sort("date", -1).limit(limit)
    rows = []
    async for doc in cur:
        o = txn_doc_to_out(doc)
        rows.append(o)
    return rows


@router.get("/pdf")
async def export_pdf(
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    rows = await _load_user_transactions(db, user.id)
    if not rows:
        raise HTTPException(status_code=404, detail="Dışa aktarılacak işlem bulunamadı.")

    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title="FINARA Ekstre Özeti")
    styles = getSampleStyleSheet()
    story = [
        Paragraph(f"<b>{user.full_name}</b> — İşlem dökümü", styles["Title"]),
        Spacer(1, 12),
        Paragraph(f"Oluşturulma: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')} UTC", styles["Normal"]),
        Spacer(1, 18),
    ]
    data = [["Tarih", "Açıklama", "Tutar", "Kategori", "Anomali", "Kaynak"]]
    for r in rows:
        data.append(
            [
                r["date"],
                r["description"][:40],
                f"{r['amount']:.2f}",
                r["category"],
                "Evet" if r.get("is_anomaly") else "Hayır",
                r.get("source", ""),
            ]
        )
    t = Table(data, repeatRows=1)
    t.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1a365d")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("GRID", (0, 0), (-1, -1), 0.25, colors.grey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f7fafc")]),
            ]
        )
    )
    story.append(t)
    doc.build(story)
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="finara_transactions.pdf"'},
    )


@router.get("/excel")
async def export_excel(
    db=Depends(get_db),
    user=Depends(get_current_user),
):
    rows = await _load_user_transactions(db, user.id)
    if not rows:
        raise HTTPException(status_code=404, detail="Dışa aktarılacak işlem bulunamadı.")

    df = pd.DataFrame(rows)
    drop_cols = [c for c in ("xai_reasons",) if c in df.columns]
    if drop_cols:
        df = df.drop(columns=drop_cols, errors="ignore")
    buffer = io.BytesIO()
    with pd.ExcelWriter(buffer, engine="openpyxl") as writer:
        df.to_excel(writer, index=False, sheet_name="transactions")
    buffer.seek(0)
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": 'attachment; filename="finara_transactions.xlsx"'},
    )
