"""سكرابر جدارات — httpx بدون Playwright"""
import httpx
from typing import List, Dict
from datetime import datetime
from app.scrapers.taqat import normalize_city, HEADERS, _parse_html_jobs

async def scrape_jadarat(search_keywords: List[str]) -> List[Dict]:
    jobs = []
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
            for keyword in search_keywords[:3]:
                # محاولة API
                for api_url in [
                    "https://jadarat.com.sa/api/v1/jobs",
                    "https://api.jadarat.com.sa/jobs",
                    "https://jadarat.sa/api/jobs",
                ]:
                    try:
                        r = await client.get(api_url, params={"q": keyword, "limit": 15})
                        if r.status_code == 200:
                            data = r.json()
                            items = data.get("jobs") or data.get("data") or data.get("results") or []
                            for item in (items if isinstance(items, list) else []):
                                if not isinstance(item, dict):
                                    continue
                                title = item.get("title") or item.get("jobTitle") or ""
                                if not title:
                                    continue
                                jobs.append({
                                    "title": str(title).strip(),
                                    "company": str(item.get("company") or item.get("organization") or "جهة حكومية").strip(),
                                    "city": normalize_city(str(item.get("city") or item.get("location") or "")),
                                    "description": str(item.get("description") or title)[:500],
                                    "apply_url": str(item.get("url") or item.get("applyUrl") or "https://jadarat.sa"),
                                    "platform": "jadarat",
                                    "published_at": datetime.utcnow().isoformat(),
                                })
                            if jobs:
                                break
                    except Exception:
                        continue

            # محاولة HTML scraping
            if not jobs:
                for keyword in search_keywords[:2]:
                    for url in [
                        f"https://jadarat.sa/ar/jobs?q={keyword}",
                        f"https://jadarat.com.sa/jobs?search={keyword}",
                        f"https://www.jadarat.com.sa/en/jobs?q={keyword}",
                    ]:
                        try:
                            r = await client.get(url)
                            if r.status_code == 200:
                                parsed = _parse_html_jobs(r.text, "jadarat")
                                if parsed:
                                    jobs.extend(parsed)
                                    break
                        except Exception:
                            continue
    except Exception as e:
        print(f"[Jadarat] {e}")
    return jobs
