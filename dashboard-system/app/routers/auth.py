from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..security import verify_password, hash_password, create_access_token, generate_otp_code, otp_expiry
from ..email_utils import send_email

router = APIRouter(prefix="/auth", tags=["تسجيل الدخول"])

@router.post("/register", response_model=schemas.RegisterResponse, status_code=201)
def register(payload: schemas.RegisterRequest, db: Session = Depends(get_db)):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(status_code=409, detail="اسم المستخدم مستخدم مسبقًا")

    user = models.User(
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        national_id=payload.national_id,
        role="pending",
        department=payload.requested_department,
    )
    db.add(user)
    db.commit()

    return schemas.RegisterResponse(
        message="تم إنشاء الحساب. صلاحياتك ستُفعّل من قِبل مدير النظام قبل ما تقدر تعدّل أي بيانات."
    )

@router.post("/login", response_model=schemas.LoginStepResponse)
def login(payload: schemas.LoginRequest, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="اسم المستخدم أو كلمة المرور غير صحيحة")

    code = generate_otp_code()
    db.add(models.OtpCode(username=user.username, code=code, expires_at=otp_expiry()))
    db.commit()

    sent = send_email(
        user.email,
        "رمز التحقق - نظام لوحة التحكم",
        f"رمز الدخول الخاص بك هو: {code}\nصالح لمدة 5 دقائق فقط.",
    )

    return schemas.LoginStepResponse(
        otp_required=True,
        message="تم إرسال رمز التحقق لبريدك الإلكتروني" if sent else "تعذّر إرسال البريد، راجع إعدادات SMTP",
    )

@router.post("/verify-otp", response_model=schemas.TokenResponse)
def verify_otp(payload: schemas.VerifyOtpRequest, db: Session = Depends(get_db)):
    """الخطوة ٢: يتحقق من رمز الـ OTP، ولو صحيح يرجّع توكن الدخول الفعلي"""
    otp = (
        db.query(models.OtpCode)
        .filter(models.OtpCode.username == payload.username, models.OtpCode.code == payload.code)
        .order_by(models.OtpCode.id.desc())
        .first()
    )
    if not otp:
        raise HTTPException(status_code=401, detail="رمز التحقق غير صحيح")
    if otp.expires_at < datetime.utcnow():
        raise HTTPException(status_code=401, detail="رمز التحقق منتهي الصلاحية، سجّل دخول من جديد")

    user = db.query(models.User).filter(models.User.username == payload.username).first()
    if not user:
        raise HTTPException(status_code=401, detail="المستخدم غير موجود")

    db.delete(otp)  # الرمز يُستخدم مرة وحدة بس
    db.commit()

    token = create_access_token({"sub": user.username, "role": user.role})
    return schemas.TokenResponse(
        access_token=token, role=user.role, department=user.department, full_name=user.full_name
    )
