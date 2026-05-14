"""
Finansal AI Asistan — Anthropic veya OpenAI + veri bağlamı (Motor ile üretilir).
"""
from __future__ import annotations

import os
from typing import Any

import httpx

from services.chat_context_service import context_to_prompt_block

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY", "")
ANTHROPIC_URL = "https://api.anthropic.com/v1/messages"
OPENAI_URL = "https://api.openai.com/v1/chat/completions"
ANTHROPIC_MODEL = os.getenv("ANTHROPIC_CHAT_MODEL", "claude-sonnet-4-20250514")
OPENAI_MODEL = os.getenv("OPENAI_CHAT_MODEL", "gpt-4o-mini")

SYSTEM_PROMPT = """Sen FINARA adlı bir Türkçe konuşan AI Finansal Asistanısın. Kullanıcıya bankacılık uygulaması tonunda,
net ve güven veren bir dille yardım edersin.

Kurallar:
- Konuşma dilin Türkçe olmalı.
- Aşağıda verilen JSON bağlamı kullanıcının gerçek veritabanı özetidir. Harcama, limit, hedef ve ekstre rakamlarını
  bu bağlamdan al; bağlamda olmayan tutar veya işlem uydurma. Eksik veri varsa bunu kısaca belirt.
- "Bu ay markete ne kadar?", "en yüksek harcama" gibi sorularda bağlamdaki kategori toplamları ve
  highest_spend_transaction / top_transactions alanlarına dayanarak kesin rakam ve tarih ver.
- Bütçe tahmini ve limit uyarıları için spending_calendar_month_to_date.projected_month_total_linear ve
  limits_mtd satırlarını kullan. Uygunsa proactive_alerts içindeki cümleleri doğal biçimde sohbete serpiştir.
- Tasarruf önerilerinde mom_category_change_pct ve limits_mtd (limit vs harcama) kıyasını kullan.
- Hedef sorularında goals ve insights.goal_advice alanlarını kullan; months_at_current_surplus ve
  months_at_15pct_income tahminlerini açıkla.
- goals[].currency_hint USD/EUR/GBP/XAU ise live_market.rates ile güncel kur/yorum yap (TRY bazlı hesap).
- "Haftalık özet" istendiğinde last_7d_spending ve proactive_alerts üzerinden 4-6 maddelik madde işaretli özet ver.
- Yanıtlar genelde 2-4 kısa paragraf; gerekiyorsa madde işaretleri kullan.
- JSON veya kod bloğu ile ham bağlamı tekrar yazma; düz metin sohbet üret.
"""


def _norm_history(history: list[dict[str, Any]] | None) -> list[dict[str, str]]:
    out: list[dict[str, str]] = []
    for m in history or []:
        role = m.get("role") or "user"
        if role == "ai":
            role = "assistant"
        if role not in ("user", "assistant"):
            role = "user"
        content = str(m.get("content", "")).strip()
        if content:
            out.append({"role": role, "content": content})
    out = out[-12:]
    while out and out[0]["role"] == "assistant":
        out = out[1:]
    fixed: list[dict[str, str]] = []
    for m in out:
        if fixed and fixed[-1]["role"] == m["role"]:
            fixed[-1]["content"] += "\n\n" + m["content"]
        else:
            fixed.append(dict(m))
    return fixed


def _merge_client_context(server_ctx: dict[str, Any], client_ctx: dict[str, Any] | None) -> dict[str, Any]:
    if not client_ctx:
        return server_ctx
    merged = {**server_ctx, "client_notes": client_ctx}
    return merged


async def _call_anthropic(context_block: str, user_message: str, history: list[dict[str, str]]) -> str:
    messages = [
        *[{"role": m["role"], "content": m["content"]} for m in history],
        {"role": "user", "content": f"{context_block}\n\n---\nKullanıcı sorusu:\n{user_message}"},
    ]
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            ANTHROPIC_URL,
            headers={
                "x-api-key": ANTHROPIC_API_KEY,
                "anthropic-version": "2023-06-01",
                "content-type": "application/json",
            },
            json={
                "model": ANTHROPIC_MODEL,
                "max_tokens": 1200,
                "system": SYSTEM_PROMPT,
                "messages": messages,
            },
        )
        resp.raise_for_status()
        return str(resp.json()["content"][0]["text"])


