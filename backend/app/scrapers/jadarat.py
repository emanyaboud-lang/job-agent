"""سكرابر جدارات باستخدام Playwright"""
import asyncio
from typing import List, Dict
from datetime import datetime
from app.scrapers.taqat import normalize_city

async def scrape_jadarat(search_keywords: List[str]) -> List[Dict]:
    jobs = []
    try:
        from playwright.async_api import async_playwright
        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            page = await browser.new_page()
            
            for keyword in search_keywords[:3]:
                try:
                    await page.goto(f"https://jadarat.sa/en/jobs?q={keyword}", timeout=30000)
                    await page.wait_for_selector("[class*='job'], [class*='vacancy']", timeout=10000)
                    
                    cards = await page.query_selector_all("[class*='job-card'], [class*='vacancy-item']")
                    for card in cards[:10]:
                        try:
                            title   = await (await card.query_selector("h2, h3, [class*='title']"))?.inner_text() or ""
                            company = await (await card.query_selector("[class*='company'], [class*='employer']"))?.inner_text() or ""
                            city    = await (await card.query_selector("[class*='location'], [class*='city']"))?.inner_text() or ""
                            link    = await (await card.query_selector("a"))?.get_attribute("href") or ""
                            
                            if title:
                                jobs.append({
                                    "title": title.strip(),
                                    "company": company.strip() or "جهة حكومية",
                                    "city": normalize_city(city),
                                    "description": f"{title} - {company}",
                                    "apply_url": f"https://jadarat.sa{link}" if link.startswith("/") else link,
                                    "platform": "jadarat",
                                    "published_at": datetime.utcnow().isoformat(),
                                })
                        except Exception:
                            continue
                except Exception:
                    continue
            
            await browser.close()
    except Exception as e:
        print(f"[Jadarat Scraper Error] {e}")
    
    return jobs
