from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from models.base import Base
from config import get_settings

settings = get_settings()

engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False}
    if "sqlite" in settings.DATABASE_URL else {},
    echo=settings.DEBUG,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)


# ─── DB Session Dependency ───────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# ─── DB Init ────────────────────────────────────────
def init_db():
    """
    Tüm tabloları oluşturur.
    Modeller Base'e register edilmiş olmalı.
    """

    # modelleri register etmek için import (side-effect)
    import models.user
    import models.transaction
    import models.goal
    import models.bill

    Base.metadata.create_all(bind=engine)