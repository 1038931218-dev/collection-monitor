#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Generate personalized outreach messages for top 10 leads
"""
import json
import csv
from pathlib import Path
from datetime import datetime

# Product URL
PRODUCT_URL = "https://collection-monitor-nine.vercel.app"

def generate_message(lead: dict) -> str:
    """Generate personalized outreach message"""
    name = lead.get("contact_name", "")
    company = lead["company_name"]
    industry = lead["industry"]
    pain = lead.get("pain_signal", "")
    email = lead.get("public_email", "")
    
    # Extract first name
    first_name = name.split()[0] if name else "there"
    
    # Create personalized opening based on industry and pain signals
    if "Net-30" in pain or "Net 30" in pain:
        opening = f"I noticed {company} works with Net-30 payment terms."
    elif "B2B" in pain:
        opening = f"As a {industry} company, {company} likely deals with B2B invoicing."
    elif "invoice" in pain.lower():
        opening = f"I saw {company} handles invoices regularly."
    else:
        opening = f"I noticed {company} operates in the {industry} space."
    
    # Build message
    message = f"""Hi {first_name},

{opening}

We built a free tool that shows which invoice to chase first — just upload your AR Excel/CSV and get an instant priority report with AI insights.

No signup required. Try it here: {PRODUCT_URL}

Worth a 30-second look?

Best,
Hermes
Collection Monitor Team"""
    
    return message, email

def main():
    # Load leads
    csv_path = Path("docs/leads/candidates_batch1.csv")
    leads = []
    
    with open(csv_path, "r", encoding="utf-8") as f:
        reader = csv.DictReader(f)
        for row in reader:
            leads.append(row)
    
    print(f"Loaded {len(leads)} leads\n")
    
    # Separate groups
    group_a = [l for l in leads if l["group"] == "A"]
    group_b = [l for l in leads if l["group"] == "B"]
    
    print(f"Group A (Wholesale/Industrial): {len(group_a)} leads")
    print(f"Group B (IT/Software): {len(group_b)} leads\n")
    
    # Generate messages
    results = []
    for lead in leads:
        message, email = generate_message(lead)
        
        result = {
            "company": lead["company_name"],
            "group": lead["group"],
            "contact": lead.get("contact_name", ""),
            "email": email,
            "industry": lead["industry"],
            "message": message,
            "status": "PENDING"
        }
        results.append(result)
        
        print(f"\n{'='*60}")
        print(f"Company: {lead['company_name']}")
        print(f"Group: {lead['group']}")
        print(f"Contact: {lead.get('contact_name', 'N/A')}")
        print(f"Email: {email}")
        print(f"\nMessage:\n{message}")
    
    # Save results
    output_dir = Path("docs/leads/outreach")
    output_dir.mkdir(parents=True, exist_ok=True)
    
    with open(output_dir / "outreach_messages.json", "w", encoding="utf-8") as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n{'='*60}")
    print(f"Saved {len(results)} outreach messages to {output_dir / 'outreach_messages.json'}")

if __name__ == "__main__":
    main()
