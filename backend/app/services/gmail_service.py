import base64
import smtplib
import imaplib
import email as email_lib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from app.core.config import settings
from typing import Optional
import os

def send_email(
    to: str,
    subject: str,
    body: str,
    attachment_path: Optional[str] = None,
    tracking_pixel_url: Optional[str] = None,
) -> dict:
    msg = MIMEMultipart("alternative")
    msg["From"] = settings.GMAIL_SENDER_EMAIL
    msg["To"] = to
    msg["Subject"] = subject

    html_body = body.replace("\n", "<br>")
    if tracking_pixel_url:
        html_body += f'<img src="{tracking_pixel_url}" width="1" height="1" alt="" style="display:none"/>'

    msg.attach(MIMEText(body, "plain"))
    msg.attach(MIMEText(html_body, "html"))

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        encoders.encode_base64(part)
        filename = os.path.basename(attachment_path)
        part.add_header("Content-Disposition", f"attachment; filename={filename}")
        msg.attach(part)

    with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
        server.login(settings.GMAIL_SENDER_EMAIL, settings.GMAIL_APP_PASSWORD)
        server.sendmail(settings.GMAIL_SENDER_EMAIL, to, msg.as_string())

    return {"status": "sent", "to": to}

def send_application_confirmation(
    user_email: str,
    job: dict,
    letter_body: str,
    cv_text: str,
    sent_ok: bool,
    send_method: str,
    salary_note: str = "",
) -> dict:
    """إرسال إيميل تأكيد مفصّل للمستخدمة بعد كل تقديم"""
    title    = job.get("title", "—")
    company  = job.get("company", "—")
    city_map = {"madinah": "المدينة المنورة", "riyadh": "الرياض", "jeddah": "جدة", "yanbu": "ينبع", "other": "أخرى"}
    city     = city_map.get(job.get("city", ""), job.get("city", "—"))
    score    = job.get("match_score", "—")
    apply_url = job.get("apply_url", "")
    apply_email = job.get("apply_email", "")

    if sent_ok:
        status_line = "✅ تم إرسال طلب التقديم بنجاح عبر الإيميل"
    elif send_method == "manual_url":
        status_line = f"⚡ يتطلب تقديماً يدوياً — الرابط: {apply_url}"
    else:
        status_line = "⚠️ لم يُرسَل (لا يوجد إيميل أو رابط مباشر)"

    cv_snippet = (cv_text or "")[:300].strip()

    body = f"""مرحباً إيمان،

لقد قدّمتِ على الوظيفة التالية:

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 تفاصيل الوظيفة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
المسمى الوظيفي : {title}
الشركة         : {company}
المدينة        : {city}
نسبة التطابق   : {score}%
{f"الإيميل      : {apply_email}" if apply_email else ""}
{f"الرابط       : {apply_url}" if apply_url else ""}

💰 {salary_note}

الحالة         : {status_line}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📝 نص رسالة التقديم المُرسَلة
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{letter_body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📄 مقتطف من سيرتكِ الذاتية
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{cv_snippet}
{"..." if len(cv_text or "") > 300 else ""}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
نظام Job Agents — يعمل من أجلك
"""

    subject = f"{'✅ تم التقديم' if sent_ok else '⚡ تقديم جديد'} — {title} | {company}"

    return send_email(to=user_email, subject=subject, body=body)


def get_messages(max_results: int = 20, query: str = "") -> list:
    try:
        mail = imaplib.IMAP4_SSL("imap.gmail.com")
        mail.login(settings.GMAIL_SENDER_EMAIL, settings.GMAIL_APP_PASSWORD)
        mail.select("inbox")

        search = f'({query})' if query else 'ALL'
        _, data = mail.search(None, search)
        ids = data[0].split()[-max_results:]

        messages = []
        for num in reversed(ids):
            _, msg_data = mail.fetch(num, "(RFC822)")
            msg = email_lib.message_from_bytes(msg_data[0][1])
            messages.append(parse_message(msg))

        mail.logout()
        return messages
    except Exception as e:
        return []

def parse_message(msg) -> dict:
    body = ""
    if msg.is_multipart():
        for part in msg.walk():
            if part.get_content_type() == "text/plain":
                body = part.get_payload(decode=True).decode("utf-8", errors="replace")
                break
    else:
        body = msg.get_payload(decode=True).decode("utf-8", errors="replace")

    return {
        "gmail_id": msg.get("Message-ID", ""),
        "thread_id": msg.get("Thread-Index", ""),
        "subject": msg.get("Subject", ""),
        "from_email": msg.get("From", ""),
        "to_email": msg.get("To", ""),
        "date": msg.get("Date", ""),
        "body": body,
        "snippet": body[:150],
    }

def check_connection() -> dict:
    try:
        with smtplib.SMTP_SSL("smtp.gmail.com", 465) as server:
            server.login(settings.GMAIL_SENDER_EMAIL, settings.GMAIL_APP_PASSWORD)
        return {"ok": True, "detail": f"متصل ({settings.GMAIL_SENDER_EMAIL})"}
    except Exception as e:
        return {"ok": False, "detail": str(e)[:80]}
