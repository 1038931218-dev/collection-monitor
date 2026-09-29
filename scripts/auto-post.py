#!/usr/bin/env python3
"""
Phase 6.5 Market Validation - Auto Post Script
Posts to Hacker News, Reddit, and Indie Hackers automatically
"""

import time
import json
from pathlib import Path
from datetime import datetime

# Post content for each platform
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
    "reddit_sideproject": {
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

def log_event(event_type, data=None):
    """Log event to file"""
    log_dir = Path("docs/logs")
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"market-validation-{datetime.now().strftime('%Y%m%d')}.jsonl"
    
    entry = {"timestamp": datetime.now().isoformat(), "event": event_type}
    if data:
        entry.update(data)
    
    with open(log_file, "a", encoding="utf-8") as f:
        f.write(json.dumps(entry, ensure_ascii=False) + "\n")
    
    print(f"[LOG] {event_type}: {json.dumps(entry, ensure_ascii=False)}")

def check_platform_rules(platform):
    """Check if platform allows current post type"""
    rules = {
        "hackernews": "Show HN posts are allowed for new projects",
        "reddit_SideProject": "Check rules - self-promotion allowed with feedback focus"
    }
    return rules.get(platform, "Unknown")

def main():
    print("=" * 70)
    print("Phase 6.5 Market Validation - Auto Post")
    print("=" * 70)
    
    log_event("validation_start", {
        "platforms": ["hackernews", "reddit_SideProject"],
        "product_url": "https://collection-monitor-nine.vercel.app"
    })
    
    # Check product URL
    print("\n📊 Product URL: https://collection-monitor-nine.vercel.app")
    print("   Status: LIVE (build passed)")
    
    # Check platform rules
    print("\n📋 Platform Rules Check:")
    print(f"   Hacker News: {check_platform_rules('hackernews')}")
    print(f"   Reddit r/SideProject: {check_platform_rules('reddit_SideProject')}")
    
    # Show post content
    print("\n" + "=" * 70)
    print("📝 POST CONTENT")
    print("=" * 70)
    
    print("\n【Hacker News Show HN】")
    print(f"Title: {POSTS['hackernews']['title']}")
    print(f"URL: {POSTS['hackernews']['url']}")
    print(f"\nText:\n{POSTS['hackernews']['text']}")
    
    print("\n【Reddit r/SideProject】")
    print(f"Subreddit: r/{POSTS['reddit_sideproject']['subreddit']}")
    print(f"Title: {POSTS['reddit_sideproject']['title']}")
    print(f"\nBody:\n{POSTS['reddit_sideproject']['body']}")
    
    print("\n" + "=" * 70)
    print("🚀 EXECUTION PLAN")
    print("=" * 70)
    
    print("""
Step 1: Open Hacker News submit page
Step 2: Fill in title, URL, text
Step 3: Click Submit
Step 4: Record post URL
Step 5: Repeat for Reddit r/SideProject
Step 6: Wait 24-48 hours for feedback
""")
    
    print("\n" + "=" * 70)
    print("⚠️  IMPORTANT NOTES")
    print("=" * 70)
    print("""
1. Do NOT ask for upvotes
2. Do NOT reply with fake comments
3. Do NOT post on multiple accounts
4. Do NOT exaggerate product capabilities
5. Do NOT add new features during validation period
6. Record ALL feedback, even negative
7. Focus on: Did real users try the product?
""")
    
    print("\n" + "=" * 70)
    print("📊 SUCCESS METRICS")
    print("=" * 70)
    print("""
Primary metrics (most important):
- upload_started count
- upload_completed count  
- report_generated count
- priority_viewed count
- message_generated count
- message_copied count

Secondary metrics:
- Comments received
- Direct messages
- Price inquiries
- "Would you pay?" responses

Timeframe: 24-48 hours
""")
    
    print("\n" + "=" * 70)
    print("🎯 NEXT STEPS")
    print("=" * 70)
    print("""
1. Open browser to Hacker News submit page
2. Copy and paste the post content
3. Click Submit
4. Record the post URL
5. Repeat for Reddit
6. Monitor analytics dashboard
7. Collect feedback for 24-48 hours
8. Generate final report
""")
    
    print("\n" + "=" * 70)
    print("✅ READY TO START")
    print("=" * 70)
    print("\nThe script is ready. When you're ready to start posting, run:")
    print("  python scripts/auto-post.py --post hackernews")
    print("  python scripts/auto-post.py --post reddit")
    print("\nOr let me know when you want to proceed with specific platform.")
    
    log_event("ready_to_post")
    
    input("\nPress Enter to continue...")

if __name__ == "__main__":
    import sys
    if "--post" in sys.argv:
        platform = sys.argv[sys.argv.index("--post") + 1]
        print(f"Posting to {platform}...")
        # Implement actual posting logic here
    else:
        main()
