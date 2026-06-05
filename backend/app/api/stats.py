from fastapi import APIRouter
from app.services.supabase_service import get_client
from datetime import datetime, timedelta

router = APIRouter()

@router.get("/overview")
async def overview():
    try:
        total_r = get_client().table("applications").select("id, status, sent_at", count="exact").execute()
        apps = total_r.data or []
        total = len(apps)
        today = datetime.utcnow().date().isoformat()
        week_ago = (datetime.utcnow() - timedelta(days=7)).isoformat()

        status_counts = {}
        for a in apps:
            s = a.get("status", "sent")
            status_counts[s] = status_counts.get(s, 0) + 1

        today_apps = [a for a in apps if a.get("sent_at", "").startswith(today)]
        week_apps  = [a for a in apps if a.get("sent_at", "") >= week_ago]

        by_city = {}
        try:
            jobs_r = get_client().table("jobs").select("city").eq("status", "applied").execute()
            for j in (jobs_r.data or []):
                c = j.get("city", "other")
                by_city[c] = by_city.get(c, 0) + 1
        except Exception:
            pass

        by_platform = {}
        try:
            jobs_r = get_client().table("jobs").select("platform").eq("status", "applied").execute()
            for j in (jobs_r.data or []):
                p = j.get("platform", "other")
                by_platform[p] = by_platform.get(p, 0) + 1
        except Exception:
            pass

        avg_score = 0
        try:
            scores_r = get_client().table("jobs").select("match_score").execute()
            scores = [j["match_score"] for j in (scores_r.data or []) if j.get("match_score")]
            avg_score = sum(scores) / len(scores) if scores else 0
        except Exception:
            pass

        sent_total = status_counts.get("sent", 0) + status_counts.get("reviewing", 0) + status_counts.get("interview", 0) + status_counts.get("offer", 0) + status_counts.get("rejected", 0)
        responded = status_counts.get("reviewing", 0) + status_counts.get("interview", 0) + status_counts.get("offer", 0)
        response_rate = round(responded / sent_total * 100, 1) if sent_total > 0 else 0

        return {
            "total_applications": total,
            "sent": status_counts.get("sent", 0),
            "reviewing": status_counts.get("reviewing", 0),
            "rejected": status_counts.get("rejected", 0),
            "interviews": status_counts.get("interview", 0),
            "offers": status_counts.get("offer", 0),
            "by_city": by_city,
            "by_platform": by_platform,
            "avg_match_score": avg_score,
            "this_week": len(week_apps),
            "today": len(today_apps),
            "response_rate": response_rate,
        }
    except Exception:
        return {"total_applications": 0, "sent": 0, "reviewing": 0, "rejected": 0, "interviews": 0, "offers": 0, "by_city": {}, "by_platform": {}, "avg_match_score": 0, "this_week": 0, "today": 0, "response_rate": 0}

@router.get("/detail/{key}")
async def detail(key: str):
    try:
        if key == "total":
            r = get_client().table("applications").select("*, jobs(title, company)").execute()
            return r.data or []
        if key == "reviewing":
            r = get_client().table("applications").select("*, jobs(title, company)").eq("status", "reviewing").execute()
            return r.data or []
        if key == "interviews":
            r = get_client().table("applications").select("*, jobs(title, company)").eq("status", "interview").execute()
            return r.data or []
        return {}
    except Exception:
        return {}

@router.get("/heatmap")
async def heatmap():
    try:
        since = (datetime.utcnow() - timedelta(days=30)).isoformat()
        r = get_client().table("applications").select("sent_at").gte("sent_at", since).execute()
        counts = {}
        for a in (r.data or []):
            date = a.get("sent_at", "")[:10]
            if date:
                counts[date] = counts.get(date, 0) + 1
        return [{"date": d, "count": c} for d, c in sorted(counts.items())]
    except Exception:
        return []

@router.get("/ab-tests")
async def ab_tests():
    return []