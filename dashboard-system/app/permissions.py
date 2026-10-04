from fastapi import HTTPException

DEPARTMENTS = [
    "courses", "qna", "projects", "communities",
    "news", "rabita", "sheikh", "admin_metrics",
]

def require_write_access(user, department_key: str):
    """يتحقق إن المستخدم يقدر يضيف/يعدّل/يحذف بهذا الجدول تحديدًا"""
    if user.role in ("system_admin", "supervisor"):
        return
    if user.role == "department_editor" and user.department == department_key:
        return
    raise HTTPException(status_code=403, detail="ما عندك صلاحية التعديل على بيانات هذا القسم")

def require_review_access(user):
    """يتحقق إن المستخدم يقدر يعتمد (يراجع) السجلات"""
    if user.role in ("system_admin", "supervisor", "analyst"):
        return
    raise HTTPException(status_code=403, detail="ما عندك صلاحية مراجعة البيانات")

def require_admin(user):
    """صلاحيات إدارية عليا فقط (سجل التدقيق، إدارة المستخدمين)"""
    if user.role != "system_admin":
        raise HTTPException(status_code=403, detail="هذي الصلاحية لمدير النظام فقط")
