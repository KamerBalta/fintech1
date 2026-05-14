from fastapi import APIRouter, Depends, Query

from app.utils.dates import parse_txn_date
from database import get_db, txn_doc_to_out
from schemas.schemas import (
    TransactionOut,
    InsightsOut,
    ChatRequest,
    ChatOut,
    MarketDataOut,
    ManualTotalAssetsBody,
    SubscriptionsSummaryOut,
    SubscriptionRowOut,
)
from services.security import get_current_user, MongoUser
from services import fraud_service, chatbot_service as chat_service, market_service
from services import anomaly_service, credit_service, subscription_service
from services.chat_context_service import build_financial_assistant_context
from services.bank_registry import list_banks_public
from services.bank_slug import normalize_bank_id
from services.transaction_dedupe import dedupe_mongo_transaction_docs

router = APIRouter(tags=["Finance"])


def _norm_bank_filter(bank_id: str | None) -> str | None:
    if not bank_id or str(bank_id).strip() in ("", "all"):
        return None
    return normalize_bank_id(str(bank_id).strip())


@router.get("/market-data", response_model=MarketDataOut)
async def get_market_data():
    return await market_service.get_market_data()


@router.get("/banks")
async def list_banks():
    return list_banks_public()


@router.get("/subscriptions", response_model=SubscriptionsSummaryOut)
async def list_subscriptions(
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
    bank_id: str | None = Query(None),
):
    bid = _norm_bank_filter(bank_id)
    await subscription_service.refresh_subscription_flags(db, user.id)
    rows = await subscription_service.subscription_monthly_summary(db, user.id, bank_id=bid)
    total = sum(float(r["monthly_estimate_try"]) for r in rows)
    return SubscriptionsSummaryOut(
        items=[SubscriptionRowOut.model_validate(r) for r in rows],
        monthly_total_try=round(total, 2),
    )


@router.get("/transactions", response_model=list[TransactionOut])
async def get_transactions(
    limit: int = Query(200, ge=1, le=2000),
    bank_id: str | None = Query(None, description="Belirtilirse yalnızca o bankanın işlemleri"),
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    cap = min(max(limit * 4, limit), 4000)
    q: dict = {"user_id": user.id}
    nb = _norm_bank_filter(bank_id)
    if nb:
        q["bank_id"] = nb
    cur = db.transactions.find(q).sort("created_at", -1).limit(cap)
    raw: list[dict] = []
    async for doc in cur:
        raw.append(doc)
    deduped = dedupe_mongo_transaction_docs(raw, prefer="newest")

    def sort_key(d: dict) -> tuple:
        ds = str(d.get("date", ""))
        pd = parse_txn_date(ds)
        return (pd.isoformat() if pd else ds, str(d.get("_id", "")))

    deduped.sort(key=sort_key, reverse=True)
    return [TransactionOut.model_validate(txn_doc_to_out(d)) for d in deduped[:limit]]


@router.post("/predict-fraud")
async def predict_fraud_endpoint(payload: dict, user: MongoUser = Depends(get_current_user)):
    _ = user
    result = fraud_service.predict_fraud(payload)
    return {"success": True, **result}


@router.get("/user-insights", response_model=InsightsOut)
async def user_insights(
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
    bank_id: str | None = Query(None),
):
    await anomaly_service.flag_anomalies_for_user(db, user.id)
    data = await credit_service.get_user_insights(user.id, db, bank_id=_norm_bank_filter(bank_id))
    return InsightsOut.model_validate(data)


@router.patch("/manual-total-assets", response_model=InsightsOut)
async def patch_manual_total_assets(
    payload: ManualTotalAssetsBody,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    if payload.manual_total_assets is None:
        await db.users.update_one({"_id": user.id}, {"$unset": {"manual_total_assets": ""}})
    else:
        await db.users.update_one(
            {"_id": user.id},
            {"$set": {"manual_total_assets": float(payload.manual_total_assets)}},
        )
    await anomaly_service.flag_anomalies_for_user(db, user.id)
    data = await credit_service.get_user_insights(user.id, db, bank_id=None)
    return InsightsOut.model_validate(data)


@router.post("/chat", response_model=ChatOut)
async def chat(
    payload: ChatRequest,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    bid = (payload.bank_id or "").strip() or None
    if bid in (None, "", "all"):
        bid = None
    else:
        bid = normalize_bank_id(bid)
    server_ctx = await build_financial_assistant_context(db, user.id, bank_id=bid)
    reply = await chat_service.chat_with_assistant(
        payload.message,
        server_ctx,
        payload.history,
        client_context=payload.financial_context or None,
    )
    return ChatOut(success=True, reply=reply)
