"""
Kullanıcı abonelik kayıtları — silme (is_active=false).
"""
from __future__ import annotations

from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException
from bson import ObjectId

from database import get_db
from services.security import MongoUser, get_current_user
from services import subscription_service

router = APIRouter(tags=["Subscriptions"])


@router.delete("/{subscription_id}", status_code=204)
async def delete_subscription(
    subscription_id: str,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    try:
        oid = ObjectId(subscription_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Abonelik bulunamadı")

    ok = await subscription_service.deactivate_subscription(db, user.id, oid)
    if not ok:
        raise HTTPException(status_code=404, detail="Abonelik bulunamadı")
    return None
