"""سكرابر جدارات — httpx فقط"""
import httpx
from typing import List, Dict
from datetime import datetime
from app.scrapers.taqat import normalize_city, HEADERS, _parse_item

async def scrape_jadarat(search_keywords: List[str]) -> List[Dict]:
    jobs = []
    try:
        async with httpx.AsyncClient(timeout=15, follow_redirects=True, headers=HEADERS) as client:
            for keyword in search_keywords[:2]:
                for url, params in [
                    ("https://jadarat.com.sa/api/v1/jobs", {"q": keyword, "limit": 15}),
                    ("https://api.jadarat.sa/jobs", {"keyword": keyword, "pageSize": 15}),
                    ("https://jadarat.sa/api/jobs", {"q": keyword}),
                ]:
                    try:
                        r = await client.get(url, params=params)
                        if r.status_code == 200 and "application/json" in r.headers.get("content-type",""):
                            data = r.json()
                            items = (data.get("jobs") or data.get("data") or
                                     data.get("results") or data.get("vacancies") or [])
                            for item in (items if isinstance(items, list) else []):
                                j = _parse_item(item, "jadarat")
                                if j: jobs.append(j)
                            if jobs: break
                    except Exception:
                        continue
    except Exception as e:
        print(f"[Jadarat] {e}")
    return jobs
