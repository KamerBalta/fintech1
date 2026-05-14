"""İşlem tarihleri — ekstre/PDF ve MongoDB için ortak ayrıştırma."""
from __future__ import annotations

import datetime as dt


def parse_txn_date(s: str) -> dt.date | None:
    if not s:
        return None
    raw = str(s).strip()[:10]
    for fmt in ("%Y-%m-%d", "%d.%m.%Y", "%d/%m/%Y", "%Y/%m/%d", "%d-%m-%Y"):
        try:
            return dt.datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def month_key(d: dt.date) -> str:
    return d.strftime("%Y-%m")


def turkish_month_label(ym: str) -> str:
    parts = ym.split("-")
    if len(parts) != 2:
        return ym
    y, m = int(parts[0]), int(parts[1])
    names = (
        "",
        "Ocak",
        "Şubat",
        "Mart",
        "Nisan",
        "Mayıs",
        "Haziran",
        "Temmuz",
        "Ağustos",
        "Eylül",
        "Ekim",
        "Kasım",
        "Aralık",
    )
    if 1 <= m <= 12:
        return f"{names[m]} {y}"
    return ym
