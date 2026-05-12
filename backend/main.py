"""
FINARA Pro – FastAPI Ana Uygulama
Global Exception Handler | CORS | JWT Auth | SQLAlchemy
"""

import traceback
from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from services.session import init_db

# senin yapı: api/v1
from api.v1 import auth, finance, goals, bills


# ─── Settings ────────────────────────────────────────────────────────────────
settings = get_settings()

# ─── App ─────────────────────────────────────────────────────────────────────
app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="AI Destekli Kişisel Finans ve Güvenlik Platformu",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ─── CORS ────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, "ALLOWED_ORIGINS", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Global Exception Handler ───────────────────────────────────────────────
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    if getattr(settings, "DEBUG", True):
        traceback.print_exc()

    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "detail": f"Sunucu hatası: {str(exc)}",
            "type": type(exc).__name__,
        },
    )


# ─── Routers ────────────────────────────────────────────────────────────────
PREFIX = "/api/v1"

app.include_router(auth.router, prefix=f"{PREFIX}/auth", tags=["Auth"])
app.include_router(finance.router, prefix=f"{PREFIX}/finance", tags=["Finance"])
app.include_router(goals.router, prefix=f"{PREFIX}/goals", tags=["Goals"])
app.include_router(bills.router, prefix=f"{PREFIX}/bills", tags=["Bills"])


# ─── Startup ────────────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    init_db()
    print(f"✅ {settings.APP_NAME} başlatıldı – {PREFIX}")


# ─── Health Check ────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0"
    }