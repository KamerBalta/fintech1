from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, status

from database import get_db, user_doc_to_out
from schemas.schemas import UserRegister, UserLogin, UserOut, TokenOut
from services.security import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    MongoUser,
)

router = APIRouter(tags=["Auth"])


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(payload: UserRegister, db=Depends(get_db)):
    if await db.users.find_one({"email": payload.email}):
        raise HTTPException(status_code=409, detail="Bu e-posta zaten kayıtlı")

    now = datetime.now(timezone.utc)
    ins = await db.users.insert_one(
        {
            "email": payload.email,
            "full_name": payload.full_name,
            "hashed_pw": hash_password(payload.password),
            "created_at": now,
        }
    )
    user = await db.users.find_one({"_id": ins.inserted_id})
    token = create_access_token(str(user["_id"]))
    return TokenOut(access_token=token, user=UserOut.model_validate(user_doc_to_out(user)))


@router.post("/login", response_model=TokenOut)
async def login(payload: UserLogin, db=Depends(get_db)):
    user = await db.users.find_one({"email": payload.email})
    if not user or not verify_password(payload.password, user["hashed_pw"]):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="E-posta veya şifre hatalı",
        )
    token = create_access_token(str(user["_id"]))
    return TokenOut(access_token=token, user=UserOut.model_validate(user_doc_to_out(user)))


@router.get("/me", response_model=UserOut)
async def me(current_user: MongoUser = Depends(get_current_user), db=Depends(get_db)):
    doc = await db.users.find_one({"_id": current_user.id})
    if not doc:
        raise HTTPException(status_code=404, detail="Kullanıcı bulunamadı")
    return UserOut.model_validate(user_doc_to_out(doc))
