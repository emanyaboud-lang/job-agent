"""سكرابر LinkedIn باستخدام Apify"""
from typing import List, Dict
from apify_client import ApifyClient
from app.core.config import settings
from app.scrapers.taqat import normalize_city
from datetime import datetime

def scrape_linkedin(search_keywords: List[str]) -> List[Dict]:
    if not settings.APIFY_TOKEN:
        return []
    jobs = []
    try:
        client = ApifyClient(settings.APIFY_TOKEN)
        for keyword in search_keywords[:2]:
            for city in ["Al Madinah", "Jeddah", "Riyadh", "Yanbu"]:
                run_input = {
                    "searchKeywords": keyword,
                    "location": city,
                    "maxResults": 10,
                    "contractType": "all",
                }
                run = client.actor("dev_fusion/linkedin-jobs-scraper").call(run_input=run_input)
                for item in client.dataset(run["defaultDatasetId"]).iterate_items():
                    jobs.append({
                        "title": item.get("title", ""),
                        "company": item.get("company", ""),
                        "city": normalize_city(item.get("location", "")),
                        "description": item.get("description", ""),
                        "requirements": item.get("requirements", ""),
                        "apply_url": item.get("applyUrl", ""),
                        "platform": "linkedin",
                        "published_at": item.get("postedAt", datetime.utcnow().isoformat()),
                    })
    except Exception as e:
        print(f"[LinkedIn Scraper Error] {e}")
    return jobs
