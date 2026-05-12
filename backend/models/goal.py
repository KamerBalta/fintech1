from sqlalchemy import Column, Integer, String, Float, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from services.session import Base


class Goal(Base):
    __tablename__ = "goals"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    title        = Column(String, nullable=False)
    emoji        = Column(String, default="🎯")
    target_amount= Column(Float, nullable=False)
    saved_amount = Column(Float, default=0.0)
    deadline     = Column(String, nullable=True)   # ISO date string
    category     = Column(String, default="Genel")
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="goals")