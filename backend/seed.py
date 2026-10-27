import os
import sys
from datetime import datetime, timedelta
import random

# Add project root to sys.path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.database import SessionLocal, init_db, engine, Base
from app.models.user import User
from app.models.technician import TechnicianProfile
from app.models.sla_policy import SLAPolicy
from app.models.incident import Incident
from app.models.comment import IncidentComment
from app.models.activity import IncidentActivity
from app.models.notification import Notification
from app.models.prediction_record import PredictionRecord
from app.services.auth_service import get_password_hash
from app.services.sla_engine import calculate_deadline, compute_sla_status
from app.services.ml_service import predict_sla_breach
from app.schemas.ml import PredictRequest

def run_seed():
    print("[ResolveAI Seed] Resetting database tables...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:

        print("[ResolveAI Seed] Creating SLA Policies...")
        policies = [
            SLAPolicy(priority="Critical", target_resolution_hours=4.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0, description="Severe operational outage or critical security compromise"),
            SLAPolicy(priority="High", target_resolution_hours=8.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0, description="Major system disruption affecting multiple departments"),
            SLAPolicy(priority="Medium", target_resolution_hours=24.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0, description="Standard technical issue impacting individual workflows"),
            SLAPolicy(priority="Low", target_resolution_hours=72.0, warning_threshold_percent=75.0, critical_threshold_percent=90.0, description="Minor bug, informational request, or routine task")
        ]
        db.add_all(policies)
        db.commit()

        print("[ResolveAI Seed] Creating Demo Users and Technician Profiles...")
        # 1. Admin
        admin_user = User(
            email="admin@resolveai.com",
            full_name="Sarah Connor",
            hashed_password=get_password_hash("Admin@123"),
            role="Admin",
            department="IT Infrastructure & Security",
            phone="+1 (555) 019-2831",
            is_active=True
        )
        db.add(admin_user)

        # 2. Technicians
        tech1 = User(
            email="tech@resolveai.com",
            full_name="Alex Rivera",
            hashed_password=get_password_hash("Tech@123"),
            role="Technician",
            department="Network Operations",
            phone="+1 (555) 014-9921",
            is_active=True
        )
        db.add(tech1)

        tech2 = User(
            email="marcus.vance@resolveai.com",
            full_name="Marcus Vance",
            hashed_password=get_password_hash("Tech@123"),
            role="Technician",
            department="Database Administration",
            phone="+1 (555) 018-7744",
            is_active=True
        )
        db.add(tech2)

        tech3 = User(
            email="priya.patel@resolveai.com",
            full_name="Priya Patel",
            hashed_password=get_password_hash("Tech@123"),
            role="Technician",
            department="Cloud & DevOps",
            phone="+1 (555) 017-3312",
            is_active=True
        )
        db.add(tech3)

        tech4 = User(
            email="david.kim@resolveai.com",
            full_name="David Kim",
            hashed_password=get_password_hash("Tech@123"),
            role="Technician",
            department="Cybersecurity & IAM",
            phone="+1 (555) 016-5589",
            is_active=True
        )
        db.add(tech4)

        # 3. Employees
        emp1 = User(
            email="employee@resolveai.com",
            full_name="Emily Watson",
            hashed_password=get_password_hash("Emp@123"),
            role="Employee",
            department="Finance & Accounting",
            phone="+1 (555) 012-4411",
            is_active=True
        )
        db.add(emp1)

        emp2 = User(
            email="james.miller@resolveai.com",
            full_name="James Miller",
            hashed_password=get_password_hash("Emp@123"),
            role="Employee",
            department="Product Design & Marketing",
            phone="+1 (555) 011-8822",
            is_active=True
        )
        db.add(emp2)

        emp3 = User(
            email="anita.sharma@resolveai.com",
            full_name="Anita Sharma",
            hashed_password=get_password_hash("Emp@123"),
            role="Employee",
            department="Human Resources",
            phone="+1 (555) 015-6677",
            is_active=True
        )
        db.add(emp3)

        db.commit()
        db.refresh(admin_user)
        db.refresh(tech1)
        db.refresh(tech2)
        db.refresh(tech3)
        db.refresh(tech4)
        db.refresh(emp1)
        db.refresh(emp2)
        db.refresh(emp3)

        # Create Technician Profiles
        tp1 = TechnicianProfile(
            user_id=tech1.id,
            skills="Network, Cisco, VPN, Firewalls, Routing, DNS, Wi-Fi",
            categories="Network, Hardware, Security",
            is_available=True,
            max_workload=8,
            current_workload=0,
            total_resolved=28,
            average_rating=4.9
        )
        tp2 = TechnicianProfile(
            user_id=tech2.id,
            skills="PostgreSQL, MySQL, SQL Optimization, Database Migrations, Redis",
            categories="Database, Software",
            is_available=True,
            max_workload=8,
            current_workload=0,
            total_resolved=34,
            average_rating=4.8
        )
        tp3 = TechnicianProfile(
            user_id=tech3.id,
            skills="Cloud, AWS, Kubernetes, Docker, Linux, CI/CD, Terraform",
            categories="Cloud, Software, Network",
            is_available=True,
            max_workload=8,
            current_workload=0,
            total_resolved=41,
            average_rating=4.9
        )
        tp4 = TechnicianProfile(
            user_id=tech4.id,
            skills="Active Directory, IAM, SSO, Okta, Phishing, Security Auditing",
            categories="Security, Access/Email, Software",
            is_available=True,
            max_workload=6,
            current_workload=0,
            total_resolved=19,
            average_rating=4.7
        )
        db.add_all([tp1, tp2, tp3, tp4])
        db.commit()

        print("[ResolveAI Seed] Generating 35 Realistic Historical & Active Incidents...")
        technicians = [tech1, tech2, tech3, tech4]
        employees = [emp1, emp2, emp3]
        now = datetime.utcnow()

        seed_incident_templates = [
            # Critical
            ("Core Edge Router Gateway BGP Peer Down", "Primary WAN edge router experiencing intermittent BGP session flap causing company-wide packet drop.", "Network", "Critical", "High", "High", tech1),
            ("Production PostgreSQL Master Failover Unresponsive", "Primary database replica lag spiked and automated patroni failover is hung.", "Database", "Critical", "High", "High", tech2),
            ("Kubernetes Ingress Controller SSL Expiration", "Wildcard SSL certificates expired on production cluster ingress causing browser 502/SSL errors.", "Cloud", "Critical", "High", "High", tech3),
            ("Ransomware Signature Detected on Backup Volume", "EDR flagged suspicious encryption activity on auxiliary network share volume.", "Security", "Critical", "High", "High", tech4),
            ("Corporate SSO Gateway Authentication Failure", "Users unable to log into Jira, GitHub, or Slack via SAML Okta integration.", "Security", "Critical", "High", "High", tech4),

            # High
            ("VPN Concentrator Overloaded for Remote Workforce", "Remote engineers reporting 400ms latency and dropped SSH tunnels to dev servers.", "Network", "High", "High", "Medium", tech1),
            ("AWS EC2 Build Agent Fleet Out of Disk Space", "Continuous deployment runners filling ephemeral storage causing release build failures.", "Cloud", "High", "High", "Medium", tech3),
            ("Finance Payroll Application DB Deadlock", "Monthly ledger processing transaction is locked awaiting table release.", "Database", "High", "High", "Medium", tech2),
            ("Active Directory Password Sync Desynchronization", "New hires unable to authenticate into local domain workstations.", "Access/Email", "High", "Medium", "High", tech4),
            ("Floor 3 Core Switch Port Channel Error Disabled", "VoIP phones and wired desk ports on 3rd floor marketing department offline.", "Network", "High", "High", "Medium", tech1),
            ("Docker Registry Internal Quota Exceeded", "Container image publishing failing for software engineering staging environment.", "Cloud", "High", "Medium", "High", tech3),

            # Medium
            ("ERP Invoice Export Formatting Corrupted", "Exporting accounts receivable to PDF results in garbled tabular text.", "Software", "Medium", "Medium", "Medium", tech2),
            ("Conference Room A Zoom Rooms Audio Loop", "Digital signal processor in executive conference room producing echo feedback.", "Hardware", "Medium", "Medium", "Low", tech1),
            ("Marketing Hubspot Webhook Delayed Processing", "Lead capture forms are taking 45 minutes to sync with CRM records.", "Software", "Medium", "Medium", "Medium", tech2),
            ("Laptop Thunderbolt Docking Station Display Port Flap", "External 4K monitors flashing black every 10 minutes on Dell Latitude laptops.", "Hardware", "Medium", "Low", "Medium", tech1),
            ("Shared Network Drive Permission Denied for Design Team", "Graphic designers lost read/write access to brand assets asset repository.", "Access/Email", "Medium", "Medium", "Medium", tech4),
            ("Email Security Gateway False Positive on Supplier Invoices", "Valid accounting invoices quarantined by spam heuristics filter.", "Access/Email", "Medium", "Medium", "Medium", tech4),
            ("Redis Cache Eviction Spikes on Product Catalog", "Cache hit ratio dropped below 60% increasing latency on product listings.", "Database", "Medium", "Medium", "Medium", tech2),
            ("Staging Environment DNS Resolution Intermittent", "Internal staging DNS records resolving to outdated internal IP address.", "Network", "Medium", "Medium", "Medium", tech1),
            ("Dev Kubernetes Cluster Pod Eviction Loop", "OOM killer terminating analytics workers due to non-standard memory limit.", "Cloud", "Medium", "Medium", "Medium", tech3),
            ("Corporate Wi-Fi Certificate Renewal Prompting", "Mobile devices displaying untrusted 802.1x certificate warnings.", "Network", "Medium", "Medium", "Medium", tech1),

            # Low
            ("New Mouse and Ergonomic Keyboard Request", "Requesting ergonomic split keyboard and vertical mouse for workstation.", "Hardware", "Low", "Low", "Low", tech1),
            ("Guest Wi-Fi Bandwidth Limit Adjustment", "Requesting guest portal bandwidth throttling increase during quarterly town hall.", "Network", "Low", "Low", "Low", tech1),
            ("Jira Automation Rule Syntax Assistance", "Need assistance setting up automatic component labeling when issue is created.", "Software", "Low", "Low", "Low", tech2),
            ("Secondary Monitor Arm Installation", "Desk mount monitor clamp installation needed in office workstation 4B.", "Hardware", "Low", "Low", "Low", tech1),
            ("Slack Channel Archive and Retention Inquiry", "Clarification needed regarding 90-day retention policy on public channels.", "Access/Email", "Low", "Low", "Low", tech4),
            ("Printer Cartridge Low Notification on Floor 2", "Multi-function network laser printer reporting cyan toner cartridge at 5%.", "Hardware", "Low", "Low", "Low", tech1),
            ("Figma Enterprise Seat Allocation Request", "Additional UI designer license provision required for summer intern.", "Software", "Low", "Low", "Low", tech4),
            ("Cloud Cost Allocation Tagging Recommendation", "Requesting guidelines for tagging EC2 instances with project cost centers.", "Cloud", "Low", "Low", "Low", tech3),
            ("Password Policy Clarification for Service Accounts", "Security question regarding rotation frequency for automated sync bots.", "Security", "Low", "Low", "Low", tech4),
            ("Browser Extension Whitelist Evaluation", "Requesting review and whitelist approval for React DevTools Chrome extension.", "Software", "Low", "Low", "Low", tech4),
            ("Conference Room B HDMI Cable Replacement", "Cable pin bent on podium HDMI passthrough connector.", "Hardware", "Low", "Low", "Low", tech1),
            ("Personal Mobile Mail Profile Removal", "Former employee personal smartphone profile removal from Mobile Device Management.", "Access/Email", "Low", "Low", "Low", tech4),
            ("Data Warehouse Read-Only Replica Access", "BI Analyst requesting credentials to read-only reporting PostgreSQL schema.", "Database", "Low", "Low", "Low", tech2),
            ("GitLab Repository Branch Protection Bypass Request", "Emergency hotfix branch protection bypass request for staging patch.", "Software", "Low", "Low", "Low", tech3),
        ]

        # Target hours map
        prio_hours = {"Critical": 4.0, "High": 8.0, "Medium": 24.0, "Low": 72.0}

        created_incidents = []
        for idx, (title, desc, cat, prio, impact, urgency, assigned_tech) in enumerate(seed_incident_templates):
            inc_num = f"INC-{1001 + idx}"
            rep = random.choice(employees)
            t_hours = prio_hours[prio]

            # Distribute statuses realistically
            if idx in [0, 1]:  # High risk & Breached
                # Created 5 hours ago for Critical (4h target) -> Breached!
                created_at = now - timedelta(hours=5.5)
                status = "In Progress"
                is_breached = True
                resolved_at = None
                res_mins = None
            elif idx in [2, 3]:  # Approaching SLA (> 75% consumed)
                created_at = now - timedelta(hours=3.2)  # 3.2h / 4h = 80% consumed
                status = "In Progress"
                is_breached = False
                resolved_at = None
                res_mins = None
            elif idx < 12:
                # Active tickets (Open, Assigned, In Progress)
                created_at = now - timedelta(hours=random.uniform(0.5, 6.0))
                status = random.choice(["Assigned", "In Progress", "In Progress", "On Hold"])
                is_breached = False
                resolved_at = None
                res_mins = None
            else:
                # Resolved or Closed historical tickets
                created_at = now - timedelta(days=random.uniform(1.0, 14.0))
                status = random.choice(["Resolved", "Closed"])
                # 85% resolved on time, 15% breached
                was_breached = random.random() < 0.15
                if was_breached:
                    res_hours = t_hours * random.uniform(1.1, 1.6)
                    is_breached = True
                else:
                    res_hours = t_hours * random.uniform(0.2, 0.85)
                    is_breached = False
                
                res_mins = int(res_hours * 60)
                resolved_at = created_at + timedelta(minutes=res_mins)

            deadline = created_at + timedelta(hours=t_hours)

            assignment_reason = (
                f"Auto-assigned to {assigned_tech.full_name}: "
                f"Category '{cat}' matched primary specialty, and active workload was lowest in pool."
            )

            inc = Incident(
                incident_number=inc_num,
                title=title,
                description=desc,
                category=cat,
                priority=prio,
                impact=impact,
                urgency=urgency,
                status=status,
                reporter_id=rep.id,
                assigned_technician_id=assigned_tech.id,
                assignment_reason=assignment_reason,
                reassignment_count=1 if idx in [1, 5] else 0,
                sla_deadline=deadline,
                is_sla_breached=is_breached,
                breach_notified=is_breached,
                warning_notified=True if (idx in [0, 1, 2, 3]) else False,
                critical_warning_notified=True if (idx in [0, 1, 2]) else False,
                resolution_notes="Root cause identified, patch applied and verified across staging/prod." if resolved_at else None,
                resolution_time_minutes=res_mins,
                created_at=created_at,
                updated_at=resolved_at or (created_at + timedelta(minutes=30)),
                resolved_at=resolved_at,
                closed_at=resolved_at if status == "Closed" else None
            )
            db.add(inc)
            db.flush()
            created_incidents.append(inc)

            # Audit Trail
            db.add(IncidentActivity(
                incident_id=inc.id,
                user_id=rep.id,
                action="CREATED",
                details=f"Incident {inc_num} submitted by {rep.full_name}.",
                created_at=created_at
            ))
            db.add(IncidentActivity(
                incident_id=inc.id,
                user_id=None,
                action="ASSIGNED",
                details=assignment_reason,
                created_at=created_at + timedelta(seconds=1)
            ))
            if status in ["Resolved", "Closed"]:
                db.add(IncidentActivity(
                    incident_id=inc.id,
                    user_id=assigned_tech.id,
                    action="RESOLVED",
                    details=f"Incident resolved by {assigned_tech.full_name}. Total turnaround: {res_mins} minutes.",
                    old_value="In Progress",
                    new_value=status,
                    created_at=resolved_at
                ))

            # Add comments to first 5 incidents
            if idx < 6:
                db.add(IncidentComment(
                    incident_id=inc.id,
                    user_id=assigned_tech.id,
                    content=f"Investigating root cause on {cat} infrastructure. Reviewing diagnostic logs and system metrics.",
                    is_internal=False,
                    created_at=created_at + timedelta(minutes=15)
                ))
                if idx in [0, 1]:
                    db.add(IncidentComment(
                        incident_id=inc.id,
                        user_id=assigned_tech.id,
                        content="Internal note: Vendor support ticket escalated. Engineering team on standby.",
                        is_internal=True,
                        created_at=created_at + timedelta(minutes=45)
                    ))

            # Compute ML prediction record
            wl = 3
            pred_req = PredictRequest(
                category=cat,
                priority=prio,
                impact=impact,
                urgency=urgency,
                elapsed_minutes=60.0 if not resolved_at else float(res_mins or 60),
                remaining_minutes=max(0.0, (t_hours * 60.0) - 60.0),
                technician_workload=wl,
                reassignment_count=inc.reassignment_count,
                status=status
            )
            prediction = predict_sla_breach(pred_req)
            db.add(PredictionRecord(
                incident_id=inc.id,
                breach_probability=prediction.breach_probability,
                risk_level=prediction.risk_level,
                top_factors=str([f.model_dump() for f in prediction.top_factors]),
                model_version=prediction.model_version,
                is_fallback=prediction.is_fallback,
                created_at=created_at
            ))

        # Update technician active workloads
        for tp in [tp1, tp2, tp3, tp4]:
            active_cnt = db.query(Incident).filter(
                Incident.assigned_technician_id == tp.user_id,
                Incident.status.notin_(["Resolved", "Closed"])
            ).count()
            resolved_cnt = db.query(Incident).filter(
                Incident.assigned_technician_id == tp.user_id,
                Incident.status.in_(["Resolved", "Closed"])
            ).count()
            tp.current_workload = active_cnt
            tp.total_resolved = resolved_cnt

        print("[ResolveAI Seed] Generating persisted notifications...")
        sample_notifs = [
            Notification(
                user_id=tech1.id,
                incident_id=created_incidents[0].id,
                title="🚨 SLA Breached: INC-1001",
                message="Core Edge Router Gateway BGP Peer Down has breached its 4-hour SLA deadline.",
                notification_type="SLA_BREACH",
                is_read=False,
                created_at=now - timedelta(minutes=20)
            ),
            Notification(
                user_id=tech1.id,
                incident_id=created_incidents[2].id,
                title="⚠️ Critical SLA Warning: INC-1003",
                message="Incident 'Kubernetes Ingress Controller SSL Expiration' has reached 80% of SLA time.",
                notification_type="SLA_WARNING",
                is_read=False,
                created_at=now - timedelta(minutes=45)
            ),
            Notification(
                user_id=admin_user.id,
                incident_id=created_incidents[0].id,
                title="🚨 SLA Breach Alert: INC-1001",
                message="Incident INC-1001 (Priority: Critical) has breached SLA. Assigned: Alex Rivera.",
                notification_type="SLA_BREACH",
                is_read=False,
                created_at=now - timedelta(minutes=18)
            ),
            Notification(
                user_id=emp1.id,
                incident_id=created_incidents[12].id,
                title="✅ Incident Resolved: INC-1013",
                message="Your incident 'ERP Invoice Export Formatting Corrupted' has been resolved.",
                notification_type="STATUS_UPDATE",
                is_read=True,
                created_at=now - timedelta(days=1)
            ),
            Notification(
                user_id=tech2.id,
                incident_id=created_incidents[1].id,
                title="📋 New Incident Assigned: INC-1002",
                message="Production PostgreSQL Master Failover Unresponsive assigned to you.",
                notification_type="ASSIGNMENT",
                is_read=True,
                created_at=now - timedelta(hours=4)
            )
        ]
        db.add_all(sample_notifs)

        db.commit()
        print("[ResolveAI Seed] Seeding completed successfully!")
        print(f"Total Users: {db.query(User).count()}")
        print(f"Total Technicians: {db.query(TechnicianProfile).count()}")
        print(f"Total Incidents: {db.query(Incident).count()}")
        print(f"Total Policies: {db.query(SLAPolicy).count()}")
        print(f"Total Notifications: {db.query(Notification).count()}")

    except Exception as e:
        db.rollback()
        print(f"[ResolveAI Seed] Error while seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    run_seed()
