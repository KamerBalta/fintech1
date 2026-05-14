from pydantic import BaseModel, EmailStr, Field, field_validator
from typing import Optional, List, Any
import datetime


# ─── Auth ─────────────────────────────────────────────────────────────────────
class UserRegister(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=100)
    password: str = Field(min_length=6)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class BankProfileOut(BaseModel):
    bank_id: str
    statement_day: Optional[int] = Field(default=None, ge=1, le=31)
    monthly_credit_limit: Optional[float] = Field(default=None, ge=0)
    display_name: Optional[str] = Field(default=None, max_length=100)


class BankProfilesPatchBody(BaseModel):
    """Kullanıcı banka profillerini tam liste olarak gönderir (üzerine yazar)."""

    bank_profiles: List[BankProfileOut] = Field(default_factory=list)


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    created_at: datetime.datetime
    bank_profiles: List[BankProfileOut] = []

    class Config:
        from_attributes = True


class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ─── Transaction ──────────────────────────────────────────────────────────────
class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float = Field(gt=0)
    category: str = "Diğer"
    is_recurring: bool = False


class TransactionOut(BaseModel):
    id: str
    date: str
    description: str
    amount: float
    category: str
    is_recurring: bool
    is_fraud: bool
    risk_score: float
    risk_level: str
    xai_reasons: str
    source: str
    is_anomaly: bool = False
    statement_file: Optional[str] = None
    bank_id: str = "legacy"
    bank_name: str = ""

    class Config:
        from_attributes = True


# ─── Goal ─────────────────────────────────────────────────────────────────────
class GoalCreate(BaseModel):
    title: str = Field(min_length=1, max_length=100)
    emoji: str = "🎯"
    target_amount: float = Field(gt=0)
    saved_amount: float = Field(ge=0, default=0.0)
    deadline: Optional[str] = None
    category: str = "Genel"


class GoalUpdate(BaseModel):
    saved_amount: Optional[float] = None
    title: Optional[str] = None
    target_amount: Optional[float] = None
    deadline: Optional[str] = None


class GoalOut(BaseModel):
    id: str
    title: str
    emoji: str
    target_amount: float
    saved_amount: float
    deadline: Optional[str]
    category: str
    progress_pct: float = 0.0
    days_remaining: Optional[int] = None

    class Config:
        from_attributes = True


# ─── Bill ─────────────────────────────────────────────────────────────────────
class BillCreate(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    amount: float = Field(gt=0)
    due_day: int = Field(ge=1, le=31)
    category: str = "Fatura"
    last_paid: Optional[str] = None


class BillOut(BaseModel):
    id: str
    name: str
    amount: float
    due_day: int
    category: str
    is_active: bool
    last_paid: Optional[str]
    days_until: Optional[int] = None

    class Config:
        from_attributes = True


# ─── Limits ───────────────────────────────────────────────────────────────────
class LimitCreate(BaseModel):
    category: str = Field(min_length=1, max_length=80)
    monthly_cap: float = Field(gt=0)
    bank_id: str = Field(default="all", min_length=1, max_length=40)


class LimitUpdate(BaseModel):
    category: str | None = Field(default=None, min_length=1, max_length=80)
    monthly_cap: float | None = Field(default=None, gt=0)


class LimitOut(BaseModel):
    id: str
    category: str
    monthly_cap: float
    bank_id: str = "all"


# ─── Market ───────────────────────────────────────────────────────────────────
class MarketRate(BaseModel):
    symbol: str
    rate: float
    change_pct: float = 0.0
    updated_at: str


class MarketDataOut(BaseModel):
    rates: List[MarketRate]
    cached: bool


class SubscriptionRowOut(BaseModel):
    label: str
    monthly_estimate_try: float
    sample_count: int
    bank_id: Optional[str] = None
    last_seen: Optional[str] = None


class SubscriptionsSummaryOut(BaseModel):
    items: List[SubscriptionRowOut]
    monthly_total_try: float


# ─── PDF Upload ───────────────────────────────────────────────────────────────
class PDFAnalysisOut(BaseModel):
    success: bool
    transaction_count: int
    skipped_duplicates: int = 0
    transactions: List[TransactionOut]
    category_breakdown: dict[str, float]
    total_spending: float
    fraud_count: int
    recurring_count: int
    bill_forecast: float
    ai_insights: List[str]
    statement_path: Optional[str] = None
    bank_id: str = "diger"
    bank_display_name: str = ""


# ─── Chat ─────────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(min_length=1)
    financial_context: dict = Field(default_factory=dict)
    history: List[dict] = Field(default_factory=list)
    bank_id: Optional[str] = Field(
        default=None,
        description="Yalnızca bu bankanın işlemleri; boş veya 'all' = tüm bankalar",
    )


class ChatOut(BaseModel):
    success: bool
    reply: str


# ─── Manual total assets (MongoDB users.manual_total_assets) ─────────────────
class ManualTotalAssetsBody(BaseModel):
    """None = otomatik hesaplamaya dön (alanı kaldır)."""

    manual_total_assets: float | None = None

    @field_validator("manual_total_assets")
    @classmethod
    def non_negative(cls, v: float | None) -> float | None:
        if v is not None and v < 0:
            raise ValueError("Toplam varlık negatif olamaz")
        return v


# ─── Insights ─────────────────────────────────────────────────────────────────
class InsightsOut(BaseModel):
    credit_score: int
    score_label: str
    total_assets: float
    total_assets_computed: float = 0.0
    manual_total_assets: Optional[float] = None
    monthly_income: float
    monthly_spending: float
    savings_rate: float
    risk_status: str
    active_alerts: int
    radar_data: dict
    spending_forecast: List[dict]
    goal_advice: List[str]
    financial_health_score: float = 0.0
    financial_health_label: str = ""
    advisory_tips: List[str] = []
    analytics_focus_month: Optional[str] = None
    analytics_period_label: str = ""
