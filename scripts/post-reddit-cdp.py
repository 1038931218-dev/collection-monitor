#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Post to Reddit r/SideProject - WebSocket Version
"""
import asyncio
import json
import time
import uuid
from pathlib import Path
import aiohttp

POST_TITLE = "I built a tool that tells small businesses which invoice to chase first"
POST_BODY = """Hey r/SideProject,

I built Collection Monitor — a simple tool that helps small business owners decide which invoice to chase first.

Upload your AR Excel/CSV, get a priority report with AI-powered insights.

Core value: "Know which invoice to chase today."

Why I built it: As a logistics worker, I see how hard it is for small businesses to manage cash flow. Overdue invoices pile up and owners don't know where to start.

Currently in early validation. Would love honest feedback from actual small business owners:
- What would make this useful for you?
- Where did you get confused?
- Would you use this again?

Demo: https://collection-monitor-nine.vercel.app

Thanks!"""

async def cdp_call(ws, method, params=None):
    """Call a Chrome DevTools Protocol method"""
    msg_id = str(uuid.uuid4())
    await ws.send(json.dumps({
        "id": msg_id,
        "method": method,
        "params": params or {}
    }))
    
    # Wait for response
    while True:
        msg = await asyncio.wait_for(ws.recv(), timeout=10)
        data = json.loads(msg)
        if data.get("id") == msg_id:
            return data.get("result", {})
        elif data.get("method"):
            # Handle events
            pass

async def main():
    print("=" * 60)
    print("Phase 6.5 - Post to Reddit r/SideProject (CDP)")
    print("=" * 60)
    
    import websockets
    
    try:
        # Connect to Chrome DevTools
        print("\n[1/6] Connecting to Chrome...")
        async with websockets.connect("ws://localhost:9222/devtools/page/25ef85a2-30fb-41e4-9fe7-18b5ea4ce210") as ws:
            print("   ✓ Connected")
            
            # Navigate to Reddit
            print("\n[2/6] Navigating to r/SideProject...")
            result = await cdp_call(ws, "Page.navigate", {"url": "https://www.reddit.com/r/SideProject/submit"})
            print(f"   URL: {result.get('frameId', 'unknown')}")
            
            # Wait for page load
            print("\n[3/6] Waiting for page to load...")
            await asyncio.sleep(5)
            
            # Get page title
            title = await cdp_call(ws, "Runtime.evaluate", {"expression": "document.title"})
            print(f"   Page title: {title.get('result', {}).get('value', 'unknown')}")
            
            # Fill title input
            print("\n[4/6] Filling title...")
            await cdp_call(ws, "Runtime.evaluate", {
                "expression": f'document.querySelector(\'input[name="title"], #title\')?.value = "{POST_TITLE}"'
            })
            print("   ✓ Title filled")
            
            # Fill body
            print("\n[5/6] Filling body...")
            escaped_body = POST_BODY.replace('"', '\\"').replace('\n', '\\n')
            await cdp_call(ws, "Runtime.evaluate", {
                "expression": f'''
                    const editor = document.querySelector('div[role="textbox"], textarea[name="text"]');
                    if (editor) {{
                        editor.value = `{escaped_body}`;
                        editor.dispatchEvent(new Event('input', {{ bubbles: true }}));
                    }}
                '''
            })
            print("   ✓ Body filled")
            
            # Click post button
            print("\n[6/6] Clicking post button...")
            await cdp_call(ws, "Runtime.evaluate", {
                "expression": 'document.querySelector(\'button[type="submit"]\')?.click()'
            })
            
            # Wait for result
            await asyncio.sleep(5)
            
            # Get current URL
            result_url = await cdp_call(ws, "Runtime.evaluate", {"expression": "window.location.href"})
            url = result_url.get('result', {}).get('value', '')
            print(f"\nResult URL: {url}")
            
            if "reddit.com/r/SideProject/comments/" in url:
                print("\n✅ SUCCESS! Post created!")
                
                result = {
                    "platform": "reddit-sideproject",
                    "status": "success",
                    "url": url,
                    "timestamp": time.strftime("%Y-%m-%d %H:%M:%S")
                }
                
                log_dir = Path("docs/logs")
                log_dir.mkdir(parents=True, exist_ok=True)
                with open(log_dir / "market-validation.jsonl", "a", encoding="utf-8") as f:
                    f.write(json.dumps(result) + "\n")
            else:
                print("\n❌ Failed to post")
                
    except Exception as e:
        print(f"\n❌ Error: {e}")

if __name__ == "__main__":
    asyncio.run(main())
