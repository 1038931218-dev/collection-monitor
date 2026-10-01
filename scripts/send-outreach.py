#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Execute outreach campaign - Send emails to leads
"""
import json
import smtplib
from email.mime.text import MIMEText
from pathlib import Path
from datetime import datetime
from dotenv import load_dotenv
import os

load_dotenv()

def send_email(to_email: str, subject: str, body: str) -> bool:
    """Send email using SMTP"""
    # Get SMTP config from environment
    smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    sender_email = os.getenv("SENDER_EMAIL", "")
    sender_password = os.getenv("SENDER_PASSWORD", "")
    
    if not sender_email or not sender_password:
        print(f"⚠️  SMTP credentials not configured. Cannot send email to {to_email}")
        return False
    
    try:
        msg = MIMEText(body, 'plain', 'utf-8')
        msg['Subject'] = subject
        msg['From'] = sender_email
        msg['To'] = to_email
        
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls()
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, [to_email], msg.as_string())
        
        print(f"✅ Email sent to {to_email}")
        return True
    except Exception as e:
        print(f"❌ Failed to send email to {to_email}: {e}")
        return False

def main():
    print("=" * 60)
    print("Collection Monitor - Outreach Campaign Execution")
    print("=" * 60)
    
    # Load campaign
    campaign_path = Path("docs/leads/campaign.json")
    with open(campaign_path, "r", encoding="utf-8") as f:
        campaign = json.load(f)
    
    # Get leads
    leads = campaign["leads"]
    print(f"\nTotal leads: {len(leads)}")
    
    # Send emails
    sent_count = 0
    failed_count = 0
    
    for lead in leads:
        # Skip if no valid email
        email = lead.get("email", "")
        if not email or email.startswith("("):
            print(f"\n⏭️  Skipped {lead['company']} - No valid email (has phone only)")
            lead["status"] = "NO_EMAIL"
            failed_count += 1
            continue
        
        # Generate subject
        subject = f"Quick question about your AR process"
        
        # Load message template
        messages_path = Path("docs/leads/outreach/outreach_messages.json")
        with open(messages_path, "r", encoding="utf-8") as f:
            messages = json.load(f)
        
        message_body = None
        for msg in messages:
            if msg["company"] == lead["company"]:
                message_body = msg["message"]
                break
        
        if not message_body:
            print(f"\n⚠️  No message found for {lead['company']}")
            continue
        
        # Send email
        print(f"\n📧 Sending to {lead['company']} ({lead['group']})")
        print(f"   To: {email}")
        
        success = send_email(email, subject, message_body)
        
        if success:
            lead["status"] = "SENT"
            lead["sent_date"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            sent_count += 1
            
            # Update campaign stats
            campaign["statistics"]["total_sent"] = sent_count
        else:
            lead["status"] = "FAILED"
            failed_count += 1
    
    # Save updated campaign
    with open(campaign_path, "w", encoding="utf-8") as f:
        json.dump(campaign, f, indent=2, ensure_ascii=False)
    
    print("\n" + "=" * 60)
    print(f"Campaign Summary:")
    print(f"  Sent: {sent_count}")
    print(f"  Failed: {failed_count}")
    print(f"  Success Rate: {(sent_count/len(leads))*100:.1f}%")
    print("=" * 60)

if __name__ == "__main__":
    main()
