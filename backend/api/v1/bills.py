import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from services.session import get_db
from models.bill import Bill
from models.user import User
from schemas.schemas import BillCreate, BillOut
from services.security import get_current_user

router = APIRouter(prefix="/bills", tags=["Bills"])


def _to_out(b: Bill) -> BillOut:
    today = datetime.date.today()
    due   = datetime.date(today.year, today.month, min(b.due_day, 28))
    if due < today:
        if today.month == 12:
            due = datetime.date(today.year + 1, 1, min(b.due_day, 28))
        else:
            due = datetime.date(today.year, today.month + 1, min(b.due_day, 28))
    days_until = (due - today).days
    return BillOut(
        id=b.id, name=b.name, amount=b.amount,
        due_day=b.due_day, category=b.category,
        is_active=b.is_active, last_paid=b.last_paid,
        days_until=days_until,
    )


@router.get("/", response_model=list[BillOut])
def list_bills(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bills = db.query(Bill).filter(Bill.user_id == user.id, Bill.is_active == True).all()
    return sorted([_to_out(b) for b in bills], key=lambda x: x.days_until)


@router.post("/", response_model=BillOut, status_code=201)
def create_bill(payload: BillCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bill = Bill(**payload.model_dump(), user_id=user.id)
    db.add(bill)
    db.commit()
    db.refresh(bill)
    return _to_out(bill)


@router.patch("/{bill_id}/paid", response_model=BillOut)
def mark_paid(bill_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    bill.last_paid = str(datetime.date.today())
    db.commit()
    db.refresh(bill)
    return _to_out(bill)


@router.delete("/{bill_id}", status_code=204)
def delete_bill(bill_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    bill = db.query(Bill).filter(Bill.id == bill_id, Bill.user_id == user.id).first()
    if not bill:
        raise HTTPException(status_code=404, detail="Fatura bulunamadı")
    db.delete(bill)
    db.commit()