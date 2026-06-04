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
