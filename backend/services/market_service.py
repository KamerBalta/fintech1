"""
Market Data Service
- ExchangeRate-API (ücretsiz tier) ile USD/TRY, EUR/TRY
- Altın fiyatı için fallback mock (ücretsiz altın API güvenilmez)
- In-Memory Cache: TTL 10 dakika
"""
import time
import httpx
import random
from typing import Optional
from config import get_settings

settings = get_settings()

# ─── Cache Yapısı ─────────────────────────────────────────────────────────────
_cache: dict = {}           # key -> {"data": ..., "ts": float}


def _is_fresh(key: str) -> bool:
    if key not in _cache:
        return False
    return (time.time() - _cache[key]["ts"]) < settings.MARKET_CACHE_TTL


def _set_cache(key: str, data) -> None:
    _cache[key] = {"data": data, "ts": time.time()}


def _get_cache(key: str):
    return _cache.get(key, {}).get("data")


# ─── Kur Çekme ────────────────────────────────────────────────────────────────
async def _fetch_live_rates() -> Optional[dict]:
    """ExchangeRate-API v6 – base USD"""
    url = f"{settings.EXCHANGE_API_URL}/{settings.EXCHANGE_API_KEY}/latest/USD"
    try:
        async with httpx.AsyncClient(timeout=8) as client:
            resp = await client.get(url)
            if resp.status_code == 200:
                return resp.json().get("conversion_rates", {})
    except Exception:
        pass
    return None


def _mock_rates() -> dict:
    """API başarısız olursa gerçekçi mock değerler."""
    base = {"TRY": 32.45, "EUR": 0.924, "GBP": 0.792, "XAU": 0.000488}
    noise = lambda: random.uniform(-0.003, 0.003)
    return {k: round(v * (1 + noise()), 6) for k, v in base.items()}


async def get_market_data() -> dict:
    CACHE_KEY = "market_rates"
    cached = _is_fresh(CACHE_KEY)

    if cached:
        rates = _get_cache(CACHE_KEY)
        return _build_response(rates, cached=True)

    live = await _fetch_live_rates()
    rates = live if live else _mock_rates()
    _set_cache(CACHE_KEY, rates)

    return _build_response(rates, cached=False)


# Önceki değerleri takip etmek için küçük history
_prev_rates: dict = {}


def _build_response(rates: dict, cached: bool) -> dict:
    global _prev_rates

    def change(symbol: str, current: float) -> float:
        prev = _prev_rates.get(symbol, current)
        return round((current - prev) / prev * 100, 3) if prev else 0.0

    try_rate = rates.get("TRY", 32.45)
    eur_usd  = rates.get("EUR", 0.924)
    xau_usd  = 1 / rates.get("XAU", 0.000488) if rates.get("XAU") else 2048.0

    symbols = {
        "USD/TRY": try_rate,
        "EUR/TRY": round(try_rate / eur_usd, 4) if eur_usd else 35.10,
        "EUR/USD": round(eur_usd, 4),
        "XAU/USD": round(xau_usd, 2),
        "XAU/TRY": round(xau_usd * try_rate, 2),
    }

    import datetime
    now = datetime.datetime.utcnow().strftime("%H:%M:%S")

    result = []
    for sym, val in symbols.items():
        result.append({
            "symbol":     sym,
            "rate":       val,
            "change_pct": change(sym, val),
            "updated_at": now,
        })
        _prev_rates[sym] = val

    return {"rates": result, "cached": cached}