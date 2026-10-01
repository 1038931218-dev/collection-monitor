#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Reddit r/SideProject - Non-interactive Version
"""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

POST_TITLE = "I built a tool that tells small businesses which invoice to chase first"
POST_BODY = """Hey r/SideProject,

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

async def main():
    print("=" * 60)
    print("Phase 6.5 - Post to Reddit r/SideProject")
    print("=" * 60)
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("Connected to existing Chrome")
        except Exception as e:
            print(f"Could not connect: {e}")
            return
        
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Navigate to Reddit submit page
        print("\n[1/4] Navigating to r/SideProject...")
        await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
        await page.wait_for_load_state("networkidle")
        print(f"   URL: {page.url}")
        
        # Wait for page to load
        await page.wait_for_timeout(3000)
        
        # Check if logged in by checking URL
        current_url = page.url
        if "login" in current_url or "oauth" in current_url:
            print("Not logged in to Reddit")
            print("Please login manually in the browser window.")
            print("Then press any key to continue...")
            # Don't wait for input, just continue
            await page.wait_for_timeout(10000)
        
        # Take screenshot to check state
        print("\n[2/4] Taking screenshot...")
        await page.screenshot(path="reddit-status.png")
        
        # Try to find title input
        print("\n[3/4] Filling title...")
        title_found = False
        for selector in ['input[name="title"]', '#title', 'input[type="text"]']:
            try:
                elem = await page.query_selector(selector)
                if elem:
                    await elem.fill(POST_TITLE)
                    print(f"   Title filled using: {selector}")
                    title_found = True
                    break
            except:
                continue
        
        # Try to find body editor
        print("\n[4/4] Filling body...")
        body_found = False
        for selector in ['div[role="textbox"]', '.RichTextEditor-root', 'textarea[name="text"]']:
            try:
                elem = await page.query_selector(selector)
                if elem:
                    await elem.click()
                    await page.wait_for_timeout(500)
                    await page.keyboard.press('Control+a')
                    await page.keyboard.type(POST_BODY)
                    print("   Body filled")
                    body_found = True
                    break
            except:
                continue
        
        await page.wait_for_timeout(2000)
        await page.screenshot(path="reddit-filled.png")
        
        # Click post button
        print("\nClicking post button...")
        try:
            post_btn = await page.query_selector('button[type="submit"], button[data-testid="submit-btn"]')
            if post_btn:
                await post_btn.click()
                print("   Post button clicked")
            
            await page.wait_for_timeout(5000)
            
            current_url = page.url
            print(f"\nResult URL: {current_url}")
            
            if "reddit.com/r/SideProject/comments/" in current_url:
                print("\nSUCCESS! Post created!")
                print(f"URL: {current_url}")
                
                result = {
                    "platform": "reddit-sideproject",
                    "status": "success",
                    "url": current_url,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                log_dir = Path("docs/logs")
                log_dir.mkdir(parents=True, exist_ok=True)
                with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(result) + "\n")
            else:
                print("\nFailed to post")
                await page.screenshot(path="reddit-final.png")
        except Exception as e:
            print(f"Error: {e}")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
