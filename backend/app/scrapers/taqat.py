"""سكرابر طاقات — httpx فقط بدون Playwright أو lxml"""
import httpx
from typing import List, Dict
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html, */*",
    "Accept-Language": "ar,en-US;q=0.9",
}

async def scrape_taqat(search_keywords: List[str]) -> List[Dict]:
    jobs = []
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=HEADERS) as client:
            for keyword in search_keywords[:2]:
                # محاولة JSON API
                for url, params in [
                    ("https://www.taqat.sa/api/jobs/search", {"q": keyword, "limit": 15}),
                    ("https://api.taqat.sa/jobs", {"keyword": keyword, "pageSize": 15}),
                ]:
                    try:
                        r = await client.get(url, params=params)
                        if r.status_code == 200 and r.headers.get("content-type","").startswith("application/json"):
                            data = r.json()
                            items = (data.get("jobs") or data.get("data") or
                                     data.get("results") or data.get("items") or [])
                            for item in (items if isinstance(items, list) else []):
                                j = _parse_item(item, "taqat")
                                if j: jobs.append(j)
                            if jobs: break
                    except Exception:
                        continue
    except Exception as e:
        print(f"[Taqat] {e}")
    return jobs


def _parse_item(item: dict, platform: str) -> Dict | None:
    title = (item.get("title") or item.get("jobTitle") or item.get("name") or "").strip()
    if not title:
        return None
    return {
        "title": title,
        "company": (item.get("company") or item.get("companyName") or item.get("employer") or "شركة سعودية").strip(),
        "city": normalize_city(str(item.get("city") or item.get("location") or item.get("region") or "")),
        "description": str(item.get("description") or item.get("jobDescription") or title)[:500],
        "requirements": str(item.get("requirements") or item.get("qualifications") or "")[:300],
        "apply_url": str(item.get("url") or item.get("applyUrl") or item.get("link") or ""),
        "platform": platform,
        "published_at": datetime.utcnow().isoformat(),
    }


def normalize_city(city_text: str) -> str:
    t = (city_text or "").lower()
    if any(x in t for x in ["مدينة", "madinah", "medina", "المدينة"]):
        return "madinah"
    if any(x in t for x in ["جدة", "jeddah", "jedda"]):
        return "jeddah"
    if any(x in t for x in ["رياض", "riyadh"]):
        return "riyadh"
    if any(x in t for x in ["ينبع", "yanbu"]):
        return "yanbu"
    return "other"
