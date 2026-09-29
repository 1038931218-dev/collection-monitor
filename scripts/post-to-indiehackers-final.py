#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Indie Hackers - Final Version
Navigate to correct post page
"""
import asyncio
import json
import time
from pathlib import Path
from playwright.async_api import async_playwright

POST_TITLE = "I built a tool that tells small businesses which invoice to chase first"
POST_BODY = """I built Collection Monitor — a simple tool that helps small business owners decide which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Core value: "Know which invoice to chase today."

Why I built it: As a logistics worker, I see how hard it is for small businesses to manage cash flow. Overdue invoices pile up and owners don't know where to start.

Currently in early validation. Would love feedback:
- What's missing?
- Where did you get confused?
- Would you use this?

Demo: https://collection-monitor-nine.vercel.app

Thanks!"""

async def main():
    print("=" * 60)
    print("Phase 6.5 - Post to Indie Hackers (Final)")
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
        
        # Navigate to post creation page
        print("\n[1/5] Navigating to Indie Hackers post page...")
        try:
            # Try different URLs
            urls_to_try = [
                "https://www.indiehackers.com/post",
                "https://www.indiehackers.com/write",
                "https://www.indiehackers.com/community/post/new",
            ]
            
            for url in urls_to_try:
                print(f"   Trying: {url}")
                try:
                    await page.goto(url, timeout=15000)
                    await page.wait_for_load_state("networkidle")
                    print(f"   Loaded: {page.url}")
                    break
                except Exception as e:
                    print(f"   Failed: {e}")
                    continue
        except Exception as e:
            print(f"   Error: {e}")
            return
        
        # Check login status
        await page.wait_for_timeout(3000)
        current_url = page.url
        print(f"\n   Current URL: {current_url}")
        
        if "sign-in" in current_url or "login" in current_url or "join" in current_url:
            print("\n⚠️  Not logged in to Indie Hackers")
            print("Please login manually in the browser window.")
            print("Press Enter when ready...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Take screenshot to see what's on screen
        print("\n[2/5] Taking screenshot...")
        await page.screenshot(path="ih-post-page.png")
        print("   Screenshot saved: ih-post-page.png")
        
        # Find all input fields
        print("\n[3/5] Finding input fields...")
        inputs = await page.query_selector_all('input, textarea, [contenteditable], button')
        print(f"   Found {len(inputs)} interactive elements")
        
        for i, elem in enumerate(inputs[:15]):
            try:
                tag = await elem.evaluate('el => el.tagName')
                type_attr = await elem.evaluate('el => el.type || ""')
                placeholder = await elem.evaluate('el => el.placeholder || el.getAttribute("data-placeholder") || ""')
                text = await elem.evaluate('el => el.textContent || ""').catch(lambda e: "")
                classes = await elem.evaluate('el => el.className').catch(lambda e: "")
                if text and len(text) > 0:
                    text = text[:30] + "..." if len(text) > 30 else text
                print(f"   {i+1}. <{tag}> type={type_attr} placeholder='{placeholder}' text='{text}'")
            except:
                pass
        
        # Try to fill title
        print("\n[4/5] Filling title...")
        try:
            # Look for title input
            title_input = await page.query_selector('input[placeholder*="title" i], input[type="text"]')
            if title_input:
                await title_input.fill(POST_TITLE)
                print("   ✓ Title filled")
            else:
                print("   ⚠️  Could not find title field")
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
        
        # Try to fill body
        print("\n[5/5] Filling body...")
        try:
            # Look for content editor
            body_editor = await page.query_selector('[contenteditable="true"], .trix-editor, textarea')
            if body_editor:
                await body_editor.click()
                await page.wait_for_timeout(500)
                await page.keyboard.press('Control+a')
                await page.keyboard.type(POST_BODY)
                print("   ✓ Body filled")
            else:
                print("   ⚠️  Could not find body editor")
        except Exception as e:
            print(f"   ⚠️  Error: {e}")
        
        await page.wait_for_timeout(2000)
        
        # Click post button
        print("\nClicking post button...")
        try:
            post_btn = await page.query_selector('button[type="submit"], button:has-text("Post"), button:has-text("Publish"), button:has-text("Create")')
            if post_btn:
                await post_btn.click()
                print("   ✓ Clicked post button")
            else:
                print("   ⚠️  Could not find post button")
            
            await page.wait_for_timeout(5000)
            
            current_url = page.url
            print(f"\nResult URL: {current_url}")
            
            # Check if post was created
            if "post/" in current_url or "/p/" in current_url:
                print("\n✅ SUCCESS! Post created!")
                print(f"URL: {current_url}")
                
                result = {
                    "platform": "indiehackers",
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
                print(f"   URL: {current_url}")
                await page.screenshot(path="ih-final-failure.png")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path="ih-final-error.png")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
