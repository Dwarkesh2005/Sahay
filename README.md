# Sahay — Community & Migrant Support Platform

Sahay is an end-to-end community support platform that connects **migrants in need**, **verified NGOs**, **volunteers**, and **administrators**.

---

## 🌟 End-to-End Workflow

```
USER / MIGRANT
  │
  ▼
1. Register & Login ──► Set location & contact preferences
  │
  ▼
2. Create Help Request ──► Choose Category (Medical, Food, Shelter, Employment, Guidance)
  │
  ▼
3. NGO Discovery ──► Search verified NGOs by service & city
  │
  ▼
4. NGO Receives Request ──► NGO views incoming feed in NGO Portal
  │
  ▼
5. NGO Accepts Request ──► Status updates to ACCEPTED, instant Chat channel opens
  │
  ▼
6. Direct Coordination ──► Migrant & NGO coordinate aid via secure real-time messaging
  │
  ▼
7. Resolution ──► NGO marks request as COMPLETED (Resolved)
  │
  ▼
8. Admin Oversight ──► Admin verifies NGOs, monitors platform analytics, and manages users
```

---

## 🏗️ Architecture & Technology Stack

- **Frontend**: React 19, TypeScript, Vite, TailwindCSS v4, Framer Motion, Lucide React, React Router DOM v7, React Hook Form, Zod, Axios.
- **Backend**: Node.js, Express 5, TypeScript, Prisma 7, PostgreSQL (`@prisma/adapter-pg`, `pg`).
- **Security**: JWT Authentication, bcrypt password hashing, Role-Based Access Control (RBAC), SQL injection protection via Prisma ORM, CORS configuration.

---

## 👥 Supported Roles & Portals

| Role | Portal / Route | Capabilities |
| :--- | :--- | :--- |
| **MIGRANT / USER** | `/dashboard`, `/request-help`, `/ngos` | Create assistance requests, browse NGOs, chat with helpers, track request status, update profile. |
| **NGO** | `/ngo-portal`, `/ngos` | View incoming & city requests, accept requests, mark requests as resolved, chat with requesters, manage NGO services and profile. |
| **VOLUNTEER** | `/dashboard`, `/request-help`, `/ngos` | Browse community requests in their city, offer assistance. |
| **ADMIN** | `/admin` | View platform-wide statistics, verify or reject NGOs, manage user accounts (activate/deactivate), oversee all help requests, resolve reports. |

---

## 📋 Pre-Seeded Test Credentials

| Role | Email | Password | Description |
| :--- | :--- | :--- | :--- |
| **Admin** | `admin@sahay.org` | `Admin@12345` | Platform Administrator |
| **NGO** | `asha@sahay.org` | `Ngo@12345` | Asha Foundation (Lucknow - Food/Shelter/Medical) |
| **NGO** | `hope@sahay.org` | `Ngo@12345` | Hope Foundation (Lucknow - Employment/Legal) |
| **NGO** | `sahara@sahay.org` | `Ngo@12345` | Sahara Health Trust (Patna - Medical/Guidance) |
| **Migrant User** | `rajesh@example.com` | `User@12345` | Rajesh Kumar (Lucknow) |
| **Migrant User** | `sunita@example.com` | `User@12345` | Sunita Devi (Patna) |

---

## 🔌 API Endpoints Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register` — Register a new User or NGO.
- `POST /api/auth/login` — Login and receive JWT token.
- `GET /api/auth/me` — Get current authenticated user profile.
- `PUT /api/auth/profile` — Update user contact & address details.

### NGO Discovery (`/api/ngos`)
- `GET /api/ngos` — Search & filter NGOs (by service, city, search keyword, verification status).
- `GET /api/ngos/:id` — Get single NGO profile with services and verification records.
- `PUT /api/ngos/my/profile` — (NGO only) Update own organization description & services.
- `POST /api/ngos/:id/report` — Report an NGO for admin review.

