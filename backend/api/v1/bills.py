import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from schemas.schemas import BillCreate, BillOut
from services.security import get_current_user, MongoUser

router = APIRouter(tags=["Bills"])


def _to_out(b: dict) -> BillOut:
    today = datetime.date.today()
    due_day = int(b.get("due_day", 1))
    due = datetime.date(today.year, today.month, min(due_day, 28))
    if due < today:
        if today.month == 12:
            due = datetime.date(today.year + 1, 1, min(due_day, 28))
        else:
            due = datetime.date(today.year, today.month + 1, min(due_day, 28))
    days_until = (due - today).days
    return BillOut(
        id=str(b["_id"]),
        name=b["name"],
        amount=float(b.get("amount", 0)),
        due_day=due_day,
        category=b.get("category", "Fatura"),
        is_active=bool(b.get("is_active", True)),
        last_paid=b.get("last_paid"),
        days_until=days_until,
    )


@router.get("/", response_model=list[BillOut])
async def list_bills(db=Depends(get_db), user: MongoUser = Depends(get_current_user)):
    bills = await db.bills.find({"user_id": user.id, "is_active": True}).to_list(500)
    return sorted([_to_out(b) for b in bills], key=lambda x: x.days_until or 0)


@router.post("/", response_model=BillOut, status_code=201)
async def create_bill(
    payload: BillCreate, db=Depends(get_db), user: MongoUser = Depends(get_current_user)
):
    from datetime import datetime, timezone

    doc = {**payload.model_dump(), "user_id": user.id, "is_active": True, "created_at": datetime.now(timezone.utc)}
    ins = await db.bills.insert_one(doc)
    b = await db.bills.find_one({"_id": ins.inserted_id})
    return _to_out(b)


@router.patch("/{bill_id}/paid", response_model=BillOut)
async def mark_paid(
    bill_id: str, db=Depends(get_db), user: MongoUser = Depends(get_current_user)
):
    try:
        oid = ObjectId(bill_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    bill = await db.bills.find_one({"_id": oid, "user_id": user.id})
    if not bill:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    await db.bills.update_one(
        {"_id": oid},
        {"$set": {"last_paid": str(datetime.date.today())}},
    )
    b = await db.bills.find_one({"_id": oid})
    return _to_out(b)


@router.delete("/{bill_id}", status_code=204)
async def delete_bill(
    bill_id: str, db=Depends(get_db), user: MongoUser = Depends(get_current_user)
):
    try:
        oid = ObjectId(bill_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    res = await db.bills.delete_one({"_id": oid, "user_id": user.id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
