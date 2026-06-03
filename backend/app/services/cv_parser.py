import os
from typing import Optional

def extract_text(file_path: str) -> str:
    """استخراج النص من PDF أو Word أو صورة"""
    ext = os.path.splitext(file_path)[1].lower()
    
    if ext == ".pdf":
        return _from_pdf(file_path)
    elif ext in (".doc", ".docx"):
        return _from_word(file_path)
    elif ext in (".png", ".jpg", ".jpeg", ".webp"):
        return _from_image(file_path)
    return ""

def _from_pdf(path: str) -> str:
    try:
        import fitz
        doc = fitz.open(path)
        return "\n".join(page.get_text() for page in doc)
    except Exception as e:
        return f"[خطأ في قراءة PDF: {e}]"

def _from_word(path: str) -> str:
    try:
        from docx import Document
        doc = Document(path)
        return "\n".join(p.text for p in doc.paragraphs)
    except Exception as e:
        return f"[خطأ في قراءة Word: {e}]"

def _from_image(path: str) -> str:
    """استخراج النص من صورة باستخدام Claude Vision"""
    try:
        import anthropic, base64
        from app.core.config import settings
        with open(path, "rb") as f:
            img_data = base64.b64encode(f.read()).decode()
        ext = os.path.splitext(path)[1].lower().strip(".")
        media_type = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp"}.get(ext, "image/jpeg")
        client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = client.messages.create(
            model="claude-sonnet-4-5",
            max_tokens=3000,
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image", "source": {"type": "base64", "media_type": media_type, "data": img_data}},
                    {"type": "text", "text": "استخرج كل النص من هذه الصورة (CV) بدقة:"}
                ]
            }]
        )
        return response.content[0].text
    except Exception as e:
        return f"[خطأ في قراءة الصورة: {e}]"