### Help Requests (`/api/requests`)
- `POST /api/requests` — Create a help request (`FOOD`, `SHELTER`, `MEDICAL`, `EMPLOYMENT`, `GUIDANCE`).
- `GET /api/requests?my=true` — Get user's own requests.
- `GET /api/requests` — (NGO/Volunteer) Get city requests feed.
- `GET /api/requests/:id` — Get request details and assigned responder.
- `POST /api/requests/:id/respond` — NGO/Volunteer accepts a pending request.
- `PATCH /api/requests/:id/status` — Update request status (`ACCEPTED`, `COMPLETED`, `CANCELLED`).

### Messaging & Chat (`/api/chats`)
- `GET /api/chats` — List user's active chats.
- `GET /api/chats/:chatId/messages` — Get message history for a chat.
- `POST /api/chats/:chatId/messages` — Send a message in a chat.

### Admin Console (`/api/admin`)
- `GET /api/admin/stats` — Platform metrics & distribution analytics.
- `GET /api/admin/ngos` — List all NGOs with verification details.
- `PATCH /api/admin/ngos/:id/verify` — Approve NGO verification (`GOVERNMENT_VERIFIED`).
- `PATCH /api/admin/ngos/:id/reject` — Reject NGO verification.
- `GET /api/admin/users` — List all users with role filter.
- `PATCH /api/admin/users/:id/status` — Toggle user active/inactive status.
- `GET /api/admin/requests` — View all platform requests.
- `GET /api/admin/reports` — View reports submitted against NGOs.
- `PATCH /api/admin/reports/:id` — Resolve a report.
- `GET /api/admin/verifications` — Document verification queue with search & filters.
- `GET /api/admin/verifications/:id` — Detailed verification review case with side-by-side comparison.
- `GET /api/admin/verifications/:id/document/:docId/view` — Generate temporary signed view URL for uploaded document.
- `POST /api/admin/verifications/:id/approve` — Approve NGO verification (grants verified badge).
- `POST /api/admin/verifications/:id/reject` — Reject verification (mandatory reason recorded in audit log).
- `POST /api/admin/verifications/:id/request-correction` — Request document correction from NGO.
- `POST /api/admin/verifications/:id/reprocess` — Re-trigger automated screening.

### NGO Verification (`/api/ngos/verification`)
- `GET /api/ngos/verification` — Get current NGO's verification status, score, fields, and issues.
- `POST /api/ngos/verification/documents` — Upload official verification document (PDF, PNG, JPG; max 10MB).
- `GET /api/ngos/verification/documents` — List active uploaded documents and versions.
- `DELETE /api/ngos/verification/documents/:id` — Remove an uploaded document.
- `POST /api/ngos/verification/process` — Trigger OCR extraction and automated information matching.
- `GET /api/ngos/verification/report` — Detailed consistency report.
- `GET /api/verification/document/download?token=...` — Secure, authenticated document preview with signed JWT token.

### Cities (`/api/cities`)
- `GET /api/cities` — Get list of supported cities.

---

## 🛡️ NGO Document Verification & Information Matching System

### Target Architecture
```
                 NGO
                  │
                  ▼
        Enter Organization Data
                  │
                  ▼
          Upload Documents (PDF/JPG/PNG)
                  │
                  ▼
          Secure File Storage (uploads/verification/)
                  │
                  ▼
       Python OCR Service (PaddleOCR)
                  │
                  ▼
        Structured Field Extraction
                  │
                  ▼
       Normalization Engine (Node.js)
                  │
                  ▼
       Matching Engine (Node.js + RapidFuzz)
                  │
        ┌─────────┼─────────┐
        ▼         ▼         ▼
      MATCH    MISMATCH   NOT FOUND
        │         │         │
        └─────────┼─────────┘
                  ▼
        Document Consistency Report
                  │
                  ▼
            ADMIN REVIEW
                  │
          ┌───────┼────────┐
          ▼       ▼        ▼
       APPROVE  CORRECT   REJECT
          │       │        │
          ▼       ▼        ▼
      VERIFIED   REUPLOAD  REJECTED
```

