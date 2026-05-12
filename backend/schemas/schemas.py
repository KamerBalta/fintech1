from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Any
import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email:     EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password:  str = Field(min_length=6)

class UserLogin(BaseModel):
    email:    EmailStr
    password: str

class UserOut(BaseModel):
    id:         int
    email:      str
    full_name:  str
    created_at: datetime.datetime

    class Config:
        from_attributes = True

class TokenOut(BaseModel):
    access_token: str
    token_type:   str = "bearer"
    user:         UserOut


# ─── Transaction ──────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    date:        str
    description: str
    amount:      float = Field(gt=0)
    category:    str = "Diğer"
    is_recurring:bool = False

class TransactionOut(BaseModel):
    id:           int
    date:         str
    description:  str
    amount:       float
    category:     str
    is_recurring: bool
    is_fraud:     bool
    risk_score:   float
    risk_level:   str
    xai_reasons:  str
    source:       str

    class Config:
        from_attributes = True


# ─── Goal ─────────────────────────────────────────────────────────────────────
class GoalCreate(BaseModel):
    title:         str = Field(min_length=1, max_length=100)
    emoji:         str = "🎯"
    target_amount: float = Field(gt=0)
    saved_amount:  float = Field(ge=0, default=0.0)
    deadline:      Optional[str] = None
    category:      str = "Genel"

class GoalUpdate(BaseModel):
    saved_amount: Optional[float] = None
    title:        Optional[str] = None
    target_amount:Optional[float] = None
    deadline:     Optional[str] = None

class GoalOut(BaseModel):
    id:            int
    title:         str
    emoji:         str
    target_amount: float
    saved_amount:  float
    deadline:      Optional[str]
    category:      str
    progress_pct:  float = 0.0
    days_remaining:Optional[int] = None

    class Config:
        from_attributes = True


# ─── Bill ─────────────────────────────────────────────────────────────────────
class BillCreate(BaseModel):
    name:      str = Field(min_length=1, max_length=100)
    amount:    float = Field(gt=0)
    due_day:   int = Field(ge=1, le=31)
    category:  str = "Fatura"
    last_paid: Optional[str] = None

class BillOut(BaseModel):
    id:        int
    name:      str
    amount:    float
    due_day:   int
    category:  str
    is_active: bool
    last_paid: Optional[str]
    days_until:Optional[int] = None

    class Config:
        from_attributes = True


# ─── Market ───────────────────────────────────────────────────────────────────
class MarketRate(BaseModel):
    symbol:     str
    rate:       float
    change_pct: float = 0.0
    updated_at: str

class MarketDataOut(BaseModel):
    rates: List[MarketRate]
    cached: bool


# ─── PDF Upload ───────────────────────────────────────────────────────────────
class PDFAnalysisOut(BaseModel):
    success:            bool
    transaction_count:  int
    transactions:       List[TransactionOut]
    category_breakdown: dict[str, float]
    total_spending:     float
    fraud_count:        int
    recurring_count:    int
    bill_forecast:      float
    ai_insights:        List[str]


# ─── Chat ─────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message:           str = Field(min_length=1)
    financial_context: dict = {}
    history:           List[dict] = []

class ChatOut(BaseModel):
    success: bool
    reply:   str


# ─── Insights ─────────────────────────────────────────────────────────────────
class InsightsOut(BaseModel):
    credit_score:      int
    score_label:       str
    total_assets:      float
    monthly_income:    float
    monthly_spending:  float
    savings_rate:      float
    risk_status:       str
    active_alerts:     int
    radar_data:        dict
    spending_forecast: List[dict]
    goal_advice:       List[str]