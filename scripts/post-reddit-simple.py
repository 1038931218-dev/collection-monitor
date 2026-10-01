#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Reddit r/SideProject - Simple Version
"""
import asyncio
import json
import time
from pathlib import Path

async def main():
    print("=" * 60)
    print("Phase 6.5 - Post to Reddit r/SideProject")
    print("=" * 60)
    
    # Use playwright with system Chrome
    from playwright.async_api import async_playwright
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        print("\n[1/4] Connecting to Chrome...")
        browser = None
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222", timeout=5000)
            print("   ✓ Connected")
        except Exception as e:
            print(f"   ✗ Connection failed: {e}")
            print("   Trying with different options...")
            
            # Try with different options
            try:
                browser = await p.chromium.connect_over_cdp("http://127.0.0.1:9222", timeout=5000)
                print("   ✓ Connected (alternate)")
            except Exception as e2:
                print(f"   ✗ Alternate connection also failed: {e2}")
                return
        
        # Get pages
        pages = browser.pages
        print(f"\n[2/4] Found {len(pages)} pages")
        
        if not pages:
            # Create new page in default context
            context = await browser.new_context()
            page = await context.new_page()
            print("   Created new page")
        else:
            page = pages[-1]  # Use last page
            print(f"   Using page: {page.url}")
        
        # Navigate to Reddit
        print("\n[3/4] Navigating to r/SideProject...")
        try:
            await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=15000)
            await page.wait_for_load_state("networkidle")
            print(f"   ✓ Loaded: {page.url}")
        except Exception as e:
            print(f"   ✗ Navigation error: {e}")
            await browser.close()
            return
        
        # Wait for page
        await page.wait_for_timeout(2000)
        
        # Check login status
        current_url = page.url
        if "login" in current_url.lower():
            print("   ⚠️  Not logged in or session expired")
            await browser.close()
            return
        
        # Fill title
        print("\n[4/4] Filling form...")
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
        
        try:
            # Try to fill title
            title_input = await page.query_selector('input[name="title"], #title')
            if title_input:
                await title_input.fill(POST_TITLE)
                print("   ✓ Title filled")
            else:
                print("   ⚠️  Could not find title input")
        except Exception as e:
            print(f"   ⚠️  Title fill error: {e}")
        
        try:
            # Try to fill body
            body_editor = await page.query_selector('div[role="textbox"], textarea[name="text"]')
            if body_editor:
                await body_editor.click()
                await page.wait_for_timeout(300)
                await page.keyboard.press('Control+a')
                await page.keyboard.type(POST_BODY)
                print("   ✓ Body filled")
            else:
                print("   ⚠️  Could not find body editor")
        except Exception as e:
            print(f"   ⚠️  Body fill error: {e}")
        
        await page.wait_for_timeout(1000)
        
        # Click post
        print("\nClicking post button...")
        try:
            post_btn = await page.query_selector('button[type="submit"]')
            if post_btn:
                await post_btn.click()
                print("   ✓ Post button clicked")
            
            await page.wait_for_timeout(5000)
            
            current_url = page.url
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
        except Exception as e:
            print(f"❌ Error: {e}")
        
        if browser:
            await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
