"""
Gerçek banka ekstre PDF'lerinden tablo ve metin satırlarını çıkarır;
app.utils.cleaner ile normalizasyon ve kategorileme uygular.
"""
from __future__ import annotations

import re
from io import BytesIO
from typing import Any

import pdfplumber

from app.utils.cleaner import clean_statement_row

AMOUNT_RE = re.compile(r"-?\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})")
DATE_RE = re.compile(
    r"\b(\d{1,2}[./-]\d{1,2}[./-]\d{2,4}|\d{4}[./-]\d{2}[./-]\d{2})\b"
)


def _parse_amount(raw: str) -> float | None:
    s = raw.replace(" ", "")
    if not s:
        return None
    if "," in s and "." in s:
        if s.rfind(",") > s.rfind("."):
            s = s.replace(".", "").replace(",", ".")
        else:
            s = s.replace(",", "")
    elif "," in s:
        s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


def _row_cells_to_record(cells: list[str]) -> dict[str, Any] | None:
    cells = [str(c).strip() if c else "" for c in cells]
    cells = [c for c in cells if c]
    if len(cells) < 3:
        return None
    # Tarih | Açıklama | Tutar (veya ek sütunlar)
    date_col = cells[0]
    amount_col = cells[-1]
    desc_parts = cells[1:-1]
    desc = " ".join(desc_parts).strip() if desc_parts else ""
    dm = DATE_RE.search(date_col)
    date_val = dm.group(0) if dm else date_col
    amount = _parse_amount(amount_col)
    if not desc or amount is None:
        return None
    return clean_statement_row(date_val, desc, amount)


def parse_bank_statement_pdf(file_bytes: bytes) -> list[dict[str, Any]]:
    """
    pdfplumber ile tabloları ve düz metin satırlarını tarar.
    Dönüş: cleaner sonrası işlem dict listesi.
    """
    results: list[dict[str, Any]] = []
    with pdfplumber.open(BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            table = page.extract_table()
            if table:
                for row in table[1:]:
                    if not row:
                        continue
                    rec = _row_cells_to_record([str(c) if c is not None else "" for c in row])
                    if rec:
                        results.append(rec)
            text = page.extract_text() or ""
            for line in text.splitlines():
                dm = DATE_RE.search(line)
                if not dm:
                    continue
                tail = line[dm.end() :].strip()
                amounts = AMOUNT_RE.findall(tail)
                if not amounts:
                    continue
                desc = AMOUNT_RE.sub("", tail).strip()
                amount = _parse_amount(amounts[-1])
                if not desc or amount is None:
                    continue
                results.append(clean_statement_row(dm.group(0), desc, amount))
    return results
