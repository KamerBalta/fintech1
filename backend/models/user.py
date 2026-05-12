from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from services.session import Base


class User(Base):
    __tablename__ = "users"

    id         = Column(Integer, primary_key=True, index=True)
    email      = Column(String, unique=True, index=True, nullable=False)
    full_name  = Column(String, nullable=False)
    hashed_pw  = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    transactions = relationship("Transaction", back_populates="owner", cascade="all, delete")
    goals        = relationship("Goal",        back_populates="owner", cascade="all, delete")
    bills        = relationship("Bill",        back_populates="owner", cascade="all, delete")