import datetime

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, Depends, HTTPException

from database import get_db
from schemas.schemas import GoalCreate, GoalUpdate, GoalOut
from services.security import get_current_user, MongoUser

router = APIRouter(tags=["Goals"])


def _to_out(g: dict) -> GoalOut:
    tgt = float(g.get("target_amount", 0))
    saved = float(g.get("saved_amount", 0))
    pct = min(100.0, round(saved / tgt * 100, 1)) if tgt else 0.0
    days = None
    dl = g.get("deadline")
    if dl:
        try:
            delta = (datetime.date.fromisoformat(str(dl)[:10]) - datetime.date.today()).days
            days = max(0, delta)
        except ValueError:
            pass
    return GoalOut(
        id=str(g["_id"]),
        title=g["title"],
        emoji=g.get("emoji", "🎯"),
        target_amount=tgt,
        saved_amount=saved,
        deadline=g.get("deadline"),
        category=g.get("category", "Genel"),
        progress_pct=pct,
        days_remaining=days,
    )


@router.get("/", response_model=list[GoalOut])
async def list_goals(db=Depends(get_db), user: MongoUser = Depends(get_current_user)):
    goals = await db.goals.find({"user_id": user.id}).sort("created_at", -1).to_list(200)
    return [_to_out(g) for g in goals]


@router.post("/", response_model=GoalOut, status_code=201)
async def create_goal(
    payload: GoalCreate, db=Depends(get_db), user: MongoUser = Depends(get_current_user)
):
    from datetime import datetime, timezone

    doc = {**payload.model_dump(), "user_id": user.id, "created_at": datetime.now(timezone.utc)}
    ins = await db.goals.insert_one(doc)
    g = await db.goals.find_one({"_id": ins.inserted_id})
    return _to_out(g)


@router.patch("/{goal_id}", response_model=GoalOut)
async def update_goal(
    goal_id: str,
    payload: GoalUpdate,
    db=Depends(get_db),
    user: MongoUser = Depends(get_current_user),
):
    try:
        oid = ObjectId(goal_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    goal = await db.goals.find_one({"_id": oid, "user_id": user.id})
    if not goal:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    patch = {k: v for k, v in payload.model_dump(exclude_none=True).items()}
    if patch:
        await db.goals.update_one({"_id": oid}, {"$set": patch})
    g = await db.goals.find_one({"_id": oid})
    return _to_out(g)


@router.delete("/{goal_id}", status_code=204)
async def delete_goal(
    goal_id: str, db=Depends(get_db), user: MongoUser = Depends(get_current_user)
):
    try:
        oid = ObjectId(goal_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
    res = await db.goals.delete_one({"_id": oid, "user_id": user.id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Hedef bulunamadı")
