#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Batch 1 Outreach Tracker - Track manual email sends
"""
import json
from pathlib import Path
from datetime import datetime

# Lead data
LEADS = [
    {"id": 1, "company": "Wholesale Hoses", "group": "A", "contact": "Dan (Support)", "email": "support@wholesalehoses.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 2, "company": "Supply Tie", "group": "A", "contact": "Tyler Schmitt", "email": "tschmitt@supplytie.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 3, "company": "Cutting Tools Outlet", "group": "A", "contact": "Info Team", "email": "info@cuttingtoolsoutlet.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 4, "company": "EpicRise Electronics", "group": "A", "contact": "Info Team", "email": "info@epicriseelectronics.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 5, "company": "Masterman's LLP", "group": "A", "contact": "Linda Masterman", "email": "cs@mastermans.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 6, "company": "DemandPDX", "group": "B", "contact": "Info Team", "email": "info@demandpdx.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 7, "company": "Britannia IT", "group": "B", "contact": "Info Team", "email": "hello@britanniait.co.uk", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 8, "company": "Hanvayra", "group": "B", "contact": "Info Team", "email": "info@hanvayra.com", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
    {"id": 9, "company": "NAMYNOT", "group": "B", "contact": "Sales Team", "email": "PHONE_ONLY", "subject": "Quick question about your AR process", "status": "CONTACT_PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": "Use LinkedIn or website contact form"},
    {"id": 10, "company": "CANK", "group": "B", "contact": "Company Contact", "email": "info@cank.co.uk", "subject": "Quick question about your AR process", "status": "PENDING", "sent_at": None, "replied_at": None, "reply_type": "", "interest_level": "", "next_action": ""},
]

def mark_sent(lead_id: int):
    """Mark a lead as SENT"""
    for lead in LEADS:
        if lead["id"] == lead_id:
            lead["status"] = "SENT"
            lead["sent_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            break
    save_leads()

def mark_replied(lead_id: int, reply_content: str, reply_type: str = ""):
    """Mark a lead as REPLIED"""
    for lead in LEADS:
        if lead["id"] == lead_id:
            lead["status"] = "REPLIED"
            lead["replied_at"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            lead["reply_content"] = reply_content
            lead["reply_type"] = reply_type
            
            # Auto-detect interest
            if "demo" in reply_content.lower() or "price" in reply_content.lower() or "how much" in reply_content.lower():
                lead["interest_level"] = "HIGH"
                lead["next_action"] = "Follow up with demo/pricing"
            elif "yes" in reply_content.lower() or "interested" in reply_content.lower():
                lead["interest_level"] = "MEDIUM"
                lead["next_action"] = "Encourage to try the tool"
            else:
                lead["interest_level"] = "LOW"
                lead["next_action"] = "Continue conversation"
            break
    save_leads()

def save_leads():
    """Save leads to JSON file"""
    output_path = Path("docs/leads/outreach/tracking.json")
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(LEADS, f, indent=2, ensure_ascii=False)

def print_summary():
    """Print campaign summary"""
    print("\n" + "="*60)
    print("Collection Monitor - Batch 1 Outreach Summary")
    print("="*60)
    
    total = len(LEADS)
    sent = sum(1 for l in LEADS if l["status"] == "SENT")
    replied = sum(1 for l in LEADS if l["status"] == "REPLIED")
    pending = sum(1 for l in LEADS if l["status"] == "PENDING")
    contact_pending = sum(1 for l in LEADS if l["status"] == "CONTACT_PENDING")
    
    group_a = [l for l in LEADS if l["group"] == "A"]
    group_b = [l for l in LEADS if l["group"] == "B"]
    
    a_sent = sum(1 for l in group_a if l["status"] == "SENT")
    b_sent = sum(1 for l in group_b if l["status"] == "SENT")
    
    a_replied = sum(1 for l in group_a if l["status"] == "REPLIED")
    b_replied = sum(1 for l in group_b if l["status"] == "REPLIED")
    
    print(f"\nTotal Leads: {total}")
    print(f"  Sent: {sent} ({sent/total*100:.1f}%)")
    print(f"  Replied: {replied} ({replied/sent*100:.1f}% reply rate)")
    print(f"  Pending: {pending}")
    print(f"  Contact Pending: {contact_pending}")
    
    print(f"\nGroup A (Wholesale/Industrial): {len(group_a)}")
    print(f"  Sent: {a_sent}, Replied: {a_replied}")
    
    print(f"\nGroup B (IT/Software): {len(group_b)}")
    print(f"  Sent: {b_sent}, Replied: {b_replied}")
    
    print("\n" + "="*60)
    
    # Show detailed status
    print("\nDetailed Status:")
    for lead in LEADS:
        status_icon = {"PENDING": "⏳", "SENT": "✅", "REPLIED": "💬", "CONTACT_PENDING": "📞"}.get(lead["status"], "❓")
        print(f"  {status_icon} #{lead['id']} [{lead['group']}] {lead['company']} -> {lead['email'][:30]}...")

def print_email_template(lead_id: int):
    """Print email template for a specific lead"""
    for lead in LEADS:
        if lead["id"] == lead_id:
            print(f"\n{'='*60}")
            print(f"Lead #{lead_id}: {lead['company']}")
            print(f"{'='*60}")
            print(f"To: {lead['email']}")
            print(f"Subject: {lead['subject']}")
            print(f"\n{lead.get('message', '')}")
            print(f"{'='*60}")
            break

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        cmd = sys.argv[1]
        
        if cmd == "summary":
            print_summary()
        elif cmd == "email":
            if len(sys.argv) > 2:
                print_email_template(int(sys.argv[2]))
            else:
                print("Usage: python track.py email <id>")
        elif cmd == "sent":
            if len(sys.argv) > 2:
                mark_sent(int(sys.argv[2]))
                print(f"Lead #{sys.argv[2]} marked as SENT")
            else:
                print("Usage: python track.py sent <id>")
        elif cmd == "replied":
            if len(sys.argv) > 2:
                content = input("Reply content: ")
                rtype = input("Reply type (optional): ")
                mark_replied(int(sys.argv[2]), content, rtype)
                print(f"Lead #{sys.argv[2]} marked as REPLIED")
            else:
                print("Usage: python track.py replied <id>")
        else:
            print("Usage: python track.py [summary|email|sent|replied]")
    else:
        print_summary()
