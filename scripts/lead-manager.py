#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Collection Monitor - Lead Qualification & Outreach System
"""
import json
import asyncio
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import Optional

# Lead Status Constants
STATUS_NEW = "NEW"
STATUS_QUALIFIED = "QUALIFIED"
STATUS_CONTACTED = "CONTACTED"
STATUS_REPLIED = "REPLIED"
STATUS_INTERESTED = "INTERESTED"
STATUS_TRIAL = "TRIAL"
STATUS_PRICING_INTENT = "PRICING_INTENT"
STATUS_PAYMENT_INTENT = "PAYMENT_INTENT"
STATUS_PAID = "PAID"
STATUS_NOT_INTERESTED = "NOT_INTERESTED"
STATUS_NO_RESPONSE = "NO_RESPONSE"
STATUS_INVALID = "INVALID"
STATUS_DO_NOT_CONTACT = "DO_NOT_CONTACT"

@dataclass
class Lead:
    company_name: str
    website: str
    industry: str
    company_size: str
    country: str
    contact_name: str
    contact_role: str
    public_email: str
    linkedin: str
    source: str
    why_fit: str
    pain_signal: str
    lead_score: int
    group: str  # 'A' or 'B'
    
    # Generated fields
    secondary_check: str = ""
    ar_pain_confirmed: bool = False
    personalized_reason: str = ""
    status: str = STATUS_NEW
    contact_date: Optional[str] = None
    channel: str = ""
    message_sent: str = ""
    response: Optional[str] = None
    response_date: Optional[str] = None
    next_action: str = ""
    notes: str = ""

class LeadManager:
    def __init__(self):
        self.leads: list[Lead] = []
        self.data_dir = Path("docs/leads")
        self.data_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.data_dir / "leads.jsonl"
        
    def load_leads(self, data: list[dict]):
        """Load leads from candidate list"""
        self.leads = []
        for i, item in enumerate(data):
            lead = Lead(
                company_name=item.get("company_name", f"Company {i+1}"),
                website=item.get("website", ""),
                industry=item.get("industry", ""),
                company_size=item.get("company_size", ""),
                country=item.get("country", ""),
                contact_name=item.get("contact_name", ""),
                contact_role=item.get("contact_role", ""),
                public_email=item.get("public_email", ""),
                linkedin=item.get("linkedin", ""),
                source=item.get("source", ""),
                why_fit=item.get("why_fit", ""),
                pain_signal=item.get("pain_signal", ""),
                lead_score=item.get("lead_score", 50),
                group=""
            )
            self.leads.append(lead)
        print(f"Loaded {len(self.leads)} leads")
        
    def save_leads(self):
        """Save leads to JSONL file"""
        with open(self.log_file, "w", encoding="utf-8") as f:
            for lead in self.leads:
                f.write(json.dumps(asdict(lead), ensure_ascii=False) + "\n")
        print(f"Saved {len(self.leads)} leads to {self.log_file}")
        
    def select_top_10(self) -> tuple[list[Lead], list[Lead]]:
        """Select top 10 leads: 5 A-group (Wholesale/Industrial) + 5 B-group (IT/Software)"""
        # Group by potential
        wholesale_industrial = []
        it_software = []
        
        for lead in self.leads:
            industry_lower = lead.industry.lower()
            if any(kw in industry_lower for kw in ['wholesale', 'industrial', 'distribution', 'manufacturing', 'logistics', 'supplier']):
                lead.group = "A"
                wholesale_industrial.append(lead)
            elif any(kw in industry_lower for kw in ['it', 'software', 'agency', 'consulting', 'professional services', 'tech']):
                lead.group = "B"
                it_software.append(lead)
        
        # Sort by lead_score
        wholesale_industrial.sort(key=lambda x: x.lead_score, reverse=True)
        it_software.sort(key=lambda x: x.lead_score, reverse=True)
        
        # Select top 5 from each
        selected_a = wholesale_industrial[:5]
        selected_b = it_software[:5]
        
        print(f"\nSelected 10 leads:")
        print(f"  A-group (Wholesale/Industrial): {len(selected_a)} companies")
        for l in selected_a:
            print(f"    - {l.company_name} [{l.industry}]")
        print(f"  B-group (IT/Software): {len(selected_b)} companies")
        for l in selected_b:
            print(f"    - {l.company_name} [{l.industry}]")
            
        return selected_a, selected_b
        
    def secondary_review(self, lead: Lead) -> bool:
        """Perform secondary review on a lead"""
        # Check if company is real
        if not lead.website:
            lead.secondary_check = "No website provided"
            return False
            
        # Check for AR signals
        signals = []
        if "net 30" in lead.pain_signal.lower() or "net 60" in lead.pain_signal.lower() or "net 90" in lead.pain_signal.lower():
            signals.append("Payment terms found")
        if "invoice" in lead.pain_signal.lower():
            signals.append("Invoice mentioned")
        if "accounts receivable" in lead.pain_signal.lower():
            signals.append("AR mentioned")
            
        lead.ar_pain_confirmed = len(signals) > 0
        lead.secondary_check = "; ".join(signals) if signals else "No explicit AR signals"
        
        return True
        
    def generate_personalized_reason(self, lead: Lead) -> str:
        """Generate personalized outreach reason"""
        reason = f"As a {lead.industry} company with {lead.company_size} employees, "
        reason += f"{lead.company_name} likely deals with B2B invoicing and accounts receivable management. "
        
        if lead.contact_role:
            reason += f"As {lead.contact_role}, you're directly responsible for cash flow and collections. "
            
        if lead.pain_signal:
            reason += f"Your {lead.pain_signal} suggests potential challenges with invoice prioritization. "
            
        reason += "We built a free tool that helps identify which invoices need attention first."
        
        lead.personalized_reason = reason
        return reason
        
    def generate_outreach_message(self, lead: Lead) -> str:
        """Generate personalized outreach message"""
        name = lead.contact_name.split()[0] if lead.contact_name else "there"
        
        message = f"""Hi {name},

