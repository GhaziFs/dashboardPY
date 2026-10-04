from . import models


def log_action(db, user, action: str, table_name: str, record_id=None, details: str = None):
    entry = models.AuditLog(
        username=user.username if user else "system",
        action=action,
        table_name=table_name,
        record_id=record_id,
        details=details,
    )
    db.add(entry)
    db.commit()
