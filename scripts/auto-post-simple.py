#!/usr/bin/env python3
"""
Phase 6.5 Market Validation - Auto Post Script
使用系统 Chrome 浏览器发帖到 Hacker News 和 Reddit
"""

import time
import subprocess
from pathlib import Path

# 配置
POSTS = {
    "hackernews": {
        "title": "Show HN: Collection Monitor – AR prioritization for small businesses",
        "url": "https://collection-monitor-nine.vercel.app",
        "text": """I built a tool that tells small businesses which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Core value: "Know which invoice to chase today."

Currently in early validation. Would love feedback from small business owners who deal with overdue invoices.

What would make this useful for you?"""
    },
    "reddit": {
        "subreddit": "SideProject",
        "title": "I built a tool that tells small businesses which invoice to chase first",
        "body": """Hey r/SideProject,

I built Collection Monitor — a simple tool that helps small business owners decide which invoice to chase first.

What it does:
- Upload your AR Excel/CSV (supports multiple formats)
- Automatically calculates aging buckets and priority scores
- AI explains why each invoice is prioritized
- Generates follow-up message drafts

Why I built it:
As a logistics worker, I see how hard it is for small businesses to manage cash flow. Overdue invoices pile up and owners don't know where to start.

Current status:
- MVP ready (English UI)
- Running on Vercel + Neon PostgreSQL
- 216 unit tests passing
- Security tested (Phase 6.4 completed)
- Currently validating if small businesses actually need this

Would love honest feedback:
- What's missing?
- Where did you get confused?
- Would you use this?

Demo: https://collection-monitor-nine.vercel.app

Thanks!"""
    }
}

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")

def find_chrome():
    """查找系统中已安装的 Chrome"""
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Users\mac\AppData\Local\Google\Chrome\Application\chrome.exe",
    ]
    
    for path in candidates:
        if Path(path).exists():
            return path
    
    return None

def open_browser(url):
    """打开浏览器到指定 URL"""
    import webbrowser
    webbrowser.open(url)
    time.sleep(2)

def main():
    log("=" * 70)
    log("Phase 6.5 Market Validation - Auto Post")
    log("=" * 70)
    
    chrome = find_chrome()
    if not chrome:
        log("❌ Chrome not found!", "ERROR")
        return
    
    log(f"✅ Using Chrome: {chrome}")
    
    # 打开 Hacker News 发帖页
    log("\n[1/2] Opening Hacker News...")
    open_browser("https://news.ycombinator.com/submit")
    
    # 等待用户登录并填写
    log("   请在 Hacker News 页面中完成发帖:")
    log(f"   Title: {POSTS['hackernews']['title']}")
    log(f"   URL: {POSTS['hackernews']['url']}")
    log(f"   Text:\n{POSTS['hackernews']['text']}")
    
    input("\n   发帖完成后按 Enter 继续...")
    
    # 打开 Reddit 发帖页
    log("\n[2/2] Opening Reddit...")
    open_browser(f"https://www.reddit.com/r/{POSTS['reddit']['subreddit']}/submit")
    
    # 等待用户登录并填写
    log("   请在 Reddit 页面中完成发帖:")
    log(f"   Title: {POSTS['reddit']['title']}")
    log(f"   Body:\n{POSTS['reddit']['body']}")
    
    input("\n   发帖完成后按 Enter...")
    
    log("\n" + "=" * 70)
    log("✅ 发帖完成！")
    log("=" * 70)
    log("\n现在请访问以下 Dashboard 监控数据:")
    log("https://collection-monitor-nine.vercel.app/testing-dashboard.html")
    log("\n观察 24-48 小时，记录:")
    log("- 访问人数")
    log("- 上传人数")
    log("- 报告生成数")
    log("- Priority 查看数")
    log("- Message 生成数")
    log("- 用户反馈")
    log("=" * 70)

if __name__ == "__main__":
    main()
