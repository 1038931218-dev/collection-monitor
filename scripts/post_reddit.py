#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 6.5 - Auto Post to Reddit r/SideProject
Uses Playwright with existing Chrome instance
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

POST_URL = "https://collection-monitor-nine.vercel.app"

def log(msg):
    print(f"[INFO] {msg}")

async def main():
    log("Starting browser automation for Reddit post...")
    
    async with async_playwright() as p:
        # Connect to existing Chrome instance or launch new one
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            log("Connected to existing Chrome via CDP")
        except Exception as e:
            log(f"Could not connect to existing Chrome ({e}), launching new instance...")
            browser = await p.chromium.launch(
                headless=False,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
        
        context = await browser.new_context()
        page = await context.new_page()
        
        # Navigate to Reddit submit page
        log("Navigating to Reddit r/SideProject...")
        await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
        await page.wait_for_timeout(3000)
        
        # Check if logged in
        current_url = page.url
        if "login" in current_url or "oauth" in current_url:
            log("⚠️  Not logged in to Reddit. Please login manually in the browser.")
            log("Waiting 60 seconds for manual login...")
            await page.wait_for_timeout(60000)
        
        # Fill title
        log("Filling title...")
        await page.fill('#title', POST_TITLE)
        await page.wait_for_timeout(1000)
        
        # Fill selftext
        log("Filling body text...")
        try:
            await page.fill('#description', POST_BODY)
        except:
            # Try alternative selector
            await page.click('#desc-textarea')
            await page.wait_for_timeout(500)
            await page.keyboard.press('Control+a')
            await page.keyboard.type(POST_BODY)
        
        await page.wait_for_timeout(1000)
        
        # Scroll to bottom to find post button
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(1000)
        
        # Click post button
        log("Clicking post button...")
        try:
            await page.click('button[type="submit"]')
            await page.wait_for_timeout(5000)
            log(f"✅ Post submitted! Current URL: {page.url}")
            
            # Save result
            result = {
                "status": "success",
                "url": page.url,
                "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
            }
            log(f"Result: {json.dumps(result, ensure_ascii=False)}")
        except Exception as e:
            log(f"❌ Error posting: {e}")
            # Take screenshot for debugging
            await page.screenshot(path="reddit-post-debug.png")
            log("Screenshot saved: reddit-post-debug.png")
        
        await browser.close()

if __name__ == "__main__":
    asyncio.run(main())
