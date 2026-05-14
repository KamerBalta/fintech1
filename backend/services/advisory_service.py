"""
Canlı döviz / altın kurları ve kullanıcı hedefleriyle otonom tavsiye üretimi.
"""
from __future__ import annotations

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from services import market_service


async def generate_advisory(
    db: AsyncIOMotorDatabase,
    user_id: ObjectId,
) -> list[str]:
    """
    Piyasa verisi + hedef ilerlemesi + limit aşımlarına göre kısa tavsiyeler.
    """
    tips: list[str] = []
    market = await market_service.get_market_data()
    rates = {r["symbol"]: r["rate"] for r in market.get("rates", [])}

    xau_try = rates.get("XAU/TRY")
    usd_try = rates.get("USD/TRY")
    if xau_try:
        tips.append(
            f"Güncel altın (XAU/TRY) referansı yaklaşık {xau_try:,.0f} TL. "
            "Altın hedefli birikimlerinizde küçük ama düzenli alım disiplinini koruyun."
        )
    if usd_try:
        tips.append(
            f"USD/TRY yaklaşık {usd_try:.2f}. Döviz bazlı hedefleriniz varsa "
            "kur dalgalanmasına karşı vadeleri 3–6 ay ötesine yaymayı düşünebilirsiniz."
        )

    goals = await db.goals.find({"user_id": user_id}).to_list(20)
    for g in goals[:3]:
        tgt = float(g.get("target_amount", 0))
        saved = float(g.get("saved_amount", 0))
        title = g.get("title", "Hedef")
        if tgt > 0:
            pct = min(100.0, saved / tgt * 100)
            remaining = tgt - saved
            if pct < 25:
                tips.append(
                    f"'{title}' hedefinde ilerleme %{pct:.0f} seviyesinde. "
                    f"Kalan {remaining:,.0f} TL için aylık otomatik havale ayarlamak faydalı olur."
                )
            elif pct >= 75:
                tips.append(
                    f"'{title}' hedefine yaklaştınız (%{pct:.0f}). "
                    "Son aşamada likiditeyi bozmadan vadeleri netleştirin."
                )

    limits = await db.limits.find({"user_id": user_id}).to_list(50)
    if limits:
        from datetime import date, timedelta

        start = date.today() - timedelta(days=30)
        for lim in limits[:5]:
            cat = lim.get("category")
            cap = float(lim.get("monthly_cap", 0))
            if not cat or cap <= 0:
                continue
            spent = 0.0
            async for t in db.transactions.find({"user_id": user_id, "category": cat}):
                ds = str(t.get("date", ""))
                try:
                    d = date.fromisoformat(ds[:10])
                except ValueError:
                    continue
                if d >= start:
                    spent += float(t.get("amount", 0))
            if spent > cap * 0.9:
                tips.append(
                    f"'{cat}' kategorisinde son 30 günde {spent:,.0f} TL harcadınız; "
                    f"limit {cap:,.0f} TL'ye yaklaşıyor veya aştı. Harcamayı yeniden planlayın."
                )

    if not tips:
        tips.append(
            "Piyasa ve hedef verileriniz şu an dengeli görünüyor; haftalık harcama kontrolü ile takibi sürdürün."
        )
    return tips
