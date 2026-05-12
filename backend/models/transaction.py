from sqlalchemy import Column, Integer, String, Float, Boolean, Date, DateTime, ForeignKey, func
from sqlalchemy.orm import relationship
from services.session import Base

class Transaction(Base):
    __tablename__ = "transactions"

    id           = Column(Integer, primary_key=True, index=True)
    user_id      = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    date         = Column(String, nullable=False)
    description  = Column(String, nullable=False)
    amount       = Column(Float, nullable=False)
    category     = Column(String, default="Diğer")
    is_recurring = Column(Boolean, default=False)  # Fatura / abonelik
    is_fraud     = Column(Boolean, default=False)
    risk_score   = Column(Float, default=0.0)
    risk_level   = Column(String, default="Düşük")
    xai_reasons  = Column(String, default="")      # JSON string
    source       = Column(String, default="manual") # pdf | manual | api
    created_at   = Column(DateTime(timezone=True), server_default=func.now())

    owner = relationship("User", back_populates="transactions")