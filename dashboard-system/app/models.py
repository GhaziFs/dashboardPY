from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean
from sqlalchemy.sql import func
from .database import Base

class ReviewMixin:
    reviewed = Column(Boolean, default=False)
    notes = Column(String(1000), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    last_notified_at = Column(DateTime(timezone=True), nullable=True)

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), unique=True, nullable=False)
    email = Column(String(200), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(200), nullable=True)
    national_id = Column(String(50), nullable=True)

    # roles: system_admin / officer / analyst / supervisor / department_editor / pending
    # "pending" = self-registered, awaiting admin approval; no write access anywhere
    role = Column(String(50), default="pending")

    # only relevant when role == department_editor. one of:
    # courses / qna / projects / communities / news / rabita / sheikh / admin_metrics
    department = Column(String(50), nullable=True)

class OtpCode(Base):
    __tablename__ = "otp_codes"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100), nullable=False)
    code = Column(String(10), nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class AuditLog(Base):
    __tablename__ = "audit_log"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(100))
    action = Column(String(50))       # create / update / delete / review
    table_name = Column(String(100))
    record_id = Column(Integer, nullable=True)
    details = Column(String(1000), nullable=True)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())

class Course(ReviewMixin, Base):
    """١. التعليم التفاعلي"""
    __tablename__ = "courses"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(200))
    course_name = Column(String(400), nullable=False)
    enrolled_count = Column(Integer, default=0)
    attended_count = Column(Integer, default=0)
    certificates_issued = Column(Integer, default=0)
    rating = Column(String(50))
    teachers_count = Column(String(20))

class QnaEntry(ReviewMixin, Base):
    """٢. السؤال والجواب"""
    __tablename__ = "qna_entries"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(100))
    question = Column(String(1500), nullable=False)
    status = Column(String(100))
    country = Column(String(150))

class Project(ReviewMixin, Base):
    """٣. المشاريع"""
    __tablename__ = "projects"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(200))
    name = Column(String(600), nullable=False)
    target_amount = Column(Float, default=0)
    raised_amount = Column(Float, default=0)
    donors_count = Column(Integer, default=0)
    completion_percent = Column(String(50))

class Subscription(ReviewMixin, Base):
    """٣. المشاريع - الاشتراكات"""
    __tablename__ = "subscriptions"
    id = Column(Integer, primary_key=True, index=True)
    package = Column(String(300), nullable=False)
    subscribers_count = Column(Integer, default=0)
    total_amount = Column(Float, default=0)

class Community(ReviewMixin, Base):
    """٤. المجتمعات الافتراضية"""
    __tablename__ = "communities"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(100))
    community_type = Column(String(100))
    name = Column(String(400), nullable=False)
    joined_count = Column(Integer, default=0)
    posts_count = Column(Integer, default=0)

class NewsEntry(ReviewMixin, Base):
    """٥. الأخبار والبيانات"""
    __tablename__ = "news_entries"
    id = Column(Integer, primary_key=True, index=True)
    date = Column(String(100))
    news_count = Column(Integer, default=0)
    data_count = Column(Integer, default=0)

class SiteMetric(ReviewMixin, Base):
    """٦+٧+٨. موقع الرابطة / معالي الشيخ / الأدمن (مفرّقة بعمود source)"""
    __tablename__ = "site_metrics"
    id = Column(Integer, primary_key=True, index=True)
    source = Column(String(30), nullable=False)  # rabita / sheikh / admin_metrics
    label = Column(String(500), nullable=False)
    value = Column(String(200))
