#!/usr/bin/env python3
"""
Phase 6.5 - 使用 Chrome DevTools Protocol 发帖
先启动 Chrome 调试模式，然后连接控制
"""

import subprocess
import time
import json
import sys
from pathlib import Path

# 配置
REDDIT_POST = {
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

def log(msg, level="INFO"):
    print(f"[{level}] {msg}")
    # 同时写入日志文件
    log_dir = Path("docs/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"market-validation-{time.strftime('%Y%m%d')}.log"
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [{level}] {msg}\n")

def main():
    log("=" * 60)
    log("Phase 6.5 Market Validation - Chrome Control")
    log("=" * 60)
    
    chrome_path = r"C:\Users\mac\AppData\Local\Google\Chrome\Application\chrome.exe"
    
    if not Path(chrome_path).exists():
        log("❌ Chrome not found!", "ERROR")
        return
    
    # 启动 Chrome 调试模式
    log("📱 正在启动 Chrome (调试模式)...")
    
    # 清理可能残留的调试端口
    try:
        subprocess.run(["taskkill", "/F", "/IM", "chrome.exe"], capture_output=True)
        time.sleep(1)
    except:
        pass
    
    # 启动 Chrome 调试模式
    chrome_proc = subprocess.Popen([
        chrome_path,
        "--remote-debugging-port=9222",
        "--user-data-dir=C:/tmp/chrome-debug",
        "--no-first-run",
        "--no-default-browser-check",
    ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    
    log("⏳ 等待 Chrome 启动...")
    time.sleep(5)
    
    # 检查是否启动成功
    if chrome_proc.poll() is not None:
        log("❌ Chrome 启动失败！", "ERROR")
        return
    
    log("✅ Chrome 已启动，调试端口: 9222")
    
    # 打开 Reddit 发帖页
    log("📝 正在打开 Reddit 发帖页面...")
    try:
        import urllib.request
        urllib.request.urlopen("http://localhost:9222/json/new", timeout=5)
    except:
        pass
    
    # 使用 Open URL API
    try:
        req = urllib.request.Request(
            "http://localhost:9222/json/new",
            data=json.dumps({"url": "https://www.reddit.com/r/smallbusiness/create"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=5)
        log("✅ Reddit 页面已打开")
    except Exception as e:
        log(f"⚠️ Reddit 打开失败: {e}", "WARN")
    
    time.sleep(2)
    
    # 打开 Hacker News 发帖页
    log("📝 正在打开 Hacker News 发帖页面...")
    try:
        req = urllib.request.Request(
            "http://localhost:9222/json/new",
            data=json.dumps({"url": "https://news.ycombinator.com/submit"}).encode(),
            headers={"Content-Type": "application/json"}
        )
        urllib.request.urlopen(req, timeout=5)
        log("✅ Hacker News 页面已打开")
    except Exception as e:
        log(f"⚠️ Hacker News 打开失败: {e}", "WARN")
    
    # 获取可用的页面
    log("\n📋 可用页面:")
    try:
        pages = json.loads(urllib.request.urlopen("http://localhost:9222/json/list", timeout=5).read())
        for i, page in enumerate(pages):
            log(f"  {i+1}. {page.get('title', 'Untitled')} - {page.get('url', '')}")
    except:
        pass
    
    log("\n" + "=" * 60)
    log("现在请在 Chrome 中完成发帖：")
    log("=" * 60)
    log("""
【Reddit 发帖步骤】
1. 在 Reddit 标签页中登录（如未登录）
2. 点击 "Post" 按钮
3. 填写标题：I built a tool that tells small business owners which invoice to chase today
4. 填写正文（见下方）
5. 点击 "Post" 提交

【Hacker News 发帖步骤】
1. 在 HN 标签页中登录（如未登录）
2. 填写 Title: Show HN: Collection Monitor – AR prioritization for small businesses
3. 填写 URL: https://collection-monitor-nine.vercel.app
4. 点击 "Submit" 提交
""")
    
    log("\n【Reddit 正文内容】")
    log(REDDIT_POST["body"])
    
    log("\n【HN 正文内容（可选）】")
    log(HN_POST["text"])
    
    log("\n" + "=" * 60)
    log("💡 提示：如果 Chrome 已经打开，请先关闭所有 Chrome 窗口")
    log("   然后重新运行此脚本")
    log("=" * 60)
    
    input("\n按回车键关闭 Chrome...")
    
    # 关闭 Chrome
    log("🔒 正在关闭 Chrome...")
    chrome_proc.terminate()
    chrome_proc.wait()
    log("✅ 完成！")

if __name__ == "__main__":
    main()
