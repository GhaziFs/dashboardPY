from datetime import datetime, timedelta
from io import BytesIO
from urllib.parse import quote

import openpyxl
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List

from ..database import get_db
from ..auth_utils import get_current_user
from ..permissions import require_admin
from .. import models, schemas

router = APIRouter(prefix="/api/audit-log", tags=["سجل التدقيق"])

RETENTION_DAYS = 14


@router.get("/", response_model=List[schemas.AuditLogOut])
def list_audit_log(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_admin(user)
    return db.query(models.AuditLog).order_by(models.AuditLog.id.desc()).limit(1000).all()


@router.get("/export")
def export_audit_log(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_admin(user)
    entries = db.query(models.AuditLog).order_by(models.AuditLog.id.desc()).all()

    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "سجل التدقيق"
    ws.append(["التاريخ والوقت", "المستخدم", "الإجراء", "الجدول", "رقم السجل", "التفاصيل"])
    for e in entries:
        ws.append([
            e.timestamp.strftime("%Y-%m-%d %H:%M:%S") if e.timestamp else "",
            e.username, e.action, e.table_name, e.record_id, e.details,
        ])

    buffer = BytesIO()
    wb.save(buffer)
    buffer.seek(0)

    ascii_name = f"audit_log_{datetime.now().strftime('%Y-%m-%d')}.xlsx"
    utf8_name = quote(f"سجل_التدقيق_{datetime.now().strftime('%Y-%m-%d')}.xlsx")
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename=\"{ascii_name}\"; filename*=UTF-8''{utf8_name}"},
    )


@router.delete("/cleanup")
def cleanup_audit_log(db: Session = Depends(get_db), user=Depends(get_current_user)):
    require_admin(user)
    cutoff = datetime.utcnow() - timedelta(days=RETENTION_DAYS)
    deleted = db.query(models.AuditLog).filter(models.AuditLog.timestamp < cutoff).delete()
    db.commit()
    return {"deleted": deleted, "cutoff": cutoff.strftime("%Y-%m-%d")}
