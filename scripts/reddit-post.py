#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 6.5 - Auto Post to Reddit using existing Chrome
"""
import asyncio
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
    print("Phase 6.5 - Auto Post to Reddit r/SideProject")
    print("=" * 60)
    
    async with async_playwright() as p:
        # Try to connect to existing Chrome
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("Connected to existing Chrome")
        except Exception as e:
            print(f"Could not connect: {e}")
            # Launch new browser
            browser = await p.chromium.launch(
                headless=False,
                args=["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage"]
            )
        
        context = await browser.new_context(viewport={"width": 1280, "height": 800})
        page = await context.new_page()
        
        # Navigate to Reddit
        print("\nNavigating to Reddit r/SideProject...")
        try:
            await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
            await page.wait_for_timeout(3000)
            print(f"Current URL: {page.url}")
        except Exception as e:
            print(f"Navigation error: {e}")
            print("Taking screenshot for debugging...")
            await page.screenshot(path="reddit-error.png")
            return
        
        # Check if we need to login
        if "login" in page.url.lower():
            print("⚠️ Need to login to Reddit")
            print("Please login manually, then press Enter to continue...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Fill title
        print("\nFilling title...")
        try:
            await page.wait_for_selector("#title", timeout=10000)
            await page.fill("#title", POST_TITLE)
            print("✓ Title filled")
        except Exception as e:
            print(f"Title error: {e}")
            # Try alternative selector
            await page.fill('[name="title"]', POST_TITLE)
        
        # Fill body
        print("\nFilling body text...")
        try:
            await page.wait_for_selector("#description", timeout=10000)
            await page.fill("#description", POST_BODY)
            print("✓ Body filled")
        except Exception as e:
            print(f"Body error: {e}")
            # Try alternative - click and type
            editors = page.locator('[contenteditable="true"], [class*="RichTextEditor"]')
            if await editors.count() > 0:
                await editors.first.click()
                await page.keyboard.press("Control+a")
                await page.keyboard.type(POST_BODY)
                print("✓ Body filled via editor")
        
        await page.wait_for_timeout(2000)
        
        # Scroll to find post button
        print("\nScrolling to find post button...")
        await page.evaluate("window.scrollTo(0, document.body.scrollHeight)")
        await page.wait_for_timeout(2000)
        
        # Click post button
        print("\nClicking post button...")
        try:
            # Try multiple selectors
            buttons = [
                'button[type="submit"]',
                'button:has-text("Post")',
                'input[type="submit"]',
                '.SubmitButton',
            ]
            
            clicked = False
            for selector in buttons:
                try:
                    btn = page.locator(selector).first
                    if await btn.count() > 0:
                        await btn.click()
                        clicked = True
                        print(f"✓ Clicked button: {selector}")
                        break
                except:
                    continue
            
            if not clicked:
                print("Could not find post button, trying keyboard shortcut...")
                await page.keyboard.press("Control+Enter")
            
            await page.wait_for_timeout(5000)
            
            # Check result
            current_url = page.url
            print(f"\nResult URL: {current_url}")
            
            if "reddit.com/r/SideProject/comments/" in current_url:
                print("\n✅ SUCCESS! Post created!")
                print(f"Post URL: {current_url}")
                
                # Save result
                result = {
                    "platform": "reddit",
                    "status": "success",
                    "url": current_url,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                log_dir = Path("docs/logs")
                log_dir.mkdir(parents=True, exist_ok=True)
                with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
                    f.write(asyncio.run(json.dumps(result)) + "\n")
            else:
                print("\n❌ Failed to post")
                print(f"URL: {current_url}")
                await page.screenshot(path="reddit-failure.png")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path="reddit-error2.png")
        
        await browser.close()
        print("\n" + "=" * 60)
        print("Done!")
        print("=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
