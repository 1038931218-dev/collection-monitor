#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Reddit r/SideProject using existing Chrome
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
            print("✓ Connected to existing Chrome")
        except Exception as e:
            print(f"✗ Could not connect: {e}")
            return
        
        # Get default context and create new page
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Navigate to Reddit submit page
        print("\n[1/5] Navigating to r/SideProject...")
        await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
        await page.wait_for_load_state("networkidle")
        print(f"   URL: {page.url}")
        
        # Wait for page to load
        await page.wait_for_timeout(3000)
        
        # Take screenshot
        print("\n[2/5] Taking screenshot...")
        await page.screenshot(path="reddit-post-page.png")
        print("   Screenshot saved: reddit-post-page.png")
        
        # Check if logged in
        current_url = page.url
        if "login" in current_url or "oauth" in current_url:
            print("\n⚠️  Not logged in to Reddit")
            print("Please login manually in the browser.")
            print("Press Enter when ready...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Find and fill title
        print("\n[3/5] Filling title...")
        try:
            # Look for title input
            title_input = await page.query_selector('input[name="title"], #title, [placeholder*="title" i]')
            if title_input:
                await title_input.fill(POST_TITLE)
                print(f"   ✓ Title filled")
            else:
                print("   ⚠️  Could not find title input")
                # List all inputs for debugging
                inputs = await page.query_selector_all('input')
                print(f"   Found {len(inputs)} inputs")
        except Exception as e:
            print(f"   ⚠️  Title fill error: {e}")
        
        # Find and fill body
        print("\n[4/5] Filling body...")
        try:
            # Reddit uses a rich text editor
            body_selector = await page.query_selector('div[role="textbox"], .RichTextEditor-root, textarea[name="text"]')
            if body_selector:
                await body_selector.click()
                await page.wait_for_timeout(500)
                # Use Control+A to select all and type
                await page.keyboard.press('Control+a')
                await page.keyboard.type(POST_BODY)
                print("   ✓ Body filled")
            else:
                print("   ⚠️  Could not find body editor")
        except Exception as e:
            print(f"   ⚠️  Body fill error: {e}")
        
        await page.wait_for_timeout(2000)
        
        # Take another screenshot
        await page.screenshot(path="reddit-filled.png")
        
        # Click post button
        print("\n[5/5] Clicking post button...")
        try:
            # Look for submit button
            post_btn = await page.query_selector('button[type="submit"], button[data-testid="submit-btn"], button:has-text("Post")')
            if post_btn:
                await post_btn.click()
                print("   ✓ Clicked post button")
            else:
                print("   ⚠️  Could not find post button")
            
            await page.wait_for_timeout(5000)
            
            current_url = page.url
            print(f"\nResult URL: {current_url}")
            
            # Check if post was created
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
                await page.screenshot(path="reddit-failure.png")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path="reddit-error.png")
        
        # Keep browser open for a moment
        print("\n⏳ Browser will close in 5 seconds...")
        await page.wait_for_timeout(5000)
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