I noticed {lead.company_name} works in the {lead.industry} space.

We built a free tool that shows which invoice to chase first — just upload your AR Excel/CSV and get an instant priority report with AI insights.

No signup required. Try it here: https://collection-monitor-nine.vercel.app

Worth a 30-second look?

Best,
Hermes"""
        
        lead.message_sent = message
        return message
        
    def track_response(self, lead: Lead, response: str):
        """Track lead response"""
        lead.response = response
        lead.response_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        
        # Auto-detect interest level
        response_lower = response.lower()
        if any(kw in response_lower for kw in ['yes', 'interested', 'tell me more', 'how much', 'pricing', 'demo', 'schedule', 'call']):
            lead.status = STATUS_INTERESTED
            lead.next_action = "Follow up with pricing and demo"
        elif any(kw in response_lower for kw in ['no', 'not interested', 'don\'t need', 'busy', 'not now']):
            lead.status = STATUS_NOT_INTERESTED
            lead.next_action = "Stop outreach"
        elif any(kw in response_lower for kw in ['when', 'cost', 'price', 'pay', 'subscription']):
            lead.status = STATUS_PRICING_INTENT
            lead.next_action = "Provide pricing information"
        else:
            lead.status = STATUS_REPLIED
            lead.next_action = "Continue conversation"
            
    def get_statistics(self) -> dict:
        """Get campaign statistics"""
        stats = {
            "total": len(self.leads),
            "group_a": sum(1 for l in self.leads if l.group == "A"),
            "group_b": sum(1 for l in self.leads if l.group == "B"),
            "contacted": sum(1 for l in self.leads if l.status == STATUS_CONTACTED),
            "replied": sum(1 for l in self.leads if l.status == STATUS_REPLIED),
            "interested": sum(1 for l in self.leads if l.status == STATUS_INTERESTED),
            "pricing_intent": sum(1 for l in self.leads if l.status == STATUS_PRICING_INTENT),
            "paid": sum(1 for l in self.leads if l.status == STATUS_PAID),
            "no_response": sum(1 for l in self.leads if l.status == STATUS_NO_RESPONSE),
        }
        return stats

# Usage example
if __name__ == "__main__":
    manager = LeadManager()
    
    # Load sample leads (replace with actual data)
    sample_leads = [
        {"company_name": "ABC Wholesale", "website": "https://abcwholesale.com", "industry": "Wholesale Distribution", "company_size": "25-50", "country": "US", "contact_name": "John Smith", "contact_role": "CFO", "public_email": "john@abcwholesale.com", "linkedin": "", "source": "LinkedIn", "why_fit": "B2B wholesale with Net-30 terms", "pain_signal": "Net 30 payment terms, manual invoice tracking", "lead_score": 85},
        {"company_name": "Tech Solutions Inc", "website": "https://techsolutions.io", "industry": "IT Services", "company_size": "10-20", "country": "US", "contact_name": "Sarah Johnson", "contact_role": "Founder", "public_email": "sarah@techsolutions.io", "linkedin": "https://linkedin.com/in/sarahjohnson", "source": "Website", "why_fit": "IT services with project-based billing", "pain_signal": "Invoice management, client billing", "lead_score": 78},
    ]
    
    manager.load_leads(sample_leads)
    manager.save_leads()
    
    a_group, b_group = manager.select_top_10()
    
    for lead in a_group + b_group:
        manager.secondary_review(lead)
        manager.generate_personalized_reason(lead)
        manager.generate_outreach_message(lead)
        lead.status = STATUS_CONTACTED
        lead.contact_date = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    
    manager.save_leads()
    
    print("\n=== Campaign Statistics ===")
    stats = manager.get_statistics()
    for key, value in stats.items():
        print(f"  {key}: {value}")
