import base64
import email as email_lib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build
from app.core.config import settings
from typing import Optional
import os

def get_gmail_service():
    creds = Credentials(
        token=None,
        refresh_token=settings.GMAIL_REFRESH_TOKEN,
        client_id=settings.GMAIL_CLIENT_ID,
        client_secret=settings.GMAIL_CLIENT_SECRET,
        token_uri="https://oauth2.googleapis.com/token",
    )
    return build("gmail", "v1", credentials=creds)

def send_email(
    to: str,
    subject: str,
    body: str,
    attachment_path: Optional[str] = None,
    tracking_pixel_url: Optional[str] = None,
) -> dict:
    service = get_gmail_service()
    msg = MIMEMultipart()
    msg["From"] = settings.GMAIL_SENDER_EMAIL
    msg["To"] = to
    msg["Subject"] = subject

    html_body = body.replace("\n", "<br>")
    if tracking_pixel_url:
        html_body += f'<img src="{tracking_pixel_url}" width="1" height="1" alt="" style="display:none"/>'
    
    msg.attach(MIMEText(html_body, "html"))

    if attachment_path and os.path.exists(attachment_path):
        with open(attachment_path, "rb") as f:
            part = MIMEBase("application", "octet-stream")
            part.set_payload(f.read())
        encoders.encode_base64(part)
        filename = os.path.basename(attachment_path)
        part.add_header("Content-Disposition", f"attachment; filename={filename}")
        msg.attach(part)

    raw = base64.urlsafe_b64encode(msg.as_bytes()).decode()
    result = service.users().messages().send(userId="me", body={"raw": raw}).execute()
    return result

def get_messages(max_results: int = 50, query: str = "") -> list:
    service = get_gmail_service()
    result = service.users().messages().list(userId="me", maxResults=max_results, q=query).execute()
    messages = result.get("messages", [])
    details = []
    for m in messages[:20]:
        detail = service.users().messages().get(userId="me", id=m["id"], format="full").execute()
        details.append(parse_message(detail))
    return details

def parse_message(msg: dict) -> dict:
    headers = {h["name"]: h["value"] for h in msg.get("payload", {}).get("headers", [])}
    body = extract_body(msg.get("payload", {}))
    return {
        "gmail_id": msg["id"],
        "thread_id": msg.get("threadId"),
        "subject": headers.get("Subject", ""),
        "from_email": headers.get("From", ""),
        "to_email": headers.get("To", ""),
        "date": headers.get("Date", ""),
        "body": body,
        "snippet": msg.get("snippet", ""),
    }

def extract_body(payload: dict) -> str:
    if payload.get("body", {}).get("data"):
        return base64.urlsafe_b64decode(payload["body"]["data"]).decode("utf-8", errors="replace")
    for part in payload.get("parts", []):
        if part.get("mimeType") in ("text/plain", "text/html"):
            data = part.get("body", {}).get("data", "")
            if data:
                return base64.urlsafe_b64decode(data).decode("utf-8", errors="replace")
    return ""
