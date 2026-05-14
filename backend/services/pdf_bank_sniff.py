"""PDF ham baytından ilk sayfa metni ile banka tespiti."""
from __future__ import annotations

from io import BytesIO

import pdfplumber

from services.bank_registry import detect_bank_from_text


def sniff_bank_from_pdf_bytes(file_bytes: bytes) -> tuple[str, str]:
    sample = ""
    try:
        with pdfplumber.open(BytesIO(file_bytes)) as pdf:
            for page in pdf.pages[:2]:
                sample += page.extract_text() or ""
    except Exception:
        sample = ""
    return detect_bank_from_text(sample)
