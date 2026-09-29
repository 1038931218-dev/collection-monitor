#!/usr/bin/env python3
"""
使用系统 Chrome 浏览器进行市场验证发帖
"""

import json
import time
from datetime import datetime
from pathlib import Path
from playwright.sync_api import sync_playwright

# 查找 Chrome 路径
def find_chrome():
    """查找系统中已安装的 Chrome"""
    candidates = [
        # Windows
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Users\mac\AppData\Local\Google\Chrome\Application\chrome.exe",
        r"C:\Users\Public\Google\Chrome\Application\chrome.exe",
    ]
    
    for path in candidates:
        if Path(path).exists():
            print(f"✅ Found Chrome at: {path}")
            return path
    
    return None

# 配置
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

def log_event(event_type, data=None):
    log_dir = Path("docs/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"market-validation-{datetime.now().strftime('%Y%m%d')}.jsonl"
    
    entry = {"timestamp": datetime.now().isoformat(), "event": event_type}
    if data:
        entry.update(data)
    
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    
    print(f"[LOG] {event_type}: {json.dumps(entry, ensure_ascii=False)}")

def main():
    print("=" * 60)
    print("Phase 6.5 Market Validation - Using System Chrome")
    print("=" * 60)
    
    log_event("validation_start")
    
    chrome_path = find_chrome()
    if not chrome_path:
        print("❌ Chrome not found!")
        log_event("error", {"message": "Chrome not found"})
        return
    
    with sync_playwright() as p:
        # 连接到用户已有的 Chrome 实例（需先手动启动 chrome --remote-debugging-port=9222）
        # 或者启动新实例
        browser = p.chromium.launch(
            executable_path=chrome_path,
            headless=False,  # 显示浏览器窗口
            args=[
                '--no-sandbox',
                '--disable-dev-shm-usage',
                '--disable-setuid-sandbox',
            ]
        )
        
        page = browser.new_page(viewport={'width': 1280, 'height': 800})
        
        print("\n[1/2] Opening Reddit...")
        log_event("attempt", {"platform": "reddit"})
        
        try:
            page.goto("https://www.reddit.com/r/smallbusiness/create", wait_until="networkidle", timeout=30000)
            time.sleep(3)
            
            # 截图检查登录状态
            page.screenshot(path="reddit-initial.png")
            
            # 检查是否已登录
            if "login" in page.url.lower():
                print("⚠️ 需要登录 Reddit。请在打开的浏览器中登录后，按回车继续...")
                input("按回车继续...")
                page.reload()
                time.sleep(2)
            
            # 填写表单
            print("Filling title...")
            page.wait_for_selector('[name="title"]', timeout=10000)
            page.fill('[name="title"]', REDDIT_POST["title"])
            time.sleep(1)
            
            print("Filling body...")
            # Reddit 文本编辑器
            text_editor = page.locator('[contenteditable="true"][data-editor="true"], [class*="RichTextEditor"]').first
            if text_editor.count() > 0:
                text_editor.click()
                page.keyboard.press("Control+a")
                page.keyboard.press("Delete")
                page.keyboard.type(REDDIT_POST["body"])
            else:
                # 备用：直接填充 textarea
                page.fill('[name="text"]', REDDIT_POST["body"])
            time.sleep(1)
            
            # 提交
            print("Submitting...")
            submit_btn = page.locator('button[type="submit"], button:has-text("Post")').first
            submit_btn.click()
            time.sleep(5)
            
            # 检查结果
            current_url = page.url
            if "created" in current_url or "/r/smallbusiness/comments/" in current_url:
                print(f"✅ SUCCESS! Post URL: {current_url}")
                log_event("post_success", {"platform": "reddit", "url": current_url})
            else:
                print("❌ Failed to post")
                page.screenshot(path="reddit-failure.png")
                log_event("post_failure", {"platform": "reddit", "url": current_url})
        except Exception as e:
            print(f"❌ Reddit error: {e}")
            log_event("error", {"platform": "reddit", "message": str(e)})
            page.screenshot(path="reddit-error.png")
        
        # 关闭浏览器（不要关闭，让用户可以查看）
        # browser.close()
        
        print("\n" + "=" * 60)
        print("📊 检查发帖结果：")
        print(f"   Reddit: {'✅ 成功' if 'created' in page.url else '❌ 失败'}")
        print(f"   URL: {page.url}")
        print("=" * 60)
        print("\n浏览器已打开，请检查是否成功发帖...")
        print("按 Ctrl+C 结束程序（浏览器将保持打开）")
        
        # 保持浏览器打开
        try:
            page.wait_for_event('close', timeout=60000)  # 等60秒
        except:
            pass
        
        browser.close()

if __name__ == "__main__":
    main()