async def _call_openai(context_block: str, user_message: str, history: list[dict[str, str]]) -> str:
    oai_messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        *[{"role": m["role"], "content": m["content"]} for m in history],
        {"role": "user", "content": f"{context_block}\n\n---\nKullanıcı sorusu:\n{user_message}"},
    ]
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            OPENAI_URL,
            headers={"Authorization": f"Bearer {OPENAI_API_KEY}", "content-type": "application/json"},
            json={"model": OPENAI_MODEL, "messages": oai_messages, "temperature": 0.35, "max_tokens": 1200},
        )
        resp.raise_for_status()
        data = resp.json()
        return str(data["choices"][0]["message"]["content"])


def _mock_from_context(user_message: str, ctx: dict[str, Any]) -> str:
    low = user_message.lower()
    mtd = (ctx.get("spending_calendar_month_to_date") or {}).get("total", 0)
    by_cat = (ctx.get("spending_calendar_month_to_date") or {}).get("by_category") or {}
    market = ctx.get("live_market") or {}
    rates = market.get("rates") if isinstance(market, dict) else None
    goals = ctx.get("goals") or []

    lines = [
        "(API anahtarı tanımlı değil — örnek moddasın; gerçek AI yanıtı için ANTHROPIC_API_KEY veya OPENAI_API_KEY ekle.)",
        "",
    ]

    if "markete" in low or "market harcam" in low or "gıda" in low:
        grocery = 0.0
        for k, v in by_cat.items():
            kl = (k or "").lower()
            if any(x in kl for x in ("market", "gıda", "gida", "bakkal", "supermarket")):
                grocery += float(v)
        if grocery > 0:
            lines.append(
                f"Bu ay (takvim ayı, bugüne kadar) market / gıda benzeri kategorilerde toplam: {grocery:,.2f} TL."
            )
        elif by_cat:
            lines.append(
                f"Bu ay bugüne kadar toplam harcama {mtd:,.0f} TL. Market/gıda satırı bağlamda ayrılmamışsa kategori isimlerine bak."
            )
        else:
            lines.append(f"Bu ay bugüne kadar harcama kaydı (gelir hariç) görünmüyor veya MTD: {mtd:,.0f} TL.")

    if "yüksek" in low or "fazla" in low or "en çok" in low:
        hi = ctx.get("highest_spend_transaction_this_month")
        if hi:
            lines.append(
                f"Bu ayın şu ana kadarki en yüksek tek harcaması: {hi['amount']:,.2f} TL — "
                f"{hi.get('description', '')} ({hi.get('category')}, {hi.get('date')})."
            )

    if "tatil" in low or "hedef" in low:
        for g in goals[:2]:
            lines.append(
                f"Hedef '{g.get('title')}': {g.get('saved_amount')} / {g.get('target_amount')} TL; "
                f"kalan {g.get('remaining')} TL. Tahmini süre (mevcut fazla): {g.get('months_at_current_surplus')} ay."
            )

    if "özet" in low or "haftalık" in low:
        wk = ctx.get("last_7d_spending") or {}
        lines.append("Son 7 gün (bağlamdan):")
        lines.append(f"- Toplam harcama: {wk.get('total', 0):,.0f} TL")

    if "kur" in low or "dolar" in low or "euro" in low or "altın" in low:
        if rates:
            lines.append("Güncel kurlar (özet): " + ", ".join(f"{r.get('symbol')}={r.get('rate')}" for r in rates[:4]))

    for a in (ctx.get("proactive_alerts") or [])[:2]:
        lines.append(f"Not: {a}")

    if len(lines) <= 2:
        tips = (ctx.get("insights") or {}).get("advisory_tips") or []
        if tips:
            lines.append("Öneri: " + str(tips[0]))
        else:
            lines.append(
                f"Özet: Bu ay MTD harcama {mtd:,.0f} TL. Finansal veriler bağlamda; sorunu detaylandırırsan "
                "rakamlarla yanıtlayabilirim."
            )

    return "\n".join(lines)


async def chat_with_assistant(
    user_message: str,
    server_context: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
    client_context: dict[str, Any] | None = None,
) -> str:
    merged = _merge_client_context(server_context, client_context)
    block = context_to_prompt_block(merged)
    hist = _norm_history(history)

    if ANTHROPIC_API_KEY:
        return await _call_anthropic(block, user_message, hist)
    if OPENAI_API_KEY:
        return await _call_openai(block, user_message, hist)
    return _mock_from_context(user_message, merged)
