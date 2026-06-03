from supabase import create_client, Client
from app.core.config import settings
from typing import Optional, Any
import json
from datetime import datetime

_client: Optional[Client] = None

def get_client() -> Client:
    global _client
    if _client is None:
        _client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    return _client

def log_event(event_type: str, description: str, status: str = "info", meta: dict = None):
    try:
        get_client().table("event_log").insert({
            "event_type": event_type,
            "description": description,
            "status": status,
            "meta": meta or {},
            "created_at": datetime.utcnow().isoformat(),
        }).execute()
    except Exception:
        pass

def get_settings() -> dict:
    try:
        r = get_client().table("settings").select("*").limit(1).execute()
        if r.data:
            return r.data[0].get("data", {})
    except Exception:
        pass
    return {}

def save_settings(data: dict):
    try:
        existing = get_client().table("settings").select("id").limit(1).execute()
        if existing.data:
            get_client().table("settings").update({"data": data}).eq("id", existing.data[0]["id"]).execute()
        else:
            get_client().table("settings").insert({"data": data}).execute()
    except Exception as e:
        raise e
