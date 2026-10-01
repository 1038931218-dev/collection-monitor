#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to HN and Reddit via Playwright + existing Chrome
"""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

HN_TITLE = "Show HN: Collection Monitor – AR prioritization for small businesses"
HN_URL = "https://collection-monitor-nine.vercel.app"
HN_BODY = """I built a tool that tells small businesses which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Core value: "Know which invoice to chase today."

Currently in early validation. Would love feedback from small business owners who deal with overdue invoices.

What would make this useful for you?"""

REDDIT_TITLE = "I built a tool that tells small businesses which invoice to chase first"
REDDIT_BODY = """Hey r/SideProject,

I built Collection Monitor — a simple tool that helps small business owners decide which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Core value: "Know which invoice to chase today."

Why I built it: As a logistics worker, I see how hard it is for small businesses to manage cash flow. Overdue invoices pile up and owners don't know where to start.

Currently in early validation. Would love honest feedback from actual small business owners:
- What would make this useful for you?
- Where did you get confused?
- Would you use this again?

Demo: https://collection-monitor-nine.vercel.app

Thanks!"""

async def post_hn(browser, context):
    print("\n" + "="*60)
    print("Posting to Hacker News Show HN")
    print("="*60)
    
    page = await context.new_page()
    await page.goto("https://news.ycombinator.com/submit", timeout=30000)
    await page.wait_for_load_state("networkidle")
    print(f"URL: {page.url}")
    
    # Fill form
    try:
        await page.fill('input[name="title"]', HN_TITLE)
        print("✓ Title filled")
        await page.fill('textarea[name="url"]', HN_URL)
        print("✓ URL filled")
        
        # Find and fill text area
        textareas = await page.query_selector_all('textarea')
        if textareas:
            await textareas[0].fill(HN_BODY)
            print("✓ Body filled")
        
        # Click submit
        await page.click('input[type="submit"]')
        await page.wait_for_timeout(3000)
        
        print(f"Result: {page.url}")
        
        result = {
            "platform": "hackernews",
            "status": "pending",
            "url": page.url,
            "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
        }
        
        log_dir = Path("docs/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(result) + "\n")
            
    except Exception as e:
        print(f"Error: {e}")
        await page.screenshot(path="hn-failure.png")
    
    await page.close()
    return True

async def post_reddit(browser, context):
    print("\n" + "="*60)
    print("Posting to Reddit r/SideProject")
    print("="*60)
    
    page = await context.new_page()
    await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
    await page.wait_for_load_state("networkidle")
    print(f"URL: {page.url}")
    
    await page.wait_for_timeout(2000)
    
    # Check login
    if "login" in page.url.lower():
        print("⚠️  Not logged in to Reddit")
        await page.screenshot(path="reddit-login-needed.png")
        return False
    
    # Fill form
    try:
        await page.fill('input[name="title"]', REDDIT_TITLE)
        print("✓ Title filled")
        
        # Fill body - Reddit uses a rich text editor
        body_editor = await page.query_selector('div[role="textbox"], textarea[name="text"]')
        if body_editor:
            await body_editor.click()
            await page.wait_for_timeout(500)
            await page.keyboard.press('Control+a')
            await page.keyboard.type(REDDIT_BODY)
            print("✓ Body filled")
        
        # Click post
        await page.click('button[type="submit"]')
        await page.wait_for_timeout(5000)
        
        print(f"Result: {page.url}")
        
        if "reddit.com/r/SideProject/comments/" in page.url:
            print("\n✅ SUCCESS!")
            result = {
                "platform": "reddit-sideproject",
                "status": "success",
                "url": page.url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        else:
            print("\n❌ Failed")
            result = {
                "platform": "reddit-sideproject",
                "status": "failed",
                "url": page.url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
        
        log_dir = Path("docs/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
            f.write(json.dumps(result) + "\n")
            
    except Exception as e:
        print(f"Error: {e}")
        await page.screenshot(path="reddit-failure.png")
    
    await page.close()
    return True

async def main():
    print("="*60)
    print("Phase 6.5 - Market Validation Posts")
    print("="*60)
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        browser = await p.chromium.connect_over_cdp("http://localhost:9222", timeout=10000)
        print("\n✓ Connected to Chrome")
        
        # Use default context
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        
        # Post to HN
        await post_hn(browser, context)
        
        # Post to Reddit
        await post_reddit(browser, context)
        
        await browser.close()
        
        print("\n" + "="*60)
        print("Done! Check docs/logs/market-validation.jsonl for results")
        print("="*60)

if __name__ == "__main__":
    asyncio.run(main())
