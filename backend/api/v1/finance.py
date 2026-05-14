from fastapi import APIRouter, Depends, Query

from database import get_db, txn_doc_to_out
from schemas.schemas import (
    TransactionOut,
    InsightsOut,
    ChatRequest,
    ChatOut,
    MarketDataOut,
    ManualTotalAssetsBody,
)
from services.security import get_current_user, MongoUser
from services import fraud_service, chatbot_service as chat_service, market_service
from services import anomaly_service, credit_service

router = APIRouter(tags=["Finance"])


@router.get("/market-data", response_model=MarketDataOut)
async def get_market_data():
    return await market_service.get_market_data()


@router.get("/transactions", response_model=list[TransactionOut])
async def get_transactions(
    limit: int = Query(200, ge=1, le=2000),
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    cur = db.transactions.find({"user_id": user.id}).sort("created_at", -1).limit(limit)
    out: list[TransactionOut] = []
    async for doc in cur:
        out.append(TransactionOut.model_validate(txn_doc_to_out(doc)))
    return out


@router.post("/predict-fraud")
async def predict_fraud_endpoint(payload: dict, user: MongoUser = Depends(get_current_user)):
    _ = user
    result = fraud_service.predict_fraud(payload)
    return {"success": True, **result}


@router.get("/user-insights", response_model=InsightsOut)
async def user_insights(db=Depends(get_db), user: MongoUser = Depends(get_current_user)):
    await anomaly_service.flag_anomalies_for_user(db, user.id)
    data = await credit_service.get_user_insights(user.id, db)
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
    data = await credit_service.get_user_insights(user.id, db)
    return InsightsOut.model_validate(data)


@router.post("/chat", response_model=ChatOut)
async def chat(
    payload: ChatRequest,
    user: MongoUser = Depends(get_current_user),
):
    _ = user
    reply = await chat_service.chat_with_assistant(
        payload.message,
        payload.financial_context,
        payload.history,
    )
    return ChatOut(success=True, reply=reply)
