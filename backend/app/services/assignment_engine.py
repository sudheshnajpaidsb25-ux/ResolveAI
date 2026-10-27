from typing import Optional, Tuple, List
from sqlalchemy.orm import Session
from app.models.technician import TechnicianProfile
from app.models.user import User

def score_technician_for_incident(
    tech: TechnicianProfile,
    category: str,
    title: str,
    description: str,
    priority: str
) -> Tuple[float, str]:
    """
    Documented scoring system for technician assignment:
    1. Category Match (0 - 40 pts)
    2. Skill Keyword Match (0 - 30 pts)
    3. Workload Capacity Ratio (0 - 20 pts)
    4. Priority & Experience Alignment (0 - 10 pts)
    Total: 0 to 100 points
    """
    category_lower = category.lower().strip()
    tech_cats = [c.strip().lower() for c in (tech.categories or "").split(",") if c.strip()]
    tech_skills = [s.strip().lower() for s in (tech.skills or "").split(",") if s.strip()]
    
    # 1. Category Score (0 to 40)
    category_score = 0.0
    category_match_desc = "No direct category match"
    if any(category_lower in c or c in category_lower for c in tech_cats):
        category_score = 40.0
        category_match_desc = f"Matched category '{category}'"
    elif "general" in tech_cats or "it support" in tech_cats:
        category_score = 20.0
        category_match_desc = "Matched general support category"

    # 2. Skill Keyword Score (0 to 30)
    skill_score = 0.0
    text_corpus = f"{title} {description} {category}".lower()
    matched_skills = []
    for skill in tech_skills:
        if skill in text_corpus:
            matched_skills.append(skill)
            skill_score += 15.0
    skill_score = min(30.0, skill_score)
    if matched_skills:
        skill_match_desc = f"Matched skills: {', '.join(matched_skills[:2])}"
    else:
        skill_match_desc = "General IT capability"

    # 3. Workload Capacity Ratio (0 to 20)
    # Higher score for lower workload relative to maximum
    workload_ratio = tech.current_workload / max(1, tech.max_workload)
    workload_score = max(0.0, 20.0 * (1.0 - workload_ratio))
    workload_desc = f"Workload capacity: {tech.current_workload}/{tech.max_workload}"

    # 4. Priority Alignment (0 to 10)
    priority_score = 5.0
    if priority.upper() == "CRITICAL":
        # Critical incidents benefit from technicians with lower workload & higher resolution count
        if tech.current_workload <= (tech.max_workload // 2):
            priority_score = 10.0
        else:
            priority_score = 2.0
    elif priority.upper() == "HIGH":
        if tech.current_workload < tech.max_workload:
            priority_score = 8.0

    total_score = round(category_score + skill_score + workload_score + priority_score, 1)
    
    tech_name = tech.user.full_name if tech.user else f"Technician #{tech.id}"
    reason = (
        f"Assigned to {tech_name}: {category_match_desc} (+{int(category_score)}pts), "
        f"{skill_match_desc} (+{int(skill_score)}pts), and optimal workload ({tech.current_workload}/{tech.max_workload}, "
        f"+{int(workload_score)}pts). Total match score: {total_score}/100."
    )
    return total_score, reason

def auto_assign_technician(
    db: Session,
    category: str,
    title: str,
    description: str,
    priority: str
) -> Tuple[Optional[User], Optional[str]]:
    """
    Evaluates all active and available technicians who haven't reached their maximum workload limit.
    Returns the best matching technician User and the documented reason.
    If no technician is eligible, returns (None, reason).
    """
    candidates = (
        db.query(TechnicianProfile)
        .join(User)
        .filter(
            User.is_active == True,
            TechnicianProfile.is_available == True,
            TechnicianProfile.current_workload < TechnicianProfile.max_workload
        )
        .all()
    )

    if not candidates:
        return None, "No eligible technicians available: all technicians are currently unavailable or at maximum workload limit."

    scored_candidates = []
    for tech in candidates:
        score, reason = score_technician_for_incident(tech, category, title, description, priority)
        scored_candidates.append((score, tech, reason))

    # Sort descending by score
    scored_candidates.sort(key=lambda x: x[0], reverse=True)
    best_score, best_tech, best_reason = scored_candidates[0]

    # Increment workload
    best_tech.current_workload += 1
    db.commit()

    return best_tech.user, best_reason
