#!/usr/bin/env python3
"""
Phase 6.5 Market Validation - Auto Post to Reddit and Hacker News
Uses browser automation to post without manual intervention
"""

import json
import time
from datetime import datetime
from pathlib import Path

# Configuration
REDDIT_POST = {
    "subreddit": "smallbusiness",
    "title": "I built a tool that tells small business owners which invoice to chase today",
    "body": """Hey r/smallbusiness,

I built Collection Monitor — a simple tool that helps small business owners decide which invoice to chase first.

Upload your AR Excel/CSV and get a priority report with AI-powered insights.

No finance background needed.

I'm looking for feedback from actual small business owners, especially people who regularly deal with overdue invoices.

https://collection-monitor-nine.vercel.app

What would make this useful for you?"""
}

HN_POST = {
    "title": "Show HN: Collection Monitor – AR prioritization for small businesses",
    "url": "https://collection-monitor-nine.vercel.app",
    "text": """I built a tool that helps small business owners decide which invoice to chase first. Upload your AR Excel/CSV and get a priority report with AI-powered insights.

The core value proposition: "Know which invoice to chase today."

Looking for feedback from small business owners who deal with AR."""
}

def log_event(event_type, data=None):
    """Log analytics event"""
    log_file = Path(__file__).parent.parent / "docs" / "logs" / f"market-validation-{datetime.now().strftime('%Y%m%d')}.jsonl"
    log_file.parent.mkdir(parents=True, exist_ok=True)
    
    entry = {
        "timestamp": datetime.now().isoformat(),
        "event": event_type,
        **({} if data is None else data)
    }
    
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    
    print(f"[LOG] {event_type}: {json.dumps(entry, ensure_ascii=False)}")

def check_browser_available():
    """Check if browser automation tools are available"""
    try:
        import playwright
        return "playwright"
    except ImportError:
        pass
    
    try:
        import selenium
        return "selenium"
    except ImportError:
        pass
    
    return None

def post_to_reddit():
    """Post to Reddit using browser automation"""
    browser = check_browser_available()
    
    if not browser:
        log_event("error", {"message": "No browser automation tool available"})
        print("ERROR: No browser automation tool available")
        print("Please install one of the following:")
        print("  - playwright: pip install playwright && playwright install")
        print("  - selenium: pip install selenium")
        return False
    
    log_event("attempt", {"platform": "reddit", "browser": browser})
    
    if browser == "playwright":
        return post_with_playwright_reddit()
    else:
        return post_with_selenium_reddit()

def post_with_playwright_reddit():
    """Post to Reddit using Playwright"""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to Reddit submit page
        print("Opening Reddit...")
        page.goto("https://www.reddit.com/r/smallbusiness/create")
        time.sleep(2)
        
        # Check if logged in (look for user menu)
        user_menu = page.locator('[data-testid="profile-avatar"], [class*="userIcon"]').first
        if not user_menu.count():
            print("Not logged in to Reddit. Please login first.")
            log_event("error", {"message": "Not logged in to Reddit"})
            browser.close()
            return False
        
        # Fill title
        print("Filling title...")
        page.fill('[name="title"]', REDDIT_POST["title"])
        time.sleep(1)
        
        # Fill body
        print("Filling body...")
        page.fill('[name="text"]', REDDIT_POST["body"])
        time.sleep(1)
        
        # Submit
        print("Submitting post...")
        page.click('button[type="submit"]')
        time.sleep(3)
        
        # Check for success
        if "created" in page.url or "reddit.com/r/smallbusiness/comments/" in page.url:
            print(f"SUCCESS! Post created: {page.url}")
            log_event("post_success", {"platform": "reddit", "url": page.url})
            browser.close()
            return True
        else:
            print("Failed to post. Screenshot saved for debugging.")
            page.screenshot(path="reddit-post-failure.png")
            log_event("post_failure", {"platform": "reddit"})
            browser.close()
            return False

def post_with_selenium_reddit():
    """Post to Reddit using Selenium"""
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)
    
    try:
        # Navigate to Reddit submit page
        print("Opening Reddit...")
        driver.get("https://www.reddit.com/r/smallbusiness/create")
        time.sleep(2)
        
        # Check if logged in
        if "login" in driver.current_url:
            print("Not logged in to Reddit. Please login first.")
            log_event("error", {"message": "Not logged in to Reddit"})
            return False
        
        # Fill title
        print("Filling title...")
        title_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.NAME, "title"))
        )
        title_input.send_keys(REDDIT_POST["title"])
        time.sleep(1)
        
        # Fill body
        print("Filling body...")
        # Reddit uses a contenteditable div for text
        text_div = driver.find_element(By.CSS_SELECTOR, '[contenteditable="true"][data-editor="true"]')
        text_div.click()
        text_div.send_keys(REDDIT_POST["body"])
        time.sleep(1)
        
        # Submit
        print("Submitting post...")
        submit_btn = driver.find_element(By.CSS_SELECTOR, 'button[type="submit"]')
        submit_btn.click()
        time.sleep(3)
        
        # Check for success
        if "created" in driver.current_url or "/r/smallbusiness/comments/" in driver.current_url:
            print(f"SUCCESS! Post created: {driver.current_url}")
            log_event("post_success", {"platform": "reddit", "url": driver.current_url})
            return True
        else:
            print("Failed to post. Screenshot saved for debugging.")
            driver.save_screenshot("reddit-post-failure.png")
            log_event("post_failure", {"platform": "reddit"})
            return False
    finally:
        driver.quit()