### Document Types Supported
- `REGISTRATION_CERTIFICATE` — Official registration deed or certificate.
- `PAN_DOCUMENT` — Permanent Account Number card/certificate.
- `TRUST_REGISTRATION` — Trust deed.
- `SOCIETY_REGISTRATION` — Society registration certificate.
- `SECTION_8_CERTIFICATE` — Section 8 company incorporation certificate.
- `TWELVE_A_CERTIFICATE` — 12A tax exemption certificate.
- `EIGHTY_G_CERTIFICATE` — 80G tax exemption certificate.
- `ADDRESS_PROOF` — Official electricity/utility/lease document.
- `AUTHORIZED_REPRESENTATIVE_PROOF` — Photo ID of director/trustee.
- `OTHER` — Supporting official affidavits.

### Field Weights & Document Consistency Score
| Field | Weight | Matching Strategy |
| :--- | :--- | :--- |
| **Registration Number** | 30% | Exact normalized comparison (case/punctuation normalized) |
| **PAN** | 25% | Exact alphanumeric match (strict uppercase, no fuzzy matching) |
| **Organization Name** | 20% | Normalized token similarity via RapidFuzz (>=90: MATCH, 70-89: PARTIAL) |
| **Address** | 10% | Token set overlap and road/location abbreviation normalization |
| **Email** | 5% | Normalized lowercase exact match |
| **Phone** | 5% | 10-digit normalized phone match |
| **Other** | 5% | Generic field comparison |

### Verification State Machine
```
NOT_SUBMITTED ──► DOCUMENTS_UPLOADED ──► PROCESSING ──► AUTO_REVIEW_READY ──► NEEDS_ADMIN_REVIEW
                                                                                    │
                                       ┌────────────────────────────────────────────┼──────────────────────────┐
                                       ▼                                            ▼                          ▼
                                    APPROVED                                 NEEDS_CORRECTION               REJECTED
                               (Verified Badge)                                     │
                                                                                    ▼
                                                                           DOCUMENTS_UPLOADED
                                                                             (Re-upload v2)
```

### Security & Privacy Enforcements
1. **Private Document Storage**: Files are stored in non-public directory `backend/uploads/verification/`.
2. **Access Control (RBAC)**: Only authorized Admins and the document-owning NGO can generate preview links.
3. **Signed Token Streaming**: Documents are accessed via temporary signed JWT tokens with 15-minute expiry.
4. **No Sensitive Document Logging**: OCR and server logs redact document text and only record metadata.
5. **Human Authority**: No AI or OCR model can grant `APPROVED` status directly; final verification is strictly reserved for authorized administrators.

---

## 🚀 Local Development Setup

### 1. Python OCR Service (`/ocr-service`)
```bash
cd ocr-service
# Create virtual environment (optional)
python -m venv venv
venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Start OCR microservice on port 5001
python app.py
```

### 2. Backend Setup (`/backend`)
```bash
cd backend
npm install

# Ensure database is in sync
npx prisma generate
npx prisma db push

# Run backend development server on port 5000
npm run dev
```

### 3. Frontend Setup (`/frontend`)
```bash
cd frontend
npm install

# Run Vite development server on port 5173
npm run dev
```

---

## 🧪 Testing & Verification

### Run Automated Unit & Workflow Tests
```bash
cd backend

# 1. Verification System Test Suite (Normalization, Matching, State Machine, DB Workflow)
npx ts-node src/__tests__/test_verification_system.ts

# 2. End-to-End API & Security Test Suite (RBAC, Uploads, Screening, Signed URLs, Admin Decision)
npx ts-node src/__tests__/test_e2e_verification_api.ts

# 3. Existing Sahay Platform Regression Suite
npx ts-node src/__tests__/test_workflow.ts
```

### Python OCR Service Tests
```bash
cd ocr-service
python -m unittest discover -s tests -p "test_*.py"
```

### Postman Collection
Import the collection located at:
```
postman/Sahay_E2E_Collection.postman_collection.json
```
Use the environment variables:
- `BASE_URL`: `http://localhost:5000/api`
- `OCR_SERVICE_URL`: `http://localhost:5001`
- `USER_TOKEN`, `NGO_TOKEN`, `ADMIN_TOKEN`
- `NGO_ID`, `VERIFICATION_ID`, `DOCUMENT_ID`