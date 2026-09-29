#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Reddit r/SideProject
"""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

POST_TITLE = "I built a tool that tells small businesses which invoice to chase first"
POST_BODY = """Hey r/SideProject,

I built Collection Monitor — a simple tool that helps small business owners decide which invoice to chase first.

What it does:
- Upload your AR Excel/CSV (supports multiple formats)
- Automatically calculates aging buckets and priority scores
- AI explains why each invoice is prioritized
- Generates follow-up message drafts

Why I built it:
As a logistics worker, I see how hard it is for small businesses to manage cash flow. Overdue invoices pile up and owners don't know where to start.

Currently in early validation. Would love honest feedback:
- What's missing?
- Where did you get confused?
- Would you use this?

Demo: https://collection-monitor-nine.vercel.app

Thanks!"""

async def main():
    print("=" * 60)
    print("Phase 6.5 - Post to Reddit r/SideProject")
    print("=" * 60)
    
    async with async_playwright() as p:
        browser = await p.chromium.launch(
            headless=False,
            args=["--no-sandbox", "--disable-setuid-sandbox"]
        )
        
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Navigate to Reddit
        print("\n[1/4] Navigating to Reddit...")
        await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
        await page.wait_for_load_state("networkidle")
        print(f"   URL: {page.url}")
        
        # Check login
        await page.wait_for_timeout(3000)
        if "login" in page.url.lower():
            print("   ⚠️  Not logged in. Please login manually...")
            print("   Press Enter when ready...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Fill title
        print("\n[2/4] Filling title...")
        await page.fill("#title", POST_TITLE)
        print("   ✓ Done")
        
        # Fill body
        print("\n[3/4] Filling body...")
        try:
            await page.click('#desc-textarea')
            await page.wait_for_timeout(500)
            await page.keyboard.press('Control+a')
            await page.keyboard.type(POST_BODY)
            print("   ✓ Done")
        except:
            await page.fill("#description", POST_BODY)
            print("   ✓ Done")
        
        # Click post
        print("\n[4/4] Clicking post button...")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)
        
        try:
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(5000)
            
            current_url = page.url
            print(f"\nResult URL: {current_url}")
            
            if "reddit.com/r/SideProject/comments/" in current_url:
                print("\n✅ SUCCESS! Post created!")
                print(f"URL: {current_url}")
                
                result = {
                    "platform": "reddit",
                    "subreddit": "SideProject",
                    "status": "success",
                    "url": current_url,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                log_dir = Path("docs/logs")
                log_dir.mkdir(parents=True, exist_ok=True)
                with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(result) + "\n")
            else:
                print("\n❌ Failed")
                await page.screenshot(path="reddit-post-failed.png")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path="reddit-post-error.png")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
