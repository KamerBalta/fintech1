"""
Finansal AI Asistan – Anthropic API + Mock fallback
"""
import os
import httpx
from typing import List, Dict, Any

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
ANTHROPIC_URL     = "https://api.anthropic.com/v1/messages"
MODEL             = "claude-sonnet-4-20250514"

SYSTEM_PROMPT = """Sen FINARA adlı profesyonel bir Türk kişisel finans danışmanısın.
Kullanıcıların finansal verilerini analiz eder, harcama alışkanlıklarını yorumlar ve
somut, kişiselleştirilmiş öneriler sunarsın.

Yanıtların:
- Türkçe ve samimi olmalı
- Maksimum 3-4 paragraf içermeli
- Sayısal hedefler ve tarihler içermeli
- Olumlu, motive edici bir dil kullanmalı
- JSON veya markdown formatından kaçınmalı
"""

MOCK_RESPONSES = [
    "Harcama analizinize göre düzenli faturalarınız aylık bütçenizin önemli bir kısmını oluşturuyor. Telekom ve enerji sağlayıcılarınızı karşılaştırarak yılda 1.500-3.000 TL tasarruf edebilirsiniz.",
    "Kredi skorunuzu iyileştirmek için en etkili yöntem düzenli ödeme alışkanlığıdır. Kartlarınızı limitin %25'i ile kullanın ve en az asgari ödemeyi zamanında yapın.",
    "Tasarruf oranınızı artırmak için '50-30-20' kuralını deneyebilirsiniz: Gelirinizin %50'si zorunlu giderler, %30'u istekler, %20'si tasarruf.",
    "Yatırım açısından değerlendirdiğimde, enflasyona karşı korunmak için altın veya dolar bazlı araçlara küçük bir pay ayırmanızı öneririm.",
]

async def chat_with_assistant(
    user_message: str,
    financial_context: Dict[str, Any],
    history: List[Dict[str, str]] | None = None,
) -> str:
    history = history or []
    ctx_str = _format_context(financial_context)
    enriched = f"[Kullanıcı Finansal Durumu]\n{ctx_str}\n\n[Soru]\n{user_message}"
    messages = [
        *[{"role": m["role"], "content": m["content"]} for m in history[-6:]],
        {"role": "user", "content": enriched},
    ]

    if not ANTHROPIC_API_KEY:
        import random
        return random.choice(MOCK_RESPONSES)

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={"model": MODEL, "max_tokens": 800, "system": SYSTEM_PROMPT, "messages": messages},
        )
        resp.raise_for_status()
        return resp.json()["content"][0]["text"]


def _format_context(ctx: Dict[str, Any]) -> str:
    parts = []
    for k, label in [
        ("credit_score", "Kredi Skoru"),
        ("total_assets", "Toplam Varlık"),
        ("monthly_spending", "Aylık Harcama"),
        ("savings_rate", "Tasarruf Oranı"),
        ("risk_status", "Risk Durumu"),
    ]:
        if k in ctx:
            val = ctx[k]
            if isinstance(val, float):
                val = f"{val:,.2f}"
            parts.append(f"{label}: {val}")
    return "\n".join(parts) or "Veri yok"