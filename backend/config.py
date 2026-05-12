from pydantic_settings import BaseSettings
from functools import lru_cache

class Settings(BaseSettings):
    APP_NAME: str = "FINARA Pro"
    DEBUG: bool = True

    # JWT
    SECRET_KEY: str = "finara-super-secret-key-change-in-production-2025"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24  # 24 saat

    # DB
    DATABASE_URL: str = "sqlite:///./finara.db"

    # Market API
    EXCHANGE_API_KEY: str = "demo"           # exchangerate-api.com ücretsiz key
    EXCHANGE_API_URL: str = "https://v6.exchangerate-api.com/v6"
    MARKET_CACHE_TTL: int = 600              # 10 dakika (saniye)

    # CORS
    ALLOWED_ORIGINS: list[str] = [
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

@lru_cache
def get_settings() -> Settings:
    return Settings()