"""PDF / manuel işlemler için mükerrer (aynı gün + tutar + açıklama) anahtarı."""
from __future__ import annotations

from app.utils.dates import month_key, parse_txn_date


def normalize_description_for_dedupe(description: str, raw_description: str | None) -> str:
    blob = (raw_description or description or "").strip().lower()
    return " ".join(blob.split())[:400]


def make_transaction_dedupe_key(date_str: str, amount: float, description: str, raw_description: str | None) -> str | None:
    d = parse_txn_date(date_str)
    if d is None:
        return None
    desc = normalize_description_for_dedupe(description, raw_description)
    amt = round(float(amount), 2)
    return f"{d.isoformat()}|{amt}|{desc}"


def dedupe_mongo_transaction_docs(docs: list[dict], *, prefer: str = "newest") -> list[dict]:
    """
    Aynı tarih + tutar + açıklama (veya kayıtlı dedupe_key) için tek kayıt bırakır.
    prefer='newest': created_at en yeni olan tutulur (varsayılan).
    """
    if not docs:
        return []

    def created_ts(d: dict) -> float:
        c = d.get("created_at")
        if hasattr(c, "timestamp"):
            return float(c.timestamp())
        return 0.0

    reverse = prefer == "newest"
    sorted_docs = sorted(docs, key=created_ts, reverse=reverse)
    seen: set[str] = set()
    out: list[dict] = []
    for d in sorted_docs:
        dk = d.get("dedupe_key")
        if isinstance(dk, str) and dk.strip():
            key = dk.strip()
        else:
            key = make_transaction_dedupe_key(
                str(d.get("date", "")),
                float(d.get("amount", 0)),
                str(d.get("description", "")),
                d.get("raw_description"),
            )
        if key is None:
            oid = str(d.get("_id", ""))
            if oid and oid not in seen:
                seen.add(oid)
                out.append(d)
            continue
        if key in seen:
            continue
        seen.add(key)
        out.append(d)
    return out


def dedupe_parsed_batch(rows: list[dict]) -> tuple[list[dict], int]:
    """Aynı PDF içinde tablo+metin çift çıkarma vb. için yerel mükerrer temizliği."""
    seen: set[str] = set()
    out: list[dict] = []
    skipped = 0
    for t in rows:
        key = make_transaction_dedupe_key(
            str(t.get("date", "")),
            float(t.get("amount", 0)),
            str(t.get("description", "")),
            t.get("raw_description"),
        )
        if key is None:
            out.append(t)
            continue
        if key in seen:
            skipped += 1
            continue
        seen.add(key)
        out.append(t)
    return out, skipped


def infer_statement_focus_month(dates: list) -> tuple[str | None, int]:
    """
    Aylık ekstre: işlemlerin çoğu tek ay ve kısa aralıkta ise YYYY-MM döner.
    Uzun / çok aylık ekstrelerde None (tüm dönem + akıllı ortalama modu).
    """
    if not dates:
        return None, 0
    mn, mx = min(dates), max(dates)
    span = (mx - mn).days + 1
    if span > 48:
        return None, span
    if mn.year == mx.year and mn.month == mx.month:
        return f"{mn.year:04d}-{mn.month:02d}", span
    from collections import Counter

    c = Counter(month_key(d) for d in dates)
    best_month, cnt = c.most_common(1)[0]
    if cnt >= max(3, int(0.6 * len(dates))):
        return best_month, span
    return None, span
