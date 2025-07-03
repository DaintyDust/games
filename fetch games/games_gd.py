import asyncio
import json
import time
import os
import sys
from urllib.parse import urlparse
from bs4 import BeautifulSoup
from playwright.async_api import async_playwright, TimeoutError

if os.name == 'nt':
    sys.stdout.reconfigure(encoding='utf-8')

# HOW TO USE 

# run 'python games_gd.py list'
# wait until done
# run 'python games_gd.py detail'


BASE = "https://gamedistribution.com"
START = "/games/"

LIST_FILE = "games/games_list.json"
DETAIL_FILE = "games/games_gd_full.json"

def clean_embed(text):
    p = urlparse(text)
    return p._replace(query="", fragment="").geturl()

async def scroll_page(page):
    prev = await page.evaluate("() => document.body.scrollHeight")
    while True:
        await page.evaluate("() => window.scrollTo(0, document.body.scrollHeight)")
        await asyncio.sleep(1)
        curr = await page.evaluate("() => document.body.scrollHeight")
        if curr == prev:
            break
        prev = curr

async def scrape_list(page):
    await scroll_page(page)
    html = await page.content()
    soup = BeautifulSoup(html, "html.parser")
    games = []
    for div in soup.select("div.ProductItem_productList__sA9IM"):
        title_el = div.select_one("a.product-name")
        img_el = div.select_one("a.product-img img")
        href_el = div.select_one("a.product-img")
        comp_el = div.select_one("a.company-name")
        if not (title_el and img_el and href_el and comp_el):
            continue
        games.append({
            "game_title": title_el.text.strip(),
            "page_url": BASE + href_el["href"],
            "game_icon": img_el["src"],
            "company": comp_el.text.strip()
        })
    return games

async def fetch_game_list():
    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=True)
        page = await browser.new_page()
        await page.goto(BASE + START)
        await page.wait_for_load_state("networkidle")

        try:
            btn = await page.query_selector("button#onetrust-accept-btn-handler")
            if btn:
                await btn.click()
                await asyncio.sleep(1)
                print("Cookies accepted")
        except:
            pass

        all_games = []
        seen_urls = set()
        page_num = 1

        while True:
            print(f"[List] Page {page_num}")
            games = await scrape_list(page)
            new = [g for g in games if g["page_url"] not in seen_urls]
            for g in new:
                seen_urls.add(g["page_url"])
            all_games.extend(new)
            print(f" - New games: {len(new)} (Total: {len(all_games)})")

            next_btn = await page.query_selector("a.pagination-button.next-button")
            if next_btn:
                try:
                    await next_btn.click()
                    await page.wait_for_load_state("networkidle")
                    await asyncio.sleep(1)
                    page_num += 1
                except Exception as e:
                    print("Pagination click failed:", e)
                    break
            else:
                break

        with open(LIST_FILE, "w", encoding="utf-8") as f:
            json.dump(all_games, f, ensure_ascii=False, indent=2)

        await browser.close()
        print(f"Saved list to {LIST_FILE}")

async def scrape_detail(game, retry=3):
    for attempt in range(retry):
        try:
            async with async_playwright() as pw:
                browser = await pw.chromium.launch(headless=True)
                page = await browser.new_page()
                await page.goto(game["page_url"], timeout=90000)

                await page.evaluate("""
                    document.querySelectorAll('#onetrust-consent-sdk, .ot-dialog, .onetrust-pc-dark-filter')
                            .forEach(el => el.remove());
                """)
                await page.wait_for_selector("div.games_gameDetail__tX9YO", timeout=30000)

                soup = BeautifulSoup(await page.content(), "html.parser")

                span = soup.select_one(".copy-box div:not(.mb-6) span.copy-input")
                if span and span.text.strip().startswith("https://html5.gamedistribution.com"):
                    game["iframe_url"] = clean_embed(span.text.strip())

                for li in soup.select("ul.row li"):
                    strong, span_el = li.select_one("strong"), li.select_one("span")
                    if strong and span_el:
                        key = strong.text.strip().rstrip(":").lower().replace(" ", "_")
                        game[key] = span_el.text.strip()

                ps = soup.select("div.games_gameDetail__tX9YO article p")
                if len(ps) >= 2:
                    game["description"] = ps[0].get_text(strip=True)
                    game["instructions"] = ps[1].get_text(strip=True)

                for field in ("genres", "tags"):
                    section = soup.find("h4", string=field.title())
                    if section:
                        parent = section.find_parent("div", class_="row")
                        if parent:
                            game[field] = [t.text.strip() for t in parent.select(".tag")]

                for row in soup.select("div.games_gameDetail__tX9YO .info-line .row"):
                    header = row.select_one("span.flex")
                    tags = row.select(".tag")
                    if header and tags:
                        key = header.get_text(strip=True).lower().replace(" ", "_")
                        game[key] = [t.get_text(strip=True) for t in tags]

                await browser.close()
                return game

        except Exception as e:
            print(f"[Attempt {attempt + 1}] Failed {game['page_url']} - {e}")
            await asyncio.sleep(2 + attempt * 2)

    print("Final fail after retries:", game["page_url"])
    return game

async def enrich_all_details():
    with open(LIST_FILE, encoding="utf-8") as f:
        games = json.load(f)

    results = []
    sem = asyncio.Semaphore(10)  # Increase concurrency level

    async def bounded_scrape(game):
        async with sem:
            enriched = await scrape_detail(game)
            results.append(enriched)
            await asyncio.sleep(0.5)

    tasks = [bounded_scrape(game) for game in games]
    await asyncio.gather(*tasks)

    with open(DETAIL_FILE, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"Saved details to {DETAIL_FILE}")

if __name__ == "__main__":
    mode = sys.argv[1] if len(sys.argv) > 1 else "list"
    if mode == "list":
        asyncio.run(fetch_game_list())
    elif mode == "detail":
        asyncio.run(enrich_all_details())
    else:
        print("Unknown mode. Use 'list' or 'detail'")
