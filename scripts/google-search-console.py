#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Google Search Console - Add and Verify Property
"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    print("=" * 60)
    print("Google Search Console - Property Verification")
    print("=" * 60)
    
    async with async_playwright() as p:
        # Connect to existing Chrome
        print("\n[1/5] Connecting to Chrome...")
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222", timeout=10000)
            print("   ✓ Connected")
        except Exception as e:
            print(f"   ✗ Cannot connect: {e}")
            print("\nPlease ensure Chrome is running with --remote-debugging-port=9222")
            return
        
        context = browser.contexts[0] if browser.contexts else await browser.new_context()
        page = await context.new_page()
        
        # Navigate to Google Search Console
        print("\n[2/5] Navigating to Google Search Console...")
        await page.goto("https://search.google.com/search-console", timeout=30000)
        await page.wait_for_load_state("networkidle")
        print(f"   URL: {page.url}")
        
        # Check if logged in
        await page.wait_for_timeout(3000)
        if "accounts.google.com" in page.url or "login" in page.url:
            print("\n⚠️  Not logged in to Google")
            print("Please login in the browser window.")
            print("Press Enter when logged in...")
            input()
            await page.reload()
            await page.wait_for_timeout(3000)
        
        # Click "Add property"
        print("\n[3/5] Adding property...")
        try:
            # Look for add property button
            add_btn = await page.query_selector('button:has-text("Add property"), .add-property-button, [data-testid="add-property"]')
            if add_btn:
                await add_btn.click()
                print("   ✓ Clicked Add property")
            else:
                print("   ⚠️  Could not find Add property button")
                # Take screenshot to see current state
                await page.screenshot(path="gsc-current.png")
        except Exception as e:
            print(f"   Error: {e}")
            await page.screenshot(path="gsc-error.png")
            return
        
        await page.wait_for_timeout(3000)
        
        # Select HTML tag verification method
        print("\n[4/5] Selecting HTML tag verification...")
        try:
            # Look for HTML tag option
            html_tag_btn = await page.query_selector('text=HTML tag')
            if html_tag_btn:
                await html_tag_btn.click()
                print("   ✓ Selected HTML tag")
            else:
                print("   ⚠️  Could not find HTML tag option")
                # Try other selectors
                options = await page.query_selector_all('div[role="option"], button')
                for opt in options[:10]:
                    text = await opt.evaluate('el => el.textContent')
                    print(f"   Found: {text[:50]}")
        except Exception as e:
            print(f"   Error: {e}")
        
        await page.wait_for_timeout(3000)
        
        # Get meta tag
        print("\n[5/5] Getting verification meta tag...")
        try:
            meta_tag = await page.query_selector('meta[name="google-site-verification"]')
            if meta_tag:
                content = await meta_tag.get_attribute('content')
                print(f"\n✅ Verification code found!")
                print(f"   Content: {content}")
                print("\n   Add this to your site:")
                print(f'   <meta name="google-site-verification" content="{content}" />')
                
                # Save to file
                with open("docs/gsc-verification.txt", "w") as f:
                    f.write(f'google-site-verification={content}\n')
                print("\n   Saved to: docs/gsc-verification.txt")
            else:
                print("   ⚠️  Could not find meta tag")
                await page.screenshot(path="gsc-no-meta.png")
        except Exception as e:
            print(f"   Error: {e}")
        
        await browser.close()
        print("\n" + "=" * 60)

if __name__ == "__main__":
    asyncio.run(main())
