from .database import SessionLocal, Base, engine
from . import models
from .security import hash_password
from .permissions import DEPARTMENTS

Base.metadata.create_all(bind=engine)

ROLES = ["system_admin", "officer", "analyst", "supervisor", "department_editor"]

ROLES_HELP = DEPT_HELP = "الأقسام المتاحة: " + ", ".join(DEPARTMENTS)

def main():
    db = SessionLocal()
    print("=== إنشاء مستخدم جديد ===")
    username = input("اسم المستخدم: ").strip()
    email = input("البريد الإلكتروني (لإرسال رمز التحقق): ").strip()
    password = input("كلمة المرور: ").strip()
    full_name = input("الاسم الكامل: ").strip()

    print(ROLES_HELP)
    role = input("الدور: ").strip()
    if role not in ROLES:
        print(f"⚠️ دور غير معروف. لازم يكون واحد من: {', '.join(ROLES)}")
        return

    department = None
    if role == "department_editor":
        print(DEPT_HELP)
        department = input("القسم: ").strip()
        if department not in DEPARTMENTS:
            print(f"⚠️ قسم غير معروف. لازم يكون واحد من: {', '.join(DEPARTMENTS)}")
            return

    if db.query(models.User).filter(models.User.username == username).first():
        print("⚠️ هذا المستخدم موجود مسبقًا!")
        return

    user = models.User(
        username=username,
        email=email,
        hashed_password=hash_password(password),
        full_name=full_name or None,
        role=role,
        department=department,
    )
    db.add(user)
    db.commit()
    print(f"✅ تم إنشاء المستخدم '{username}' بدور '{role}' بنجاح")

if __name__ == "__main__":
    main()
