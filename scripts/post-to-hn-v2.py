#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Hacker News Show HN - Direct CDP
"""
import asyncio
import json
import time
from pathlib import Path

HN_TITLE = "Show HN: Collection Monitor – AR prioritization for small businesses"
HN_URL = "https://collection-monitor-nine.vercel.app"
HN_BODY = """I built a tool that tells small businesses which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Core value: "Know which invoice to chase today."

Currently in early validation. Would love feedback from small business owners who deal with overdue invoices.

What would make this useful for you?"""

async def main():
    print("=" * 60)
    print("Phase 6.5 - Post to Hacker News Show HN")
    print("=" * 60)
    
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        browser = await p.chromium.connect_over_cdp("http://localhost:9222", timeout=10000)
        print("\n✓ Connected to Chrome")
        
        # Get the first page that's not about:blank
        pages = browser.pages if hasattr(browser, 'pages') else []
        print(f"Found {len(pages)} pages")
        
        # Find HN submit page or create new
        target_page = None
        for page in pages:
            if "news.ycombinator.com" in page.url:
                target_page = page
                break
        
        if not target_page:
            context = browser.contexts[0] if browser.contexts else await browser.new_context()
            target_page = await context.new_page()
        
        # Navigate to submit page
        print("\n[1/3] Navigating to Show HN...")
        await target_page.goto("https://news.ycombinator.com/submit", timeout=30000)
        await target_page.wait_for_load_state("networkidle")
        print(f"   URL: {target_page.url}")
        
        await target_page.wait_for_timeout(2000)
        
        # Check login
        if "login" in target_page.url.lower():
            print("   ⚠️  Not logged in to HN")
            print("   Please login manually in the browser.")
            print("   Press Enter when ready...")
            try:
                input()
            except:
                pass
            await target_page.reload()
            await target_page.wait_for_timeout(2000)
        
        # Fill form
        print("\n[2/3] Filling form...")
        try:
            title_input = await target_page.query_selector('input[name="title"]')
            if title_input:
                await title_input.fill(HN_TITLE)
                print("   ✓ Title filled")
            
            url_input = await target_page.query_selector('input[name="url"]')
            if url_input:
                await url_input.fill(HN_URL)
                print("   ✓ URL filled")
            
            textarea = await target_page.query_selector('textarea')
            if textarea:
                await textarea.fill(HN_BODY)
                print("   ✓ Body filled")
        except Exception as e:
            print(f"   Error: {e}")
        
        # Submit
        print("\n[3/3] Submitting...")
        try:
            submit_btn = await target_page.query_selector('input[type="submit"]')
            if submit_btn:
                await submit_btn.click()
                print("   ✓ Submitted")
            
            await target_page.wait_for_timeout(5000)
            print(f"\n   Result: {target_page.url}")
            
            if "item?id=" in target_page.url or "show" in target_page.url.lower() or "new" in target_page.url.lower():
                print("\n✅ SUCCESS! Post created!")
                
                result = {
                    "platform": "hackernews",
                    "status": "success",
                    "url": target_page.url,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                log_dir = Path("docs/logs")
                log_dir.mkdir(parents=True, exist_ok=True)
                with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(result) + "\n")
            else:
                print("\n❌ Failed")
                await target_page.screenshot(path="hn-failure.png")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
