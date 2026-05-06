"""
Finansal AI Asistan – Anthropic API entegrasyonu
"""
import os
import httpx
from typing import List, Dict, Any

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages"
MODEL             = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """Sen, kullanıcıların finansal verilerini analiz eden ve tavsiye veren 
profesyonel bir Türk finansal danışmansın. Adın FINARA.

Görevin:
- Kullanıcının harcama alışkanlıklarını analiz etmek
- Tasarruf önerileri sunmak
- Kredi skoru iyileştirme tavsiyeleri vermek
- Fraud risklerini açıklamak
- Bütçe planlaması yapmak

Her zaman:
- Somut, ölçülebilir öneriler ver
- Türkçe yanıtla
- Olumlu ve motive edici bir dil kullan
- Yanıtlarını kısa ve öz tut (maksimum 3-4 paragraf)
"""

async def chat_with_assistant(
    user_message: str,
    financial_context: Dict[str, Any],
    history: List[Dict[str, str]] | None = None,
) -> str:
    if history is None:
        history = []

    context_str = _format_context(financial_context)
    enriched_message = f"[Finansal Durum]\n{context_str}\n\n[Soru]\n{user_message}"

    messages = [
        *[{"role": m["role"], "content": m["content"]} for m in history[-6:]],
        {"role": "user", "content": enriched_message},
    ]

    if not ANTHROPIC_API_KEY:
        return _mock_response(user_message, financial_context)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key":         ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type":      "application/json",
            },
            json={
                "model":      MODEL,
                "max_tokens": 800,
                "system":     SYSTEM_PROMPT,
                "messages":   messages,
            },
        )
        resp.raise_for_status()
        data = resp.json()
        return data["content"][0]["text"]

def _format_context(ctx: Dict[str, Any]) -> str:
    lines = []
    if "credit_score" in ctx:
        lines.append(f"Kredi Skoru: {ctx['credit_score']} ({ctx.get('score_label','')})")
    if "total_assets" in ctx:
        lines.append(f"Toplam Varlık: {ctx['total_assets']:,.0f} TL")
    if "monthly_spending" in ctx:
        lines.append(f"Aylık Harcama: {ctx['monthly_spending']:,.0f} TL")
    if "savings_rate" in ctx:
        lines.append(f"Tasarruf Oranı: %{ctx['savings_rate']}")
    if "risk_status" in ctx:
        lines.append(f"Risk Durumu: {ctx['risk_status']}")
    if "category_breakdown" in ctx:
        lines.append("Harcama Kategorileri:")
        for cat, amt in ctx["category_breakdown"].items():
            lines.append(f"  • {cat}: {amt:,.0f} TL")
    return "\n".join(lines) if lines else "Veri mevcut değil."

def _mock_response(message: str, ctx: Dict[str, Any]) -> str:
    """API anahtarı yokken demo yanıt."""
    score = ctx.get("credit_score", 680)
    spending = ctx.get("monthly_spending", 5000)
    savings = ctx.get("savings_rate", 15)

    if any(w in message.lower() for w in ["kredi", "skor", "puan"]):
        return (
            f"Kredi skorunuz {score} olup **{ctx.get('score_label','İyi')}** seviyededir. "
            f"Skoru yükseltmek için: düzenli ve zamanında ödemeler yapın, "
            f"kredi kartı kullanım oranınızı %30'un altında tutun ve "
            f"gereksiz yeni kredi başvurularından kaçının. "
            f"Bu adımlarla 6 ay içinde 30-50 puan artış mümkün."
        )
    if any(w in message.lower() for w in ["harca", "tasarruf", "bütçe"]):
        return (
            f"Aylık {spending:,.0f} TL harcamanızda en büyük fırsatlar: "
            f"'Market & Gıda' kategorisinde haftalık plan yaparak %15-20 tasarruf sağlayabilirsiniz. "
            f"Mevcut %{savings} tasarruf oranınızı %20'nin üzerine çıkarmak için "
            f"aboneliklerinizi gözden geçirmenizi öneririm. "
            f"Küçük düzenlemelerle ayda ekstra 500-800 TL biriktirebilirsiniz."
        )
    return (
        "Finansal durumunuz genel olarak sağlıklı görünüyor. "
        "Harcamalarınızı düzenli takip etmek, bütçenizi kontrol altında tutmanın en etkili yolu. "
        "Daha spesifik bir konuda yardımcı olmamı ister misiniz? "
        "Örneğin kredi skoru, harcama optimizasyonu veya tasarruf planı hakkında konuşabiliriz."
    )