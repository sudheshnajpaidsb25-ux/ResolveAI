import numpy as np
import pandas as pd
from typing import Tuple

CATEGORIES = ["Network", "Software", "Hardware", "Database", "Security", "Cloud", "Access/Email"]
PRIORITIES = ["Critical", "High", "Medium", "Low"]
IMPACTS = ["High", "Medium", "Low"]
URGENCIES = ["High", "Medium", "Low"]
STATUSES = ["Open", "Assigned", "In Progress", "On Hold"]

def generate_synthetic_incident_data(n_samples: int = 2500, random_state: int = 42) -> pd.DataFrame:
    """
    Generates a realistic, reproducible historical IT incident dataset.
    The ground-truth SLA breach label (sla_breached: 0 or 1) is derived from
    mathematically grounded operational relationships with realistic stochastic noise:
    - High elapsed time relative to SLA window heavily increases breach odds.
    - Low remaining time (< 60 mins) heavily increases breach odds.
    - High technician workload (> 5) slows down resolution.
    - Multiple reassignments (> 1) introduce administrative latency.
    - Database/Security incidents with Critical priority take longer to isolate.
    """
    rng = np.random.default_rng(random_state)

    categories = rng.choice(CATEGORIES, size=n_samples, p=[0.20, 0.25, 0.15, 0.12, 0.10, 0.10, 0.08])
    priorities = rng.choice(PRIORITIES, size=n_samples, p=[0.15, 0.25, 0.40, 0.20])
    impacts = rng.choice(IMPACTS, size=n_samples, p=[0.25, 0.50, 0.25])
    urgencies = rng.choice(URGENCIES, size=n_samples, p=[0.25, 0.50, 0.25])
    statuses = rng.choice(STATUSES, size=n_samples, p=[0.25, 0.30, 0.35, 0.10])
    
    hours_of_day = rng.integers(0, 24, size=n_samples)
    days_of_week = rng.integers(0, 7, size=n_samples)
    
    # Technician workload (active tickets: 0 to 10)
    tech_workloads = rng.integers(0, 10, size=n_samples)
    
    # Reassignment count (0 to 4, mostly 0 or 1)
    reassignments = rng.choice([0, 1, 2, 3, 4], size=n_samples, p=[0.60, 0.25, 0.10, 0.04, 0.01])
    
    # Target SLA hours by priority
    target_hours_map = {"Critical": 4.0, "High": 8.0, "Medium": 24.0, "Low": 72.0}
    target_minutes = np.array([target_hours_map[p] * 60.0 for p in priorities])
    
    # Elapsed minutes: realistic gamma distribution scaled by target minutes
    elapsed_ratio = rng.beta(2.0, 3.0, size=n_samples)  # most incidents sampled partway through SLA
    elapsed_minutes = np.round(elapsed_ratio * target_minutes * 1.3, 1)  # some already past 100%
    remaining_minutes = np.round(target_minutes - elapsed_minutes, 1)

    # Calculate log-odds of SLA breach
    # Base intercept
    log_odds = -1.8
    
    # 1. Elapsed ratio effect
    consumed_ratio = elapsed_minutes / target_minutes
    log_odds += 3.2 * (consumed_ratio - 0.6)
    
    # 2. Time remaining effect (cliff effect when < 45 mins)
    low_time_penalty = np.where(remaining_minutes < 45.0, 1.8, np.where(remaining_minutes < 90.0, 0.9, -0.4))
    log_odds += low_time_penalty
    
    # 3. Workload effect
    log_odds += 0.22 * (tech_workloads - 3.5)
    
    # 4. Reassignment effect
    log_odds += 0.45 * reassignments
    
    # 5. Complexity by category
    cat_risk = {"Database": 0.5, "Security": 0.6, "Network": 0.3, "Cloud": 0.2, "Software": 0.1, "Hardware": -0.2, "Access/Email": -0.4}
    log_odds += np.array([cat_risk.get(c, 0.0) for c in categories])
    
    # 6. Priority effect (Critical has strict SLA window, higher risk of breach)
    prio_risk = {"Critical": 0.6, "High": 0.3, "Medium": 0.0, "Low": -0.5}
    log_odds += np.array([prio_risk.get(p, 0.0) for p in priorities])
    
    # 7. Off-hours effect (weekend or late night)
    is_off_hours = ((hours_of_day < 7) | (hours_of_day > 19) | (days_of_week >= 5)).astype(float)
    log_odds += 0.4 * is_off_hours

    # Convert to probability via sigmoid
    probabilities = 1.0 / (1.0 + np.exp(-log_odds))
    
    # Add small stochastic noise and threshold to binary label
    noise = rng.normal(0, 0.06, size=n_samples)
    final_prob = np.clip(probabilities + noise, 0.01, 0.99)
    sla_breached = (final_prob >= 0.50).astype(int)

    df = pd.DataFrame({
        "category": categories,
        "priority": priorities,
        "impact": impacts,
        "urgency": urgencies,
        "status": statuses,
        "hour_of_day": hours_of_day,
        "day_of_week": days_of_week,
        "technician_workload": tech_workloads,
        "reassignment_count": reassignments,
        "target_minutes": target_minutes,
        "elapsed_minutes": elapsed_minutes,
        "remaining_minutes": remaining_minutes,
        "consumed_ratio": np.round(consumed_ratio, 3),
        "sla_breached": sla_breached
    })

    return df

if __name__ == "__main__":
    df = generate_synthetic_incident_data()
    print(f"Generated {len(df)} samples.")
    print("Breach rate:", df["sla_breached"].mean())
    print(df.head())
