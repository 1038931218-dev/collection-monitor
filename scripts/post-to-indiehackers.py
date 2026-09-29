#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Indie Hackers using Playwright + existing Chrome
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
    print("Phase 6.5 - Post to Indie Hackers")
    print("=" * 60)
    
    async with async_playwright() as p:
        # Try to connect to existing Chrome
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("Connected to existing Chrome")
        except Exception as e:
            print(f"Could not connect: {e}, launching new browser...")
            browser = await p.chromium.launch(
                headless=False,
                args=["--no-sandbox", "--disable-setuid-sandbox"]
            )
        
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Navigate to Indie Hackers
        print("\n[1/4] Navigating to Indie Hackers...")
        try:
            await page.goto("https://www.indiehackers.com/post", timeout=30000)
            await page.wait_for_load_state("networkidle")
            print(f"   URL: {page.url}")
        except Exception as e:
            print(f"   Error: {e}")
            await page.screenshot(path="ih-error.png")
            return
        
        # Check if logged in
        await page.wait_for_timeout(3000)
        if "sign-in" in page.url.lower() or "login" in page.url.lower():
            print("\n⚠️  Not logged in to Indie Hackers")
            print("Please login manually, then press Enter...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Fill title
        print("\n[2/4] Filling title...")
        try:
            await page.wait_for_selector('input[type="text"], [placeholder*="title"]', timeout=10000)
            await page.fill('input[type="text"]', POST_TITLE)
            print("   ✓ Done")
        except:
            print("   ⚠️  Could not find title field")
        
        # Fill body
        print("\n[3/4] Filling body...")
        try:
            # Find content editor
            editors = page.locator('[contenteditable="true"], .trix-editor, [data-trix-editor]')
            if await editors.count() > 0:
                await editors.first.click()
                await page.keyboard.press('Control+a')
                await page.keyboard.type(POST_BODY)
                print("   ✓ Done")
            else:
                # Try textarea
                await page.fill('textarea', POST_BODY)
                print("   ✓ Done")
        except Exception as e:
            print(f"   ⚠️  Body fill error: {e}")
        
        await page.wait_for_timeout(2000)
        
        # Click post button
        print("\n[4/4] Clicking post button...")
        try:
            buttons = [
                'button[type="submit"]',
                'button:has-text("Post")',
                'button:has-text("Publish")',
                '.PostButton',
            ]
            
            clicked = False
            for selector in buttons:
                try:
                    btn = page.locator(selector).first
                    if await btn.count() > 0:
                        await btn.click()
                        clicked = True
                        print(f"   ✓ Clicked: {selector}")
                        break
                except:
                    continue
            
            if not clicked:
                print("   ⚠️  Could not find post button")
            
            await page.wait_for_timeout(5000)
            
            current_url = page.url
            print(f"\nResult URL: {current_url}")
            
            if "indiehackers.com/post/" in current_url or "indiehackers.com/p/" in current_url:
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
                await page.screenshot(path="ih-failure.png")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path="ih-error2.png")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
