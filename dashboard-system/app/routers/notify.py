import os
from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..database import get_db
from .. import models
from ..email_utils import send_email

router = APIRouter(prefix="/api", tags=["الإشعارات الدورية"])

# كل جدول نفحصه + الاسم اللي يظهر بالرسالة
WATCHED_TABLES = [
    (models.Course, "التعليم التفاعلي"),
    (models.QnaEntry, "السؤال والجواب"),
    (models.Project, "المشاريع"),
    (models.Community, "المجتمعات الافتراضية"),
    (models.NewsEntry, "الأخبار والبيانات"),
]

STALE_AFTER_DAYS = 7

@router.get("/notify-stale-reviews")
def notify_stale_reviews(secret: str, db: Session = Depends(get_db)):
    expected = os.getenv("NOTIFY_SECRET", "")
    if not expected or secret != expected:
        raise HTTPException(status_code=403, detail="غير مصرح")

    cutoff = datetime.utcnow() - timedelta(days=STALE_AFTER_DAYS)
    stale_lines = []

    for model, label in WATCHED_TABLES:
        items = (
            db.query(model)
            .filter(model.reviewed == False)  # noqa: E712
            .filter(model.created_at < cutoff)
            .filter((model.last_notified_at == None) | (model.last_notified_at < cutoff))  # noqa: E711
            .all()
        )
        for item in items:
            stale_lines.append(f"- {label} (رقم السجل: {item.id})")
            item.last_notified_at = datetime.utcnow()

    db.commit()

    if stale_lines:
        analysts = db.query(models.User).filter(models.User.role == "analyst").all()
        body = (
            "توجد سجلات لم تتم مراجعتها منذ أكثر من أسبوع:\n\n"
            + "\n".join(stale_lines)
            + "\n\nالرجاء الدخول للنظام ومراجعتها."
        )
        for analyst in analysts:
            send_email(analyst.email, "تنبيه: سجلات بانتظار المراجعة", body)

    return {"checked": True, "stale_count": len(stale_lines)}
