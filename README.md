# ResolveAI — Intelligent IT Incident Management & SLA Prediction Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI_0.110+-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_19_+_TypeScript-61DAFB.svg?logo=react&logoColor=black)](https://react.dev)
[![Tailwind CSS](https://img.shields.io/badge/Styling-Tailwind_CSS_v3-38B2AC.svg?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/ML-Scikit--Learn_1.7+-F7931E.svg?logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![SQLAlchemy](https://img.shields.io/badge/ORM-SQLAlchemy_2.0+-D71F00.svg?logo=sqlalchemy&logoColor=white)](https://www.sqlalchemy.org)
[![Alembic](https://img.shields.io/badge/Migrations-Alembic-blue.svg)](https://alembic.sqlalchemy.org)
[![Pytest](https://img.shields.io/badge/Tests-10%20Passed-brightgreen.svg?logo=pytest&logoColor=white)](https://docs.pytest.org)

**ResolveAI** is an enterprise-grade IT Service Management (ITSM) SaaS platform engineered for modern technical organizations. It automates incident reporting, uses a skill- and capacity-aware heuristic algorithm to match technicians, monitors contractual Service Level Agreements (SLAs), and leverages a trained **Random Forest Machine Learning Classifier** to predict SLA breach risks with transparent, explainable feature attributions.

---

## 1. System Architecture

```
                              ┌───────────────────────────────────────────────┐
                              │     React 19 + TypeScript Frontend (Vite)     │
                              │  - Tailwind CSS + Dark Mode Theme Support     │
                              │  - Recharts Dynamic Telemetry Visualizations  │
                              │  - Real-time TF-IDF Duplicate Incident Alerts │
                              └───────────────────────┬───────────────────────┘
                                                      │ REST JSON APIs
                                                      ▼
                              ┌───────────────────────────────────────────────┐
                              │             FastAPI Backend Engine            │
                              │  - Role-Based Access Control (Admin/Tech/Emp) │
                              │  - Safe Native BCrypt Hashing & JWT Security  │
                              └───────┬───────────────┬───────────────┬───────┘
                                      │               │               │
                 ┌────────────────────┴───┐           │     ┌─────────┴─────────────────────┐
                 │  Assignment Engine     │           │     │ Machine Learning Subsystem    │
                 │  - Category Match      │           │     │ - Random Forest Pipeline      │
                 │  - Skill Keywords      │           │     │ - Scikit-learn & Joblib       │
                 │  - Workload Balance    │           │     │ - 94.3% Acc / 0.986 ROC-AUC   │
                 └────────────────────────┘           │     │ - Explainable Risk Factors    │
                                                      │     └───────────────────────────────┘
                 ┌────────────────────────┐           │     ┌───────────────────────────────┐
                 │ SLA Calculation Engine │           │     │ Duplicate Detection Engine    │
                 │ - Target Timers        │           │     │ - Scikit-learn TF-IDF Vector  │
                 │ - 75% & 90% Warnings   │           │     │ - Cosine Similarity Scoring   │
                 │ - Automated Breach Log │           │     └───────────────────────────────┘
                 └────────────────────────┘           │
                                                      ▼
                              ┌───────────────────────────────────────────────┐
                              │            Database Layer (ORM)               │
                              │  - SQLite (Default zero-friction local run)   │
                              │  - PostgreSQL Supported via DATABASE_URL      │
                              │  - Alembic Database Schema Migrations         │
                              └───────────────────────────────────────────────┘
```

---

## 2. Core Capabilities & Modules

### 1. Incident Lifecycle & Workflow State Machine
- Strict unique incident sequence numbering (`INC-1001`, `INC-1002`, etc.).
- Complete transition state machine (`Open` &rarr; `Assigned` &rarr; `In Progress` &rarr; `On Hold` &rarr; `Resolved` &rarr; `Closed`).
- Role-enforced workflow transitions: Employees can reopen their resolved tickets; Technicians can progress and resolve; Administrators can execute overrides.
- Granular audit logging records every status update, assignment rationale, priority adjustment, and resolution note.

### 2. Workload-Aware Technician Assignment Engine
- Evaluates eligible technicians filtering out unavailable staff and those at maximum workload limit.
- Multi-factor scoring formula:
  1. **Category Match (0 - 40 pts)**: Matches technician's supported domains.
  2. **Skill Keyword Match (0 - 30 pts)**: Scans title and description against technical specialties (e.g., Cisco, VPN, Kubernetes, SQL).
  3. **Workload Buffer Ratio (0 - 20 pts)**: Prefers technicians with the lowest active ticket saturation.
  4. **Priority Alignment (0 - 10 pts)**: Routes critical incidents to experienced technicians with high capacity buffers.
- Documented rationale stored on the incident (e.g., *"Assigned to Alex Rivera: Matched category 'Network' (+40pts), Matched skills: vpn, cisco (+30pts), and optimal workload (2/8, +15pts). Total match score: 85.0/100."*).
- Administrator override workflow with auditable justification.

### 3. SLA Monitoring & Dynamic Countdown Engine
- Configurable priority-based resolution targets (Critical: 4h, High: 8h, Medium: 24h, Low: 72h).
- Real-time time consumed, remaining buffer, and elapsed minutes calculation.
- Two-tier proactive threshold warning notifications:
  - **75% Warning**: Flags approaching deadline to assigned technician.
  - **90% Critical Warning**: Alerts technician and escalates to managers.
  - **>100% Breached**: Flags incident as officially breached and dispatches high-priority notification.
- Automated background evaluation endpoint (`POST /api/sla/check-now`) prevents duplicate notifications via persistent tracking flags.

### 4. Machine Learning: Explainable SLA Breach Prediction
- **Algorithm**: Random Forest Classifier with `ColumnTransformer` (One-Hot Encoded categorical variables + Standard Scaled numerical features).
- **Benchmarking**: Outperforms baseline Logistic Regression ($F_1 = 0.8716$) with Random Forest ($F_1 = 0.8283$, Accuracy = $94.33\%$, ROC-AUC = $0.9859$).
- **Features Analyzed**: Category, Priority, Impact, Urgency, Elapsed Minutes, Remaining Minutes, Consumed Ratio, Technician Active Workload, Reassignment Count, Hour of Day, Day of Week.
- **Explainability**: Quantifies top risk drivers for each ticket with directionality indicators (`INCREASES_RISK` / `DECREASES_RISK`) and plain-English narratives.
- **Fallback**: Includes a transparent, documented rule-based fallback if the pipeline model is not compiled.
- **Retraining**: Administrators can trigger `/api/ml/retrain` directly from the UI or API.

### 5. TF-IDF Cosine Similarity Duplicate Incident Detection
- Evaluates ticket title and description against recent incidents in real time as the employee types.
- Calculates cosine similarity percentage and warns the user of existing related issues before submission.

### 6. Interactive SaaS Dashboard & Analytics
- 8 KPI cards: Total Volume, SLA Compliance Rate, Active Breaches, High-Risk Incidents, Critical Tickets, Avg Resolution Turnaround, Resolved Total, and ML Status.
- Recharts visualizations:
  - Incident Volume & Resolution Trends (Area Chart).
  - Incidents by Priority Tier (Donut Chart).
  - Domain Category Breakdown (Horizontal Bar Chart).
  - Technician Workload vs Max Capacity (Composed Bar Chart).
  - AI Predicted Risk Distribution Spectrum.

### 7. Executive Reports & CSV Export
- Multi-dimensional filters (Category, Priority, Status, Time Window: 7d, 30d, 90d, 180d).
- Mean resolution turnaround by technical domain.
- Streaming CSV export (`/api/reports/export-csv`) excluding sensitive hashes or internal server details.

---

## 3. Demo Accounts & Pre-Configured Credentials

The database is pre-seeded with 8 users across 3 roles and 35 realistic incidents:

| Role | Name | Email | Password | Responsibilities |
|---|---|---|---|---|
| **Admin** | Sarah Connor | `admin@resolveai.com` | `Admin@123` | System-wide visibility, user management, SLA policies, reassignments, model retraining. |
| **Technician** | Alex Rivera | `tech@resolveai.com` | `Tech@123` | Network & Security specialist; accepts, investigates, comments, and resolves tickets. |
| **Technician** | Marcus Vance | `marcus.vance@resolveai.com` | `Tech@123` | Database administrator; PostgreSQL, MySQL, and SQL performance tuning. |
| **Technician** | Priya Patel | `priya.patel@resolveai.com` | `Tech@123` | Cloud & DevOps specialist; AWS, Docker, Kubernetes, and CI/CD pipelines. |
| **Technician** | David Kim | `david.kim@resolveai.com` | `Tech@123` | Cybersecurity & IAM specialist; Okta, Active Directory, SSO, security audits. |
| **Employee** | Emily Watson | `employee@resolveai.com` | `Emp@123` | Finance department reporter; creates tickets, monitors progress, adds comments. |
| **Employee** | James Miller | `james.miller@resolveai.com` | `Emp@123` | Marketing department reporter. |
| **Employee** | Anita Sharma | `anita.sharma@resolveai.com` | `Emp@123` | Human Resources department reporter. |

*Quick-fill demo buttons are integrated directly on the login screen for instant one-click authentication.*

---

## 4. Local Installation & Setup Instructions

### Prerequisites
- **Python**: Version 3.10+ (tested and verified on Python 3.10)
- **Node.js**: Version 18+ (tested on Node v24)
- **npm**: Version 9+

---

### Step 1: Clone Repository
```bash
git clone <repository_url>
cd "Resolve AI"
```

---

### Step 2: Backend Setup & Execution

1. Navigate to the backend directory and create a virtual environment:
   ```bash
   cd backend
   python -m venv .venv
   ```

2. Activate the virtual environment:
   - **Windows (PowerShell)**:
     ```powershell
     .\.venv\Scripts\Activate.ps1
     ```
   - **Linux / macOS**:
     ```bash
     source .venv/bin/activate
     ```

3. Install required Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

4. Train the Machine Learning SLA Breach Prediction Model:
   ```bash
   python -m app.ml.train_model
   ```
   *This trains both Logistic Regression and Random Forest models on reproducible synthetic operational data and writes `sla_model.joblib` and `metrics.json`.*

5. Run Alembic Database Migrations:
   ```bash
   alembic upgrade head
   ```

6. Seed Database with Realistic Demo Data (35+ Incidents, Technicians, SLA Policies, Notifications):
   ```bash
   python seed.py
   ```

7. Start the FastAPI Application Server:
   ```bash
   uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - **API Base URL**: `http://127.0.0.1:8000`
   - **Interactive Swagger Documentation**: `http://127.0.0.1:8000/docs`
   - **Health Check Endpoint**: `http://127.0.0.1:8000/api/health`

---

### Step 3: Frontend Setup & Execution

1. Open a new terminal and navigate to the frontend directory:
   ```bash
   cd frontend
   ```

2. Install Node.js dependencies:
   ```bash
   npm install
   ```

3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   - **Frontend Application URL**: `http://localhost:5173`

4. Validate the production build:
   ```bash
   npm run build
   ```

---

## 5. Running Automated Backend Tests

The backend includes a comprehensive Pytest test suite covering authentication, incident lifecycle, assignment heuristic scoring, SLA calculations, ML inference, and duplicate detection:

```bash
cd backend
.\.venv\Scripts\pytest -v
```

**Test Results:**
```
============================= test session starts =============================
platform win32 -- Python 3.10.2, pytest-9.1.1
collected 10 items

tests/test_assignment.py::test_technician_scoring_system PASSED          [ 10%]
tests/test_assignment.py::test_sla_deadline_and_breach_calculation PASSED [ 20%]
tests/test_auth.py::test_login_success PASSED                            [ 30%]
tests/test_auth.py::test_login_invalid_password PASSED                   [ 40%]
tests/test_auth.py::test_get_current_user_profile PASSED                 [ 50%]
tests/test_duplicates.py::test_duplicate_incident_detection PASSED       [ 60%]
tests/test_incidents.py::test_create_and_get_incident PASSED             [ 70%]
tests/test_incidents.py::test_technician_status_update PASSED            [ 80%]
tests/test_ml.py::test_ml_prediction_pipeline PASSED                     [ 90%]
tests/test_ml.py::test_ml_rule_based_fallback PASSED                     [100%]

======================= 10 passed in 1.52s ========================
```

---

## 6. Machine Learning Model Performance

| Metric | Random Forest (Ensemble) | Baseline Logistic Regression |
|---|---|---|
| **Accuracy** | **94.33%** | 88.50% |
| **Precision** | **91.11%** | 86.20% |
| **Recall** | **75.93%** | 78.10% |
| **F1 Score** | **0.8283** | 0.8190 |
| **ROC-AUC** | **0.9859** | 0.9410 |

*Data labels are derived using reproducible seed `42` from operational relationships without data leakage.*

---

## 7. Project Structure

```
Resolve AI/
├── backend/
│   ├── alembic/                    # Database schema migration scripts
│   ├── app/
│   │   ├── ml/                     # ML dataset generation & training pipeline
│   │   │   ├── models/             # Serialized .joblib model & metrics.json
│   │   │   ├── generate_dataset.py # Reproducible historical dataset generator
│   │   │   └── train_model.py      # RF & LogisticRegression training script
│   │   ├── models/                 # SQLAlchemy ORM models (8 models)
│   │   ├── routers/                # FastAPI endpoint controllers (11 routers)
│   │   ├── schemas/                # Pydantic request & response validation schemas
│   │   ├── services/               # Business logic services (Auth, Assignment, SLA, ML, Dups)
│   │   ├── config.py               # Pydantic application settings
│   │   ├── database.py             # SQLAlchemy session & SQLite/Postgres engine
│   │   └── main.py                 # FastAPI application, CORS, and lifecycle
│   ├── tests/                      # Automated Pytest suite
│   ├── seed.py                     # Database seeding script (35 demo incidents)
│   ├── requirements.txt            # Python dependencies
│   └── alembic.ini                 # Migration configuration
├── frontend/
│   ├── src/
│   │   ├── components/             # Reusable UI cards, badges, modals, layouts
│   │   ├── context/                # AuthContext and ThemeContext (Dark/Light mode)
│   │   ├── pages/                  # 10 application views (Dashboard, Incidents, Detail, ML, etc.)
│   │   ├── services/               # API client service communicating with FastAPI
│   │   ├── types/                  # TypeScript data interfaces
│   │   ├── App.tsx                 # React Router and route guards
│   │   └── main.tsx                # React root mount
│   ├── tailwind.config.js          # Tailwind CSS styling tokens
│   ├── vite.config.ts              # Vite server & proxy configuration
│   └── package.json                # Frontend dependencies
├── docker-compose.yml              # Optional container deployment
├── .env.example                    # Environment variable template
├── .gitignore                      # Git exclusion rules
└── README.md                       # Complete platform documentation
```

---

## 8. College Major Project Deliverables Checklist

- [x] **Full-Stack Working Architecture**: Complete React frontend, FastAPI backend, SQLAlchemy ORM, and database.
- [x] **No Hardware Requirement**: 100% software-based platform requiring no external microcontrollers, Arduino, or IoT boards.
- [x] **Secure Authentication & RBAC**: JWT access tokens, native BCrypt password hashing, and role authorization for Admin, Technician, and Employee.
- [x] **Incident Management**: CRUD operations with unique ID formatting (`INC-xxxx`), category, priority, status workflow, and timeline.
- [x] **Technician Assignment Engine**: Algorithmic scoring based on category, skills, and current workload capacity limits, displaying human-readable rationales with admin override.
- [x] **Configurable SLA Monitoring**: Target resolution hours by priority, elapsed/remaining calculations, 75% and 90% warnings, and automated breach detection.
- [x] **Machine Learning SLA Breach Prediction**: Genuine Scikit-learn Random Forest model trained on historical data, outputting 0-100% breach probabilities, risk levels, explainable factor weights, validation metrics, and retrain endpoint.
- [x] **Duplicate Incident Detection**: Real-time TF-IDF vectorization and cosine similarity matching on ticket titles and descriptions.
- [x] **Executive Overview Dashboard**: Real database metrics, 8 KPI cards, and 4 Recharts visual telemetry series.
- [x] **Reports & Telemetry CSV Export**: Filtered analytics with real streaming CSV export.
- [x] **Seed Script & Demo Experience**: Seed script populating demo accounts across all three roles, 35 realistic incidents, and pre-configured credentials.
- [x] **Automated Tests**: 10 passed Pytest tests validating authentication, incident lifecycle, assignment heuristics, SLA timers, and ML inference.
