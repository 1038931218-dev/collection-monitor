#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Phase 6.5 - Post to Reddit using requests with VPN proxy
"""
import json
import time
from pathlib import Path

def log(msg):
    print(f"[LOG] {msg}")

def main():
    log("=" * 60)
    log("Phase 6.5 Market Validation - Reddit Post")
    log("=" * 60)
    
    # Check if we can access Reddit
    import urllib.request
    import urllib.error
    
    try:
        req = urllib.request.Request(
            "https://www.reddit.com/r/SideProject/about/rules.json",
            headers={"User-Agent": "CollectionMonitor/1.0"}
        )
        resp = urllib.request.urlopen(req, timeout=10)
        rules = json.loads(resp.read().decode())
        log("✅ Can access Reddit API")
        log(f"   Subreddit rules loaded")
    except Exception as e:
        log(f"❌ Cannot access Reddit: {e}")
        log("\nPlease check if VPN is properly connected.")
        return
    
    # Post content
    title = "I built a tool that tells small businesses which invoice to chase first"
    body = """Hey r/SideProject,

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
    
    # Show post content
    log("\n" + "=" * 60)
    log("POST CONTENT")
    log("=" * 60)
    log(f"\nTitle: {title}")
    log(f"\nBody:\n{body}")
    
    log("\n" + "=" * 60)
    log("NEXT STEPS")
    log("=" * 60)
    log("""
1. Open Reddit in browser: https://www.reddit.com/r/SideProject/submit
2. Login with your account
3. Copy the title and body above
4. Click "Post"
5. Record the post URL

OR use the script to automate:
  python scripts/post-reddit-api.py
""")
    
    # Save post content
    log_dir = Path("docs/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    
    post_data = {
        "platform": "reddit",
        "subreddit": "SideProject",
        "title": title,
        "body": body,
        "status": "ready_to_post",
        "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    
    with open(log_dir / "pending-posts.json", "w", encoding="utf-8") as f:
        json.dump([post_data], f, indent=2, ensure_ascii=False)
    
    log(f"\n✅ Post content saved to: {log_dir / 'pending-posts.json'}")
    log("\n" + "=" * 60)

if __name__ == "__main__":
    main()
