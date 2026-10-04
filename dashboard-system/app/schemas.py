from datetime import datetime
from typing import Optional
from pydantic import BaseModel, ConfigDict


class OutBase(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    reviewed: bool = False
    notes: Optional[str] = None


# ---------- Auth ----------

class LoginRequest(BaseModel):
    username: str
    password: str


class LoginStepResponse(BaseModel):
    otp_required: bool
    message: str


class VerifyOtpRequest(BaseModel):
    username: str
    code: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    department: Optional[str] = None
    full_name: Optional[str] = None


class RegisterRequest(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    national_id: Optional[str] = None
    requested_department: Optional[str] = None


class RegisterResponse(BaseModel):
    message: str


# ---------- Users (admin management) ----------

class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: str
    email: str
    full_name: Optional[str] = None
    national_id: Optional[str] = None
    role: str
    department: Optional[str] = None


class UserUpdate(BaseModel):
    email: Optional[str] = None
    full_name: Optional[str] = None
    role: Optional[str] = None
    department: Optional[str] = None


# ---------- Courses ----------

class CourseCreate(BaseModel):
    date: Optional[str] = None
    course_name: str
    enrolled_count: int = 0
    attended_count: int = 0
    certificates_issued: int = 0
    rating: Optional[str] = None
    teachers_count: Optional[str] = None
    notes: Optional[str] = None


class CourseOut(CourseCreate, OutBase):
    pass


# ---------- Q&A ----------

class QnaCreate(BaseModel):
    date: Optional[str] = None
    question: str
    status: Optional[str] = None
    country: Optional[str] = None
    notes: Optional[str] = None


class QnaOut(QnaCreate, OutBase):
    pass


# ---------- Projects ----------

class ProjectCreate(BaseModel):
    date: Optional[str] = None
    name: str
    target_amount: float = 0
    raised_amount: float = 0
    donors_count: int = 0
    completion_percent: Optional[str] = None
    notes: Optional[str] = None


class ProjectOut(ProjectCreate, OutBase):
    pass


class SubscriptionCreate(BaseModel):
    package: str
    subscribers_count: int = 0
    total_amount: float = 0
    notes: Optional[str] = None


class SubscriptionOut(SubscriptionCreate, OutBase):
    pass


# ---------- Communities ----------

class CommunityCreate(BaseModel):
    date: Optional[str] = None
    community_type: Optional[str] = None
    name: str
    joined_count: int = 0
    posts_count: int = 0
    notes: Optional[str] = None


class CommunityOut(CommunityCreate, OutBase):
    pass


# ---------- News ----------

class NewsCreate(BaseModel):
    date: Optional[str] = None
    news_count: int = 0
    data_count: int = 0
    notes: Optional[str] = None


class NewsOut(NewsCreate, OutBase):
    pass


# ---------- Site metrics ----------

class SiteMetricCreate(BaseModel):
    source: str
    label: str
    value: Optional[str] = None
    notes: Optional[str] = None


class SiteMetricOut(SiteMetricCreate, OutBase):
    pass


# ---------- Audit log ----------

class AuditLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    username: Optional[str] = None
    action: str
    table_name: str
    record_id: Optional[int] = None
    details: Optional[str] = None
    timestamp: Optional[datetime] = None
