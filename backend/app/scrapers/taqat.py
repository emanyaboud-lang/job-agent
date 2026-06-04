"""سكرابر طاقات — httpx بدون Playwright"""
import httpx
from typing import List, Dict
from datetime import datetime

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Accept": "application/json, text/html,*/*",
    "Accept-Language": "ar,en-US;q=0.9,en;q=0.8",
    "Referer": "https://www.taqat.sa/",
}

async def scrape_taqat(search_keywords: List[str]) -> List[Dict]:
    jobs = []
    try:
        async with httpx.AsyncClient(timeout=20, follow_redirects=True, headers=HEADERS) as client:
            for keyword in search_keywords[:3]:
                try:
                    r = await client.get(
                        "https://www.taqat.sa/api/jobs/search",
                        params={"q": keyword, "country": "SA", "page": 1, "limit": 15},
                    )
                    if r.status_code == 200:
                        data = r.json()
                        items = data.get("jobs") or data.get("data") or data.get("results") or []
                        for item in items:
                            if not isinstance(item, dict):
                                continue
                            title = item.get("title") or item.get("jobTitle") or ""
                            company = item.get("company") or item.get("companyName") or item.get("employer") or ""
                            city = item.get("city") or item.get("location") or item.get("region") or ""
                            url = item.get("url") or item.get("applyUrl") or item.get("jobUrl") or ""
                            desc = item.get("description") or item.get("jobDescription") or f"{title} - {company}"
                            if title:
                                jobs.append({
                                    "title": str(title).strip(),
                                    "company": str(company).strip() or "شركة سعودية",
                                    "city": normalize_city(str(city)),
                                    "description": str(desc)[:500],
                                    "apply_url": str(url),
                                    "platform": "taqat",
                                    "published_at": datetime.utcnow().isoformat(),
                                })
                except Exception:
                    pass

            # محاولة ثانية: HTML scraping
            if not jobs:
                for keyword in search_keywords[:2]:
                    try:
                        r = await client.get(
                            f"https://www.taqat.sa/en/jobs",
                            params={"q": keyword, "location": "Saudi Arabia"},
                        )
                        if r.status_code == 200 and "job" in r.text.lower():
                            jobs.extend(_parse_html_jobs(r.text, "taqat"))
                    except Exception:
                        pass
    except Exception as e:
        print(f"[Taqat] {e}")
    return jobs


def _parse_html_jobs(html: str, platform: str) -> List[Dict]:
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "html.parser")
        jobs = []
        selectors = [
            ".job-card", ".job-item", "[class*='JobCard']",
            "[class*='job-listing']", "[class*='vacancy']", "article",
        ]
        cards = []
        for sel in selectors:
            found = soup.select(sel)
            if found:
                cards = found[:15]
                break

        for card in cards:
            title_el = card.find(["h2", "h3", "h4"]) or card.find(class_=lambda c: c and "title" in c.lower())
            title = title_el.get_text(strip=True) if title_el else ""
            if not title or len(title) < 3:
                continue
            company_el = card.find(class_=lambda c: c and any(x in c.lower() for x in ["company", "employer", "org"]))
            company = company_el.get_text(strip=True) if company_el else ""
            city_el = card.find(class_=lambda c: c and any(x in c.lower() for x in ["location", "city", "place"]))
            city = city_el.get_text(strip=True) if city_el else ""
            link = card.find("a")
            url = link.get("href", "") if link else ""
            if url and not url.startswith("http"):
                url = f"https://www.{platform}.sa{url}"
            jobs.append({
                "title": title,
                "company": company or "شركة سعودية",
                "city": normalize_city(city),
                "description": title + (" - " + company if company else ""),
                "apply_url": url,
                "platform": platform,
                "published_at": datetime.utcnow().isoformat(),
            })
        return jobs
    except Exception:
        return []


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