def post_to_hackernews():
    """Post to Hacker News using browser automation"""
    browser = check_browser_available()
    
    if not browser:
        log_event("error", {"message": "No browser automation tool available"})
        return False
    
    log_event("attempt", {"platform": "hackernews", "browser": browser})
    
    if browser == "playwright":
        return post_with_playwright_hn()
    else:
        return post_with_selenium_hn()

def post_with_playwright_hn():
    """Post to Hacker News using Playwright"""
    from playwright.sync_api import sync_playwright
    
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        
        # Navigate to HN submit page
        print("Opening Hacker News...")
        page.goto("https://news.ycombinator.com/submit")
        time.sleep(2)
        
        # Check if logged in
        if "login" in page.url or "noop" in page.url:
            print("Not logged in to Hacker News. Please login first.")
            log_event("error", {"message": "Not logged in to Hacker News"})
            browser.close()
            return False
        
        # Fill title
        print("Filling title...")
        page.fill('#title', HN_POST["title"])
        time.sleep(1)
        
        # Fill URL
        print("Filling URL...")
        page.fill('#url', HN_POST["url"])
        time.sleep(1)
        
        # Fill text (optional)
        if HN_POST["text"]:
            print("Filling text...")
            page.fill('#goextra', HN_POST["text"])
            time.sleep(1)
        
        # Submit
        print("Submitting post...")
        page.click('input[value="submit"]')
        time.sleep(3)
        
        # Check for success
        if "item?id=" in page.url or "submit" not in page.url:
            print(f"SUCCESS! Post created: {page.url}")
            log_event("post_success", {"platform": "hackernews", "url": page.url})
            browser.close()
            return True
        else:
            print("Failed to post. Screenshot saved for debugging.")
            page.screenshot(path="hn-post-failure.png")
            log_event("post_failure", {"platform": "hackernews"})
            browser.close()
            return False

def post_with_selenium_hn():
    """Post to Hacker News using Selenium"""
    from selenium import webdriver
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    from selenium.webdriver.support import expected_conditions as EC
    
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    driver = webdriver.Chrome(options=options)
    
    try:
        # Navigate to HN submit page
        print("Opening Hacker News...")
        driver.get("https://news.ycombinator.com/submit")
        time.sleep(2)
        
        # Check if logged in
        if "login" in driver.current_url:
            print("Not logged in to Hacker News. Please login first.")
            log_event("error", {"message": "Not logged in to Hacker News"})
            return False
        
        # Fill title
        print("Filling title...")
        title_input = WebDriverWait(driver, 10).until(
            EC.presence_of_element_located((By.ID, "title"))
        )
        title_input.send_keys(HN_POST["title"])
        time.sleep(1)
        
        # Fill URL
        print("Filling URL...")
        url_input = driver.find_element(By.ID, "url")
        url_input.send_keys(HN_POST["url"])
        time.sleep(1)
        
        # Fill text
        if HN_POST["text"]:
            print("Filling text...")
            text_input = driver.find_element(By.ID, "goextra")
            text_input.send_keys(HN_POST["text"])
            time.sleep(1)
        
        # Submit
        print("Submitting post...")
        submit_btn = driver.find_element(By.CSS_SELECTOR, 'input[value="submit"]')
        submit_btn.click()
        time.sleep(3)
        
        # Check for success
        if "item?id=" in driver.current_url or "submit" not in driver.current_url:
            print(f"SUCCESS! Post created: {driver.current_url}")
            log_event("post_success", {"platform": "hackernews", "url": driver.current_url})
            return True
        else:
            print("Failed to post. Screenshot saved for debugging.")
            driver.save_screenshot("hn-post-failure.png")
            log_event("post_failure", {"platform": "hackernews"})
            return False
    finally:
        driver.quit()

def main():
    """Main execution function"""
    print("=" * 60)
    print("Phase 6.5 Market Validation - Auto Post")
    print("=" * 60)
    
    log_event("validation_start")
    
    # Try Reddit first
    print("\n[1/2] Posting to Reddit...")
    reddit_success = post_to_reddit()
    
    # Try Hacker News
    print("\n[2/2] Posting to Hacker News...")
    hn_success = post_to_hackernews()
    
    # Summary
    print("\n" + "=" * 60)
    print("POSTING SUMMARY")
    print("=" * 60)
    print(f"Reddit: {'✅ SUCCESS' if reddit_success else '❌ FAILED'}")
    print(f"Hacker News: {'✅ SUCCESS' if hn_success else '❌ FAILED'}")
    
    if reddit_success or hn_success:
        log_event("validation_complete", {
            "reddit": reddit_success,
            "hackernews": hn_success
        })
        print("\n🚀 Market validation started! Track results at:")
        print("   https://collection-monitor-nine.vercel.app/testing-dashboard.html")
    else:
        log_event("validation_blocked", {
            "reason": "authentication_required"
        })
        print("\n⚠️ Posts failed. Browser automation requires login cookies.")
        print("\nPlease manually post using this content:")
        print("\n--- REDDIT ---")
        print(f"Title: {REDDIT_POST['title']}")
        print(f"\nBody:\n{REDDIT_POST['body']}")
        print("\n--- HACKER NEWS ---")
        print(f"Title: {HN_POST['title']}")
        print(f"URL: {HN_POST['url']}")
        print(f"\nText:\n{HN_POST['text']}")
    
    print("=" * 60)

if __name__ == "__main__":
    main()
