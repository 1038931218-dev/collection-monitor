#!/usr/bin/env python3
"""
Phase 6.5 - 打开浏览器供用户手动发帖
"""

import subprocess
import time
from pathlib import Path

def main():
    print("=" * 60)
    print("🚀 Phase 6.5 Market Validation - Manual Posting Guide")
    print("=" * 60)
    
    # Chrome 路径
    chrome_path = r"C:\Users\mac\AppData\Local\Google\Chrome\Application\chrome.exe"
    
    if not Path(chrome_path).exists():
        print("❌ Chrome not found!")
        return
    
    print("\n📋 发帖前准备：")
    print("=" * 60)
    
    print("""
【Reddit r/smallbusiness 帖子】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:
I built a tool that tells small business owners which invoice to chase today

Body:
Hey r/smallbusiness,

I built Collection Monitor — a simple tool that helps small business owners decide 
which invoice to chase first.

Upload your AR Excel/CSV and get a priority report with AI-powered insights.

No finance background needed.

I'm looking for feedback from actual small business owners, especially people who 
regularly deal with overdue invoices.

https://collection-monitor-nine.vercel.app

What would make this useful for you?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)
    
    print("""
【Hacker News Show HN】
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Title:
Show HN: Collection Monitor – AR prioritization for small businesses

URL:
https://collection-monitor-nine.vercel.app

Text (optional):
I built a tool that helps small business owners decide which invoice to chase first. 
Upload your AR Excel/CSV and get a priority report with AI-powered insights.

The core value proposition: "Know which invoice to chase today."

Looking for feedback from small business owners who deal with AR.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    """)
    
    print("\n⚠️ 注意事项：")
    print("1. 需要先登录 Reddit / Hacker News 账号")
    print("2. 发帖时间：工作日 9-11 AM（目标用户活跃时段）")
    print("3. 观察 24-48 小时收集数据")
    print("4. 记录：访问人数、上传人数、报告生成数、反馈内容")
    
    print("\n" + "=" * 60)
    print("正在打开浏览器...")
    print("=" * 60)
    
    # 打开 Reddit 发帖页
    try:
        subprocess.Popen([chrome_path, "https://www.reddit.com/r/smallbusiness/submit"])
        print("✅ 已打开 Reddit r/smallbusiness 发帖页面")
    except Exception as e:
        print(f"❌ 无法打开 Reddit: {e}")
    
    time.sleep(2)
    
    # 打开 Hacker News 发帖页
    try:
        subprocess.Popen([chrome_path, "https://news.ycombinator.com/submit"])
        print("✅ 已打开 Hacker News 发帖页面")
    except Exception as e:
        print(f"❌ 无法打开 Hacker News: {e}")
    
    print("\n" + "=" * 60)
    print("📊 Analytics Dashboard:")
    print("   https://collection-monitor-nine.vercel.app/testing-dashboard.html")
    print("=" * 60)
    print("\n请在浏览器中完成发帖，然后告诉我结果！")
    print("按回车键结束此程序...")
    input()

if __name__ == "__main__":
    main()
