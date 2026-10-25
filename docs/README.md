# TrustVault - Secure Role-Based Document Vault
TrustVault is a role-based document management system built for the Snovasys Fresher Hiring Challenge 2026. It provides secure file storage, granular authorization controls, and real-time audit logging to prevent unauthorized access and data exposure.

## 1. Project Overview & Architecture
TrustVault operates on a client-server architecture separating frontend UI interactions from core authentication and file authorization logic.
* **Frontend:** Built with React and Vite, handling user login state, document uploading interfaces, file download actions, and audit log rendering. Deployed on **Vercel**.
* **Backend:** Built with FastAPI (Python), managing JWT authentication, role verification, database transactions, file storage, and audit logs. Deployed on **Render**.
* **Database:** SQLite managed via SQLAlchemy, storing user credentials, role definitions, file metadata, and tamper-evident audit logs

## 2. Key Features
1. **Role-Based Access Control (RBAC):**
   * **Owner / Admin:** Can view, upload, and manage secure documents.
   * **Viewer:** Can view authorized documents and access permitted files without upload privileges.
2. **Secure Document Uploads & Downloads:**
   * Files are assigned unique UUID file prefixes upon upload to prevent path traversal and file overwrite vulnerabilities.
   * File access and download endpoints require valid JWT authentication headers.
3. **Audit Logging & Activity Tracking:**
   * Automatically records user actions (uploads, downloads, permission denials) with user IDs and timestamps.
4. **Resilient Error Handling:**
   * String-based runtime role verification (`check_is_privileged`) prevents application crashes or standard unhandled HTTP 500 errors.

## 3. End-to-End Workflow
[ User Browser ]
│
├── 1. POST /api/auth/login ──> Returns JWT Access Token
│
├── 2. POST /api/documents/upload (With Authorization Header)
│        │
│        ├── FastAPI checks JWT token & calls check_is_privileged()
│        ├── Validates Owner/Admin role
│        ├── Saves file to storage with UUID name
│        └── Writes event entry to /api/audit-logs
│
└── 3. GET /api/documents / GET /api/audit-logs
└── Fetches documents list & security activity history

## 4. Local Installation & Setup
### Prerequisites
* Python 3.10+
* Node.js 18+

### Step 1: Clone Repository
git clone [https://github.com/vidya4329/TrustVault.git](https://github.com/vidya4329/TrustVault.git)
cd TrustVault

##Backend Setup
cd backend
python -m venv .venv
# Activate Virtual Environment:
.\.venv\Scripts\Activate
pip install -r requirements.txt
uvicorn app.main:app --reload
The API will run locally at http://127.0.0.1:8000

##Frontend Setup
cd ../frontend
npm install
npm run dev

5. Live Demo & Deployed Links
-Live Frontend Web App: https://trust-vault-kohl.vercel.app
-GitHub Repository: https://github.com/vidya4329/TrustVault
