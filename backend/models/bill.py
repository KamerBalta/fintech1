from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from services.session import get_db
from models.base import Base

class Bill(Base):
    __tablename__ = "bills"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name         = Column(String, nullable=False)
    amount       = Column(Float, nullable=False)
    due_day      = Column(Integer, nullable=False)   # Ayın kaçında
    category     = Column(String, default="Fatura")
    is_active    = Column(Boolean, default=True)
    last_paid    = Column(String, nullable=True)     # ISO date string
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="bills")