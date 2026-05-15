"""
FINARA Pro – FastAPI Ana Uygulama
Global Exception Handler | CORS | JWT Auth | MongoDB (Motor)
"""

import traceback
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI, Request, status
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from database import connect_db, close_db, seed_initial_data_if_empty

from api.v1 import auth, finance, goals, bills, limits, statement, export_routes, subscriptions

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    await connect_db()
    await seed_initial_data_if_empty()
    try:
        yield
    finally:
        await close_db()


app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="AI Destekli Kişisel Finans ve Güvenlik Platformu",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=getattr(settings, "ALLOWED_ORIGINS", ["*"]),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


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


PREFIX = "/api/v1"

app.include_router(auth.router, prefix=f"{PREFIX}/auth")
app.include_router(finance.router, prefix=f"{PREFIX}/finance")
app.include_router(goals.router, prefix=f"{PREFIX}/goals")
app.include_router(bills.router, prefix=f"{PREFIX}/bills")
app.include_router(limits.router, prefix=f"{PREFIX}/limits")
app.include_router(subscriptions.router, prefix=f"{PREFIX}/subscriptions")
app.include_router(statement.router, prefix=PREFIX)
app.include_router(export_routes.router, prefix=PREFIX)


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": "2.0.0",
    }
