"""سكرابر طاقات باستخدام Playwright"""
import asyncio
from typing import List, Dict
from datetime import datetime

async def scrape_taqat(search_keywords: List[str]) -> List[Dict]:
    jobs = []
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            for keyword in search_keywords[:3]:
                try:
                    await page.goto(f"https://www.taqat.sa/en/jobs?q={keyword}&location=", timeout=30000)
                    await page.wait_for_selector(".job-card, .jobs-list", timeout=10000)
                    
                    cards = await page.query_selector_all(".job-card, [class*='job-item']")
                    for card in cards[:10]:
                        try:
                            title   = await (await card.query_selector(".job-title, h3, h4"))?.inner_text() or ""
                            company = await (await card.query_selector(".company-name, .employer"))?.inner_text() or ""
                            city    = await (await card.query_selector(".location, .city"))?.inner_text() or ""
                            link    = await card.get_attribute("href") or await (await card.query_selector("a"))?.get_attribute("href") or ""
                            
                            if title and company:
                                jobs.append({
                                    "title": title.strip(),
                                    "company": company.strip(),
                                    "city": normalize_city(city),
                                    "description": f"{title} at {company}",
                                    "apply_url": f"https://www.taqat.sa{link}" if link.startswith("/") else link,
                                    "platform": "taqat",
                                    "published_at": datetime.utcnow().isoformat(),
                                })
                        except Exception:
                            continue
                except Exception:
                    continue
            
            await browser.close()
    except Exception as e:
        print(f"[Taqat Scraper Error] {e}")
    
    return jobs

def normalize_city(city_text: str) -> str:
    city_lower = city_text.lower()
    if "مدينة" in city_lower or "madinah" in city_lower or "medina" in city_lower:
        return "madinah"
    if "جدة" in city_lower or "jeddah" in city_lower or "jedda" in city_lower:
        return "jeddah"
    if "رياض" in city_lower or "riyadh" in city_lower:
        return "riyadh"
    if "ينبع" in city_lower or "yanbu" in city_lower:
        return "yanbu"
    return "other"
