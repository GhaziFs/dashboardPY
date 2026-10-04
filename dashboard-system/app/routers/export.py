from datetime import datetime
from io import BytesIO
from urllib.parse import quote

import openpyxl
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from ..database import get_db
from ..auth_utils import get_current_user
from .. import models

router = APIRouter(prefix="/api/export", tags=["تصدير Excel"])

def _add_sheet(wb, title, headers, rows):
    ws = wb.create_sheet(title)
    ws.append(headers)
    for row in rows:
        ws.append(row)

@router.get("/excel")
def export_excel(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    wb = openpyxl.Workbook()
    wb.remove(wb.active)  # نحذف الورقة الفاضية الافتراضية

    courses = db.query(models.Course).all()
    _add_sheet(wb, "التعليم التفاعلي",
        ["التاريخ", "اسم الدورة", "المسجلون", "الحاضرون", "الشهادات", "التقييم", "المعلمون", "معتمد؟"],
        [[c.date, c.course_name, c.enrolled_count, c.attended_count, c.certificates_issued,
          c.rating, c.teachers_count, "نعم" if c.reviewed else "لا"] for c in courses])

    qna = db.query(models.QnaEntry).all()
    _add_sheet(wb, "السؤال والجواب",
        ["التاريخ", "السؤال", "الحالة", "الدولة", "معتمد؟"],
        [[q.date, q.question, q.status, q.country, "نعم" if q.reviewed else "لا"] for q in qna])

    projects = db.query(models.Project).all()
    _add_sheet(wb, "المشاريع",
        ["التاريخ", "اسم المشروع", "المبلغ المستهدف", "المبلغ المجموع", "المتبرعون", "نسبة الإكتمال", "معتمد؟"],
        [[p.date, p.name, p.target_amount, p.raised_amount, p.donors_count,
          p.completion_percent, "نعم" if p.reviewed else "لا"] for p in projects])

    subs = db.query(models.Subscription).all()
    _add_sheet(wb, "الاشتراكات",
        ["الباقة", "عدد المشتركين", "إجمالي المبلغ", "معتمد؟"],
        [[s.package, s.subscribers_count, s.total_amount, "نعم" if s.reviewed else "لا"] for s in subs])

    communities = db.query(models.Community).all()
    _add_sheet(wb, "المجتمعات الافتراضية",
        ["التاريخ", "التصنيف", "اسم المجتمع", "المنضمون", "المنشورات", "معتمد؟"],
        [[c.date, c.community_type, c.name, c.joined_count, c.posts_count,
          "نعم" if c.reviewed else "لا"] for c in communities])

    news = db.query(models.NewsEntry).all()
    _add_sheet(wb, "الأخبار والبيانات",
        ["التاريخ", "الأخبار المنشورة", "البيانات المنشورة", "معتمد؟"],
        [[n.date, n.news_count, n.data_count, "نعم" if n.reviewed else "لا"] for n in news])

    for source, title in [("rabita", "بيانات موقع الرابطة"), ("sheikh", "بيانات موقع معالي الشيخ"), ("admin_metrics", "الأدمن")]:
        metrics = db.query(models.SiteMetric).filter(models.SiteMetric.source == source).all()
        _add_sheet(wb, title, ["التسمية", "القيمة"], [[m.label, m.value] for m in metrics])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    filename_ascii = f"dashboard_export_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    filename_utf8 = quote(f"بيانات_النظام_{datetime.now().strftime('%Y-%m-%d')}.xlsx")

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=\"{filename_ascii}\"; filename*=UTF-8''{filename_utf8}"},
    )
