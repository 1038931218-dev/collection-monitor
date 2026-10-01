#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Connect to existing Chrome and navigate to Reddit
"""
import asyncio
from playwright.async_api import async_playwright

async def main():
    print("Connecting to existing Chrome...")
    
    async with async_playwright() as p:
        try:
            browser = await p.chromium.connect_over_cdp("http://localhost:9222")
            print("✓ Connected!")
            
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            page = await context.new_page()
            
            # Navigate to Reddit submit page
            print("\nNavigating to r/SideProject submit page...")
            await page.goto("https://www.reddit.com/r/SideProject/submit", timeout=30000)
            await page.wait_for_load_state("networkidle")
            
            print(f"URL: {page.url}")
            
            # Wait for user to login
            print("\nWaiting for you to login...")
            print("Please login in the browser window that will open.")
            print("Press Enter when logged in...")
            input()
            
            # Check if logged in
            current_url = page.url
            print(f"\nCurrent URL: {current_url}")
            
            if "login" in current_url.lower():
                print("❌ Still on login page")
            else:
                print("✓ Logged in!")
                
                # Take screenshot
                await page.screenshot(path="reddit-logged-in.png")
                print("Screenshot saved")
                
        except Exception as e:
            print(f"Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
