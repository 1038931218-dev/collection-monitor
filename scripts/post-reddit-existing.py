#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Reddit r/SideProject - Use Existing Tab
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
        print("\n[1/5] Connecting to Chrome...")
        browser = await p.chromium.connect_over_cdp("http://localhost:9222", timeout=10000)
        print("   ✓ Connected")
        
        # Get the default context
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        
        # Find existing Reddit tab
        print("\n[2/5] Finding Reddit tab...")
        reddit_page = None
        
        # List all pages in context
        pages = context.pages
        print(f"   Found {len(pages)} pages in context")
        
        for i, page in enumerate(pages):
            print(f"   Page {i+1}: {page.url[:60]}...")
            if "reddit.com" in page.url:
                reddit_page = page
                print(f"   ✓ Found Reddit page: {page.url}")
                break
        
        if not reddit_page:
            # Create new page
            print("   Creating new page...")
            reddit_page = await context.new_page()
        
        # Navigate if needed
        if "SideProject/submit" not in reddit_page.url:
            print("\n[3/5] Navigating to submit page...")
            await reddit_page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
            await reddit_page.wait_for_load_state("networkidle")
        else:
            print("   Already on submit page")
        
        await reddit_page.wait_for_timeout(2000)
        
        # Take screenshot
        print("\n[4/5] Taking screenshot...")
        await reddit_page.screenshot(path="reddit-current-tab.png")
        
        # Fill title
        print("\n[5/5] Filling form...")
        try:
            title_input = await reddit_page.query_selector('input[name="title"], #title')
            if title_input:
                await title_input.fill(POST_TITLE)
                print("   ✓ Title filled")
            else:
                print("   ⚠️  Could not find title input")
        except Exception as e:
            print(f"   ⚠️  Title fill error: {e}")
        
        try:
            body_editor = await reddit_page.query_selector('div[role="textbox"], textarea[name="text"]')
            if body_editor:
                await body_editor.click()
                await reddit_page.wait_for_timeout(300)
                await reddit_page.keyboard.press('Control+a')
                await reddit_page.keyboard.type(POST_BODY)
                print("   ✓ Body filled")
            else:
                print("   ⚠️  Could not find body editor")
        except Exception as e:
            print(f"   ⚠️  Body fill error: {e}")
        
        await reddit_page.wait_for_timeout(1000)
        await reddit_page.screenshot(path="reddit-filled-tab.png")
        
        # Click post
        print("\nClicking post button...")
        try:
            post_btn = await reddit_page.query_selector('button[type="submit"]')
            if post_btn:
                await post_btn.click()
                print("   ✓ Post button clicked")
            
            await reddit_page.wait_for_timeout(5000)
            
            current_url = reddit_page.url
            print(f"\nResult URL: {current_url}")
            
            if "reddit.com/r/SideProject/comments/" in current_url:
                print("\n✅ SUCCESS! Post created!")
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
                print("\n❌ Failed to post")
                await reddit_page.screenshot(path="reddit-failure.png")
        except Exception as e:
            print(f"❌ Error: {e}")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
