"""سكرابر Indeed باستخدام Apify"""
from typing import List, Dict
from apify_client import ApifyClient
from app.core.config import settings
from app.scrapers.taqat import normalize_city
from datetime import datetime

def scrape_indeed(search_keywords: List[str]) -> List[Dict]:
    if not settings.APIFY_TOKEN:
        return []
    jobs = []
    try:
        client = ApifyClient(settings.APIFY_TOKEN)
        for keyword in search_keywords[:2]:
            run_input = {
                "queries": [{"term": keyword, "location": "Saudi Arabia", "country": "SA"}],
                "maxItems": 20,
            }
            run = client.actor("misceres/indeed-scraper").call(run_input=run_input)
            for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                jobs.append({
                    "title": item.get("title", ""),
                    "company": item.get("company", ""),
                    "city": normalize_city(item.get("location", "")),
                    "description": item.get("description", ""),
                    "apply_url": item.get("url", ""),
                    "platform": "indeed",
                    "published_at": item.get("date", datetime.utcnow().isoformat()),
                })
    except Exception as e:
        print(f"[Indeed Scraper Error] {e}")
    return jobs
