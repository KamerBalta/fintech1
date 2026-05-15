"""
Finansal AI Asistan — Google Gemini Flash + Motor bağlamı.
Gemini hata verirse yanıt MongoDB özetinden üretilir (örnek mod yok).
"""
from __future__ import annotations

import asyncio
import re
from typing import Any

import google.generativeai as genai

from config import get_settings
from services.chat_context_service import context_to_prompt_block

# gemini-1.5-flash API'de kaldırıldı; ücretsiz katmanda çalışan modeller:
# gemini-2.5-flash, gemini-flash-latest
DEFAULT_GEMINI_MODEL = "gemini-2.5-flash"

SYSTEM_PROMPT = """Sen FINARA Finansal Asistanısın. Türkçe konuş; yanıtlar kısa, net ve rakam odaklı olsun.

Veri kaynağı: Kullanıcı mesajından önce verilen JSON, MongoDB transactions koleksiyonundan üretilmiş GERÇEK veridir.

Kurallar:
- Tutarları yalnızca JSON'dan al; uydurma.
- Market/gıda: spending_calendar_month_to_date.by_category.
- En yüksek harcama: highest_spend_transaction_this_month.
- 1-3 kısa paragraf veya madde listesi; ham JSON tekrarlama.
- dismissed_subscriptions: kullanıcının kaldırdığı abonelikler; bunlar hakkında tavsiye verme.
"""


def _google_api_key() -> str:
    return (get_settings().GOOGLE_API_KEY or "").strip()


def _gemini_model_name() -> str:
    return (get_settings().GEMINI_MODEL or DEFAULT_GEMINI_MODEL).strip()


def _configure_genai() -> None:
    key = _google_api_key()
    if key:
        genai.configure(api_key=key)


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
    out = out[-10:]
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
    return {**server_ctx, "client_notes": client_ctx}


def _history_to_gemini_contents(history: list[dict[str, str]]) -> list[dict[str, Any]]:
    contents: list[dict[str, Any]] = []
    for m in history:
        role = "user" if m["role"] == "user" else "model"
        contents.append({"role": role, "parts": [m["content"]]})
    return contents


def _answer_from_context(user_message: str, ctx: dict[str, Any]) -> str:
    """Gemini kullanılamadığında MongoDB bağlamından gerçek rakamlarla yanıt."""
    low = user_message.lower()
    mtd = ctx.get("spending_calendar_month_to_date") or {}
    by_cat: dict[str, float] = mtd.get("by_category") or {}
    total_mtd = float(mtd.get("total") or 0)

    if any(x in low for x in ("market", "markete", "gıda", "gida", "bakkal")):
        grocery = 0.0
        hits: list[str] = []
        for cat, amt in by_cat.items():
            kl = (cat or "").lower()
            if any(x in kl for x in ("market", "gıda", "gida", "bakkal", "supermarket")):
                grocery += float(amt)
                hits.append(f"{cat}: {amt:,.2f} TL")
        if hits:
            return (
                f"Bu ay (bugüne kadar) market / gıda benzeri harcamalarınız toplam **{grocery:,.2f} TL**.\n"
                + "\n".join(f"• {h}" for h in hits)
            )
        if by_cat:
            lines = [f"• {c}: {a:,.2f} TL" for c, a in list(by_cat.items())[:8]]
            return (
                f"Market adıyla eşleşen kategori bulunamadı. Bu ay toplam harcama **{total_mtd:,.2f} TL**. "
                f"Kategori özeti:\n" + "\n".join(lines)
            )
        return "Bu ay için henüz harcama kaydı görünmüyor; PDF ekstre yükleyebilirsiniz."

    if any(x in low for x in ("yüksek", "en çok", "en fazla")):
        hi = ctx.get("highest_spend_transaction_this_month")
        if hi:
            return (
                f"Bu ayın şu ana kadarki en yüksek harcamanız **{hi['amount']:,.2f} TL** — "
                f"{hi.get('description', '')} ({hi.get('category')}, {hi.get('date')})."
            )

    if "özet" in low or "haftalık" in low:
        wk = ctx.get("last_7d_spending") or {}
        lines = [f"• Son 7 gün toplam: **{float(wk.get('total', 0)):,.2f} TL**"]
        for c, a in list((wk.get("by_category") or {}).items())[:6]:
            lines.append(f"• {c}: {a:,.2f} TL")
        for a in (ctx.get("proactive_alerts") or [])[:3]:
            lines.append(f"• {a}")
        return "Haftalık özet:\n" + "\n".join(lines)

    if total_mtd > 0:
        top = list(by_cat.items())[:5]
        lines = [f"• {c}: {a:,.2f} TL" for c, a in top]
        return (
            f"Bu ay bugüne kadar toplam harcamanız **{total_mtd:,.2f} TL**.\n"
            + "Öne çıkan kategoriler:\n"
            + "\n".join(lines)
        )
    return "Finansal kayıt bulunamadı. Önce PDF ekstre yükleyin veya işlem ekleyin."


def _call_gemini_sync(context_block: str, user_message: str, history: list[dict[str, str]]) -> str:
    _configure_genai()
    model = genai.GenerativeModel(
        _gemini_model_name(),
        system_instruction=SYSTEM_PROMPT,
    )
    contents = _history_to_gemini_contents(history)
    final_user = (
        f"{context_block}\n\n---\nKullanıcı sorusu: {user_message}\n"
        "Yanıtı yalnızca yukarıdaki verilere dayanarak ver."
    )
    contents.append({"role": "user", "parts": [final_user]})

    response = model.generate_content(
        contents,
        generation_config={"temperature": 0.2, "max_output_tokens": 1024, "top_p": 0.9},
    )
    text = getattr(response, "text", None)
    if text:
        return str(text).strip()
    if response.candidates:
        parts = response.candidates[0].content.parts
        if parts and getattr(parts[0], "text", None):
            return str(parts[0].text).strip()
    return ""


async def _call_gemini(context_block: str, user_message: str, history: list[dict[str, str]]) -> str:
    return await asyncio.to_thread(_call_gemini_sync, context_block, user_message, history)


async def chat_with_assistant(
    user_message: str,
    server_context: dict[str, Any],
    history: list[dict[str, Any]] | None = None,
    client_context: dict[str, Any] | None = None,
) -> str:
    merged = _merge_client_context(server_context, client_context)
    msg = user_message.strip()
    if not msg:
        return "Lütfen bir soru yazın."

    if not _google_api_key():
        return _answer_from_context(msg, merged)

    block = context_to_prompt_block(merged)
    hist = _norm_history(history)

    try:
        reply = await asyncio.wait_for(
            _call_gemini(block, msg, hist),
            timeout=90.0,
        )
        if reply:
            return reply
    except asyncio.TimeoutError:
        pass
    except Exception as exc:
        err = str(exc).lower()
        if "404" in err and "not found" in err:
            pass
        elif "resourceexhausted" in err or "429" in err or "quota" in err:
            pass
        else:
            m = re.search(r"message['\"]?\s*:\s*['\"]([^'\"]+)", str(exc))
            if m and len(m.group(1)) < 200:
                return (
                    f"AI servisi şu an yanıt veremedi ({m.group(1)}). "
                    "Aşağıda veritabanı özetiniz:\n\n"
                    + _answer_from_context(msg, merged)
                )

    return _answer_from_context(msg, merged)
