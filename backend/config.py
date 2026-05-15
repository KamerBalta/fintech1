from functools import lru_cache
from pathlib import Path

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    APP_NAME: str = "FINARA Pro"
    DEBUG: bool = True

    # JWT
    SECRET_KEY: str = "finara-super-secret-key-change-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24

    # MongoDB (Motor)
    MONGO_URI: str = "mongodb://localhost:27017"
    MONGO_DB_NAME: str = "finara"

    # Dosya yükleme
    UPLOAD_DIR: str = str(Path(__file__).resolve().parent / "uploads")

    # Market API
    EXCHANGE_API_KEY: str = "demo"
    EXCHANGE_API_URL: str = "https://v6.exchangerate-api.com/v6"
    MARKET_CACHE_TTL: int = 600

    # Google Gemini (Finansal Asistan)
    GOOGLE_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = str(Path(__file__).resolve().parent / ".env")
        env_file_encoding = "utf-8"


@lru_cache
def get_settings() -> Settings:
    return Settings()
