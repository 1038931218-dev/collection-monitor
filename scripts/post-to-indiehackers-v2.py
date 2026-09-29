#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Indie Hackers - Fixed Version
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
    print("Phase 6.5 - Post to Indie Hackers (Fixed)")
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
        
        # Navigate to Indie Hackers
        print("\n[1/5] Navigating to Indie Hackers...")
        await page.goto("https://www.indiehackers.com/post", timeout=30000)
        await page.wait_for_load_state("networkidle")
        print(f"   URL: {page.url}")
        
        # Check login
        await page.wait_for_timeout(3000)
        if "sign-in" in page.url.lower() or "login" in page.url.lower():
            print("\n⚠️  Not logged in. Please login manually...")
            print("Press Enter when ready...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Take screenshot to see page structure
        print("\n[2/5] Taking screenshot to analyze page...")
        await page.screenshot(path="ih-page-structure.png")
        print("   Screenshot saved: ih-page-structure.png")
        
        # Try to find all input fields
        print("\n[3/5] Finding input fields...")
        inputs = await page.query_selector_all('input, textarea, [contenteditable]')
        print(f"   Found {len(inputs)} interactive elements")
        
        for i, elem in enumerate(inputs[:10]):
            tag = await elem.evaluate('el => el.tagName')
            type_attr = await elem.evaluate('el => el.type')
            placeholder = await elem.evaluate('el => el.placeholder || el.getAttribute("data-placeholder")')
            classes = await elem.evaluate('el => el.className')
            print(f"   {i+1}. <{tag}> type={type_attr} placeholder='{placeholder}' classes='{classes[:50]}'")
        
        # Fill title
        print("\n[4/5] Filling title...")
        try:
            # Try multiple selectors
            title_selectors = [
                'input[placeholder*="title"]',
                'input[type="text"]',
                '#title',
                '[name="title"]',
            ]
            
            for selector in title_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        await elem.fill(POST_TITLE)
                        print(f"   ✓ Filled using: {selector}")
                        break
                except:
                    continue
        except Exception as e:
            print(f"   ⚠️  Title fill error: {e}")
        
        # Fill body
        print("\n[5/5] Filling body...")
        try:
            # Find content editable or textarea
            body_selectors = [
                '[contenteditable="true"]',
                '.trix-editor',
                '[data-trix-editor]',
                'textarea',
                '#body',
                '#description',
            ]
            
            for selector in body_selectors:
                try:
                    elem = await page.query_selector(selector)
                    if elem:
                        await elem.click()
                        await page.wait_for_timeout(500)
                        await page.keyboard.press('Control+a')
                        await page.keyboard.type(POST_BODY)
                        print(f"   ✓ Filled using: {selector}")
                        break
                except:
                    continue
        except Exception as e:
            print(f"   ⚠️  Body fill error: {e}")
        
        await page.wait_for_timeout(2000)
        
        # Click post button
        print("\nClicking post button...")
        try:
            post_btn = await page.query_selector('button[type="submit"], button:has-text("Post"), button:has-text("Publish")')
            if post_btn:
                await post_btn.click()
                print("   ✓ Clicked post button")
            else:
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
                await page.screenshot(path="ih-failure2.png")
        except Exception as e:
            print(f"\n❌ Error: {e}")
            await page.screenshot(path="ih-error3.png")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
