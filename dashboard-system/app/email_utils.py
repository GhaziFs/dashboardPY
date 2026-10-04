import os
import smtplib
from email.mime.text import MIMEText
from dotenv import load_dotenv

load_dotenv()

SMTP_HOST = os.getenv("SMTP_HOST")
SMTP_PORT = int(os.getenv("SMTP_PORT", "587"))
SMTP_USER = os.getenv("SMTP_USER")
SMTP_PASSWORD = os.getenv("SMTP_PASSWORD")
SMTP_FROM = os.getenv("SMTP_FROM", SMTP_USER)

PLACEHOLDER_VALUES = {"", "your_email@gmail.com", "your_app_password"}

def _looks_configured() -> bool:
    if not (SMTP_HOST and SMTP_USER and SMTP_PASSWORD):
        return False
    if SMTP_USER in PLACEHOLDER_VALUES or SMTP_PASSWORD in PLACEHOLDER_VALUES:
        return False
    return True

def send_email(to: str, subject: str, body: str) -> bool:
    if not _looks_configured():
        print(f"\n📩 [البريد غير معدّ بعد - طباعة محلية فقط]\nإلى: {to}\nالموضوع: {subject}\n{body}\n")
        return False

    try:
        msg = MIMEText(body, "plain", "utf-8")
        msg["Subject"] = subject
        msg["From"] = SMTP_FROM
        msg["To"] = to
        with smtplib.SMTP(SMTP_HOST, SMTP_PORT, timeout=10) as server:
            server.starttls()
            server.login(SMTP_USER, SMTP_PASSWORD)
            server.sendmail(SMTP_FROM, [to], msg.as_string())
        return True
    except Exception as e:
        print(f"\n❌ فشل إرسال البريد فعليًا ({e})، هذا نص الرسالة عشان تكمل تجربتك:\nإلى: {to}\nالموضوع: {subject}\n{body}\n")
        return False
