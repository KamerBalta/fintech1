import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from services.session import get_db
from models.goal import Goal
from models.user import User
from schemas.schemas import GoalCreate, GoalUpdate, GoalOut
from services.security import get_current_user

router = APIRouter(prefix="/goals", tags=["Goals"])


def _to_out(g: Goal) -> GoalOut:
    pct = min(100.0, round(g.saved_amount / g.target_amount * 100, 1)) if g.target_amount else 0.0
    days = None
    if g.deadline:
        try:
            delta = (datetime.date.fromisoformat(g.deadline) - datetime.date.today()).days
            days = max(0, delta)
        except ValueError:
            pass
    return GoalOut(
        id=g.id, title=g.title, emoji=g.emoji,
        target_amount=g.target_amount, saved_amount=g.saved_amount,
        deadline=g.deadline, category=g.category,
        progress_pct=pct, days_remaining=days,
    )


@router.get("/", response_model=list[GoalOut])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [_to_out(g) for g in db.query(Goal).filter(Goal.user_id == user.id).all()]


@router.post("/", response_model=GoalOut, status_code=201)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = Goal(**payload.model_dump(), user_id=user.id)
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return _to_out(goal)


@router.patch("/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: int, payload: GoalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    for k, v in payload.model_dump(exclude_none=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return _to_out(goal)


@router.delete("/{goal_id}", status_code=204)
def delete_goal(goal_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.user_id == user.id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    db.delete(goal)
    db.commit()