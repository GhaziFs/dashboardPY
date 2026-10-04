# نظام لوحة التحكم — دليل التشغيل

اتبع الخطوات بالترتيب، وحدة بوحدة. لا تنتقل لخطوة قبل ما تتأكد السابقة نجحت.

---

## الخطوة ١: افتح الطرفية داخل مجلد المشروع

افتح مجلد `dashboard-system` في مستكشف الملفات، اضغط بالفارغ داخل شريط العنوان فوق، اكتب `cmd`، اضغط Enter.

تأكد إنك بالمكان الصحيح — اكتب:

    dir

لازم تشوف `app` و `frontend` و `requirements.txt` بالنتيجة.

---

## الخطوة ٢: أنشئ بيئة افتراضية وفعّلها

    python -m venv venv
    venv\Scripts\activate

تأكد إنه ظهر `(venv)` في أول السطر قبل ما تكمل.

---

## الخطوة ٣: ثبّت المكتبات

    pip install -r requirements.txt

انتظر لين تخلص كل الأسطر. لو طلع خطأ، انسخه كامل وابعته فورًا قبل ما تكمل.

---

## الخطوة ٤: جهّز ملف الإعدادات

    copy .env.example .env

هذا يكفي للتجربة المحلية بدون أي تعديل إضافي (الرمز بيطبع بالطرفية بدل الإيميل لين تظبط البريد).

---

## الخطوة ٥: أنشئ أول مستخدم (مدير النظام)

    python -m app.create_user

يسألك أسئلة، جاوبها كذا لأول مستخدم:
- اسم المستخدم: اختر أي اسم
- البريد الإلكتروني: بريدك
- كلمة المرور: اختارها
- الاسم الكامل: اسمك
- الدور: اكتب بالضبط `system_admin`

---

## الخطوة ٦: استورد بياناتكم الحقيقية

انسخ ملف الإكسل حقكم داخل نفس مجلد `dashboard-system`، ثم:

    python -m app.import_all "اسم ملفك.xlsx"

غيّر الاسم داخل علامتي التنصيص بالاسم الحقيقي لملفك بالضبط.

---

## الخطوة ٧: شغّل النظام

    uvicorn app.main:app --reload

افتح المتصفح على:

    http://127.0.0.1:8000

سجّل دخول بنفس بيانات الخطوة ٥.

---


## المشاكل الشائعة

**"running scripts is disabled"** — افتح طرفية جديدة واختر Command Prompt بدل PowerShell (سهم صغير ▾ جنب زر + فوق الطرفية).

**"pip is not recognized" أو شي يطلع مرفوض من نظام الحماية** — هذا قرار من إدارة تقنية المعلومات بجهازك، مو خطأ بالكود. جرّب بدون `venv\Scripts\activate` (يعني بس `pip install -r requirements.txt` مباشرة)،



---

## إرسال رمز التحقق فعليًا بالبريد (اختياري)

افتح ملف `.env` وعدّل:

    SMTP_USER=بريدك@gmail.com
    SMTP_PASSWORD=كلمة_مرور_تطبيق_16_حرف
    SMTP_FROM=بريدك@gmail.com

كلمة مرور التطبيق تُنشأ من: myaccount.google.com/apppasswords (تحتاج تفعيل "التحقق بخطوتين" على حسابك أول).

---

## الأدوار المتاحة

`system_admin` (مدير النظام) · `officer` (مسؤول إداري، اطلاع فقط) · `analyst` (محلل بيانات، يعتمد السجلات) · `supervisor` (مشرف بيانات، تعديل كل الأقسام) · `department_editor` (مسؤول قسم، تعديل قسمه فقط) · `pending` (حساب جديد، بانتظار تفعيل مدير النظام)

الأقسام لـ `department_editor`: `courses` `qna` `projects` `communities` `news` `rabita` `sheikh` `admin_metrics`

---



**بعدها، على أي جهاز ثاني:**

تشغيل سريع (ينشئ الحساب ويستورد البيانات تلقائيًا أول مرة):

    git clone https://github.com/YOUR_USERNAME/dashboard-system.git && cd dashboard-system && run_user.bat

(استبدل YOUR_USERNAME باسم حسابك. على Mac/Linux استخدم `bash run_user.sh` بدل `run_user.bat`)

بيئة تطوير فقط (بدون تشغيل):

    git clone https://github.com/YOUR_USERNAME/dashboard-system.git && cd dashboard-system && install_dev.bat

---

## النشر الدائم على الإنترنت (Render)

`requirements-postgres.txt` بدل `requirements.txt` العادي.
